# Pawble — Architecture (Target State + Migration Plan)

> Status: **proposal**. This document describes the **target architecture** for Pawble and the **migration plan** to move there from the current codebase. It is not yet implemented.

---

## 1. Goals & Principles

The current codebase mixes routing, persistence, and business logic in a handful of controller files, and the frontend is a single 994-line `app.js` with global mutable state and direct DOM manipulation. The target architecture is driven by these goals:

1. **Separation of concerns** — each layer has exactly one reason to change.
2. **Testability** — business rules must be unit-testable without booting Express or hitting MySQL.
3. **Predictable data flow** — request → validation → controller → service → repository → DB, with no shortcuts.
4. **Small, replaceable parts** — swapping the DB driver, the auth scheme, or the HTTP framework should not cascade through the codebase.
5. **Same backend stack** — Node.js + Express + MySQL stay. Patterns change, not packages.
6. **Modern frontend, plain JavaScript** — React + Vite + Tailwind, but `.jsx` (no TypeScript).

Non-goals: rewriting in another language, adopting a new database, adding a microservice boundary.

---

## 2. High-Level Topology

```
┌──────────────────────────┐         ┌────────────────────────────────┐
│   Browser (React SPA)    │  HTTPS  │   Express API (Node 20+)       │
│                          │ ───────►│                                │
│  Vite dev / static build │ ◄───────│  Routes → Middlewares →        │
│  Tailwind CSS            │   JSON  │  Controllers → Services →      │
│  React Router            │         │  Repositories → MySQL          │
│  Fetch wrapper + Context │         │                                │
└──────────────────────────┘         └────────────────────────────────┘
                                                │
                                                ▼
                                     ┌────────────────────────┐
                                     │  MySQL 8 (mysql2 pool) │
                                     │  + /uploads (disk)     │
                                     └────────────────────────┘
```

Two deployables: the SPA (static bundle) and the API (Node process). The API serves `/uploads` for media; in production this should sit behind a reverse proxy (nginx, Caddy) or move to object storage — see §7.

---

## 3. Backend — Target Architecture

### 3.1 Folder structure

```
pawble-backend/
├── src/
│   ├── config/
│   │   ├── env.js                 # Loads + validates process.env on boot
│   │   └── db.js                  # mysql2 promise pool (single export)
│   ├── routes/
│   │   ├── index.js               # Mounts feature routers under /api
│   │   ├── authRoutes.js
│   │   ├── petRoutes.js
│   │   ├── matchRoutes.js
│   │   ├── chatRoutes.js
│   │   └── adminRoutes.js
│   ├── controllers/               # HTTP adapter only — no SQL, no business rules
│   │   ├── authController.js
│   │   ├── petController.js
│   │   ├── matchController.js
│   │   ├── chatController.js
│   │   └── adminController.js
│   ├── services/                  # Business logic, orchestrates repositories
│   │   ├── authService.js
│   │   ├── petService.js
│   │   ├── matchService.js
│   │   ├── chatService.js
│   │   └── adminService.js
│   ├── repositories/              # SQL lives here, returns plain objects
│   │   ├── userRepository.js
│   │   ├── petRepository.js
│   │   ├── likeRepository.js
│   │   ├── messageRepository.js
│   │   └── metadataRepository.js
│   ├── models/                    # Domain shapes + mappers (row → entity)
│   │   ├── User.js
│   │   ├── Pet.js
│   │   ├── Like.js
│   │   └── Message.js
│   ├── middlewares/
│   │   ├── authMiddleware.js      # JWT verification, attaches req.user
│   │   ├── adminMiddleware.js     # Requires req.user.isAdmin
│   │   ├── errorMiddleware.js     # Central error handler
│   │   ├── validate.js            # Runs a validator schema against req
│   │   ├── uploadMiddleware.js    # Multer config, exported as factories
│   │   └── requestLogger.js
│   ├── validators/                # Schemas per route (Joi or Zod)
│   │   ├── authValidators.js
│   │   ├── petValidators.js
│   │   └── chatValidators.js
│   ├── utils/
│   │   ├── AppError.js            # Typed error with statusCode + code
│   │   ├── asyncHandler.js        # Wraps async controllers, forwards errors
│   │   ├── password.js            # bcrypt hash/compare
│   │   └── token.js               # JWT sign/verify
│   └── app.js                     # Express assembly, no listen()
├── public/uploads/                # Disk-served media (gitignored)
├── tests/                         # Jest or Vitest
├── server.js                      # Boots app.js, listens on PORT
├── .env.example
└── package.json
```

### 3.2 Layer responsibilities

| Layer            | Knows about                           | Never touches             |
|------------------|---------------------------------------|---------------------------|
| **Route**        | Express, path, HTTP verb              | SQL, bcrypt, business rules |
| **Middleware**   | `req` / `res` / `next`, cross-cutting | Domain logic              |
| **Controller**   | `req` shape, services, HTTP responses | SQL, mysql2, JWT internals |
| **Service**      | Domain rules, multiple repositories   | `req`/`res`, SQL strings  |
| **Repository**   | SQL, mysql2 pool, row mapping         | HTTP, business rules      |
| **Model**        | Shape of a domain entity              | I/O of any kind           |

The cardinal rule: **only controllers see `req`/`res`, only repositories see SQL.** Services accept primitives/DTOs and return primitives/DTOs.

### 3.3 Request flow (example: `POST /api/pets`)

```
HTTP POST /api/pets
   │
   ▼
[ petRoutes ]            router.post('/pets', auth, upload, validate(addPet), ctrl.addPet)
   │
   ▼
[ authMiddleware ]       verifies JWT, sets req.user
   │
   ▼
[ uploadMiddleware ]     multer parses image + video into req.files
   │
   ▼
[ validate(schema) ]     rejects 422 if body invalid
   │
   ▼
[ petController.addPet ] reads req.user, req.body, req.files
                         calls petService.createPet({ ownerId, data, files })
                         responds 201 { id, ... }
   │
   ▼
[ petService.createPet ] validates ownership constraints, file paths,
                         calls petRepository.insert(petEntity)
   │
   ▼
[ petRepository.insert ] runs INSERT, returns the new id
   │
   ▼
[ MySQL ]                pool.execute(sql, params)
```

Any failure throws an `AppError`; `asyncHandler` forwards it to `errorMiddleware`, which formats a JSON response.

### 3.4 Database access — promise pool

Replace the callback-style single connection with a pool:

```js
// src/config/db.js
import mysql from 'mysql2/promise';
import env from './env.js';

const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export default pool;
```

All repository methods use `await pool.execute(...)`. No `db.query(..., callback)` anywhere.

### 3.5 Repository pattern (example)

```js
// src/repositories/petRepository.js
import pool from '../config/db.js';
import { rowToPet } from '../models/Pet.js';

export const petRepository = {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM pets WHERE id = ?', [id]);
    return rows[0] ? rowToPet(rows[0]) : null;
  },
  async findByOwner(userId) { /* ... */ },
  async insert(pet)         { /* returns insertId */ },
  async update(id, patch)   { /* ... */ },
  async deleteById(id)      { /* ... */ },
};
```

Repositories return **domain objects** (or `null`), never raw rows or Express responses.

### 3.6 Service pattern (example)

```js
// src/services/matchService.js
import { likeRepository } from '../repositories/likeRepository.js';
import { AppError } from '../utils/AppError.js';

export const matchService = {
  async recordSwipe({ likerPetId, likedPetId, action }) {
    if (likerPetId === likedPetId) {
      throw new AppError('Cannot swipe on your own pet', 400, 'SELF_SWIPE');
    }
    const status = action === 'left' ? 'rejected'
                 : action === 'super' ? 'super' : 'pending';

    await likeRepository.insert({ likerPetId, likedPetId, status });
    if (status === 'rejected') return { match: false };

    const reciprocal = await likeRepository.findActiveBetween(likedPetId, likerPetId);
    if (!reciprocal) return { match: false, isSuper: status === 'super' };

    await likeRepository.markMatched(likerPetId, likedPetId);
    return { match: true, isSuper: status === 'super' };
  },
};
```

Services are pure with respect to HTTP. They can be unit-tested by stubbing repositories.

### 3.7 Controllers (thin)

```js
// src/controllers/matchController.js
import { matchService } from '../services/matchService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const matchController = {
  swipe: asyncHandler(async (req, res) => {
    const result = await matchService.recordSwipe({
      likerPetId: req.body.likerId,
      likedPetId: req.body.likedId,
      action: req.body.action,
    });
    res.json(result);
  }),
};
```

No SQL. No business branching. Just translate HTTP ↔ service.

### 3.8 Middlewares

- **`authMiddleware`** — reads `Authorization: Bearer <jwt>`, verifies, sets `req.user = { id, isAdmin, isShelter }`. Rejects 401 otherwise.
- **`adminMiddleware`** — requires `req.user.isAdmin`, else 403.
- **`validate(schema)`** — runs a Joi/Zod schema over `{ body, params, query }`. On failure, 422 with field-level errors.
- **`uploadMiddleware`** — factory returning configured multer for image-only, video-only, or mixed uploads.
- **`errorMiddleware`** — last middleware. Maps `AppError` → its status code, unknown errors → 500. Always JSON `{ error: { code, message } }`.
- **`requestLogger`** — method, path, status, duration. Pino in production.

### 3.9 Validators

One schema file per feature. Example:

```js
// src/validators/petValidators.js
import Joi from 'joi';

export const addPet = {
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    speciesId: Joi.number().integer().positive().required(),
    breedId: Joi.number().integer().positive().required(),
    gender: Joi.string().valid('erkek', 'disi').required(),
    age: Joi.number().integer().min(0).max(40).required(),
    vaccinated: Joi.boolean(),
    description: Joi.string().max(1000).allow(''),
    goal: Joi.string().valid('mating', 'adoption').required(),
  }),
};
```

### 3.10 Authentication — JWT (new)

The current API authenticates per request by trusting `userId` in the body. That is unauthenticated; anyone can act as anyone. The target architecture introduces JWT:

- `POST /api/auth/login` returns `{ token, user }`.
- All non-public routes require `Authorization: Bearer <token>`.
- `req.user.id` replaces every `req.body.userId` / `req.params.userId` self-reference.
- Admin routes additionally require `req.user.isAdmin`.

Token lifetime: 7d access, no refresh flow in v1 (out of scope).

### 3.11 Error handling

Single shape, always:

```json
{ "error": { "code": "PET_NOT_FOUND", "message": "Pet not found", "details": {} } }
```

Controllers never `try/catch` for the happy path; `asyncHandler` forwards to `errorMiddleware`. Business errors throw `AppError`. Database errors are caught in the error middleware and logged with the stack but never leaked to clients.

### 3.12 Configuration

`src/config/env.js` loads `.env` once and **validates** required vars at boot. Missing `DB_PASSWORD` or `JWT_SECRET` should crash the process immediately, not surface as a 500 on the first request.

---

## 4. Frontend — Target Architecture

### 4.1 Stack

- **React 18** with function components + hooks
- **Vite** for dev server / build
- **Tailwind CSS** via PostCSS plugin (not CDN)
- **React Router** for screens
- **Plain JavaScript (`.jsx`)** — no TypeScript
- **No Redux** — feature-scoped Context + custom hooks; reach for Zustand only if state actually outgrows that

### 4.2 Pattern: Container / Presentational + Hooks (MVVM-flavored)

| Concept                | React mapping                                       |
|------------------------|-----------------------------------------------------|
| **Model**              | API service functions + domain shapes in `/models`  |
| **View**               | Presentational components in `/components`          |
| **ViewModel**          | Custom hooks (`useCandidates`, `useChat`, `useAuth`)|
| **Controller (UI)**    | Container components / route pages                  |

The hook owns the state and the API calls for a feature. The component renders what the hook returns. This is the React equivalent of MVC's "controllers don't know SQL" rule: components don't know `fetch`.

### 4.3 Folder structure

```
pawble-frontend/
├── public/
│   ├── logo.png
│   └── loading.gif
├── src/
│   ├── api/
│   │   ├── client.js              # Fetch wrapper: base URL, auth header, error mapping
│   │   ├── authApi.js
│   │   ├── petApi.js
│   │   ├── matchApi.js
│   │   ├── chatApi.js
│   │   └── adminApi.js
│   ├── models/                    # Plain JS factories / shape helpers
│   │   ├── pet.js
│   │   └── user.js
│   ├── context/
│   │   ├── AuthContext.jsx        # currentUser, token, login, logout
│   │   └── ThemeContext.jsx       # dark mode
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useCandidates.js
│   │   ├── useSwipe.js
│   │   ├── useChat.js             # polling loop encapsulated here
│   │   └── usePetForm.js
│   ├── components/                # Stateless presentational
│   │   ├── ui/                    # Button, Input, Modal, Avatar, Spinner
│   │   ├── pet/                   # PetCard, PetForm, PetStats
│   │   ├── swipe/                 # SwipeDeck, SwipeActions
│   │   ├── chat/                  # ConversationList, MessageBubble, ChatInput
│   │   └── layout/                # Header, BottomNav, Preloader
│   ├── pages/                     # Route-level containers
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ModeSelectPage.jsx
│   │   ├── HomePage.jsx           # swipe or adoption feed
│   │   ├── FavoritesPage.jsx
│   │   ├── MatchesPage.jsx
│   │   ├── ConversationPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── PetFormPage.jsx
│   │   └── AdminPage.jsx
│   ├── routes/
│   │   └── AppRouter.jsx          # React Router definitions, guarded routes
│   ├── styles/
│   │   ├── index.css              # Tailwind directives + globals
│   │   └── tailwind.config.js
│   ├── utils/
│   │   ├── mediaUrl.js            # fixMediaUrl equivalent
│   │   └── placeholders.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### 4.4 API client

A single fetch wrapper attaches the JWT, parses JSON, and throws on non-2xx. Feature `api/*.js` modules call it.

```js
// src/api/client.js
const BASE = import.meta.env.VITE_API_URL;

export async function request(path, { method = 'GET', body, isForm } = {}) {
  const token = localStorage.getItem('pawble_token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}
```

Components never call `fetch`. Hooks call API modules. API modules call `request`.

### 4.5 State management

- **AuthContext** — current user + token. Provided at the root; consumed by `useAuth`.
- **Per-feature hooks** own their own state. `useCandidates` owns the swipe deck; `useChat` owns the polling loop.
- Cross-cutting UI state (theme, toasts) lives in small contexts.
- No global store unless a third feature needs to read the same state — then promote to context, not before.

### 4.6 Routing

React Router with a `<ProtectedRoute>` wrapper that redirects to `/login` if no token. Mode selection happens after login. Routes mirror the current screens 1:1 so the migration stays incremental.

### 4.7 Styling

- Tailwind via PostCSS (proper build, not the CDN script).
- The current `theme.js` toggles a class on `<html>` — re-implement as a `ThemeContext` writing to `localStorage` and toggling Tailwind's `dark` class.
- Custom CSS that can't be expressed in Tailwind lives in `styles/index.css` under `@layer components`.

### 4.8 Build & dev

- `npm run dev` → Vite dev server on `:5173`, proxies `/api` to `:3000`.
- `npm run build` → static bundle in `dist/`, served by any static host or the API behind the same domain.
- `VITE_API_URL` per environment.

---

## 5. Data Model (current, unchanged)

```
users         (id, name, surname, email, password, location, is_shelter, is_admin)
pets          (id, user_id → users.id, username, species_id → species.id,
               breed_id → breeds.id, gender, age, vaccinated, description,
               image_path, video_path, goal: 'mating' | 'adoption')
species       (id, name)
breeds        (id, species_id → species.id, name)
likes         (liker_pet_id → pets.id, liked_pet_id → pets.id,
               status: 'pending' | 'super' | 'matched' | 'rejected')
messages      (id, sender_id → users.id, receiver_id → users.id, content, sent_at)
```

The model layer wraps these as `User`, `Pet`, `Like`, `Message` entities with row-mapper functions (`rowToPet`, etc.). No ORM — the queries are simple enough that mysql2 + mappers is clearer.

---

## 6. API Surface (target)

Stable paths, JWT-protected unless marked public:

| Method | Path                              | Purpose                             | Public |
|--------|-----------------------------------|-------------------------------------|--------|
| POST   | `/api/auth/register`              | Create user                         | ✓      |
| POST   | `/api/auth/login`                 | Returns `{ token, user }`           | ✓      |
| GET    | `/api/auth/me`                    | Current user from token             |        |
| PUT    | `/api/users/me`                   | Update own profile                  |        |
| GET    | `/api/metadata`                   | Species + breeds                    | ✓      |
| GET    | `/api/pets/mine`                  | Caller's pets                       |        |
| POST   | `/api/pets`                       | Create pet (multipart)              |        |
| PUT    | `/api/pets/:petId`                | Update pet (owner only)             |        |
| DELETE | `/api/pets/:petId`                | Delete pet (owner only)             |        |
| GET    | `/api/candidates`                 | Swipe deck                          |        |
| POST   | `/api/swipes`                     | Record swipe (replaces `/like`)     |        |
| GET    | `/api/pets/:petId/stats`          | Like/super/dislike counts           |        |
| GET    | `/api/history`                    | Past interactions                   |        |
| POST   | `/api/adoptions`                  | Adopt a pet                         |        |
| GET    | `/api/conversations`              | Caller's conversations              |        |
| GET    | `/api/conversations/:otherId`     | Messages with another user          |        |
| POST   | `/api/messages`                   | Send message                        |        |
| GET    | `/api/admin/users`                | List users (admin)                  |        |
| PUT    | `/api/admin/users/:id/shelter`    | Toggle shelter flag (admin)         |        |

The shift from `/api/users/:userId` to `/api/users/me` removes a class of authorization bugs — you can no longer act on someone else by guessing an ID.

---

## 7. Cross-Cutting Concerns

- **Uploads.** Multer writes to `public/uploads/`. The DB stores **relative paths** (`/uploads/pet-123.jpg`), not absolute URLs with `http://localhost:3000` baked in. The frontend prepends the API origin at render time. This kills the `fixMediaUrl` hack.
- **Secrets.** `JWT_SECRET`, `DB_PASSWORD` validated at boot.
- **CORS.** Origin allowlist from env in production; permissive in dev.
- **Logging.** Pino with request IDs in production. `console.log` only in `server.js` boot output.
- **Security.** bcrypt cost ≥ 10, JWT in `Authorization` header (not cookies for now), parameterized SQL everywhere (already true), file type and size limits enforced in multer.
- **Chat real-time.** The current frontend polls. Keep polling in v1; document Socket.IO as a v2 upgrade path — both endpoints in `chatRoutes` would stay valid.

---

## 8. Migration Plan

Each phase ends with a working app. Don't start a phase before the previous one is merged.

### Phase 0 — Hygiene (≤ 1 day)

Bugs to fix before anything structural:
- `pawble-backend/routes/authRoutes.js` — duplicate `module.exports` and duplicate `PUT /users/:userId` route. Keep one.
- `pawble-backend/controllers/authController.js` — `updateUser` is defined twice (lines 41–56 and 57–72). Delete one.
- Remove `mysql` from `package.json` — only `mysql2` is used.

### Phase 1 — Backend layering, no behavior change (2–3 days)

1. Create `src/` layout per §3.1 (empty files / stubs).
2. Convert `config/db.js` to the **promise pool** (§3.4). Update every controller call site to `await`.
3. Extract SQL from `petController.js`, `authController.js`, `chatController.js` into `*Repository.js`. Controllers now `await repository.x(...)`.
4. Extract orchestration (e.g., the like → check reciprocal → mark matched flow) into `*Service.js`. Controllers shrink to ~5 lines each.
5. Add `errorMiddleware`, `asyncHandler`, `AppError`. Replace every `try/catch` in controllers.
6. Add `validate` middleware + Joi schemas for the existing endpoints. No new endpoints yet.
7. Routes are reorganized into feature routers; mount paths stay identical so the frontend keeps working.

**Exit criteria:** existing frontend works untouched against the refactored backend.

### Phase 2 — JWT auth (1–2 days)

1. Add `utils/token.js`, `authMiddleware`, `adminMiddleware`.
2. `POST /api/auth/login` now returns `{ token, user }`.
3. Add `GET /api/auth/me`.
4. Protect all non-public routes. Replace `req.body.userId` / `req.params.userId` with `req.user.id` where it represents the caller.
5. Update the **current** frontend (still vanilla) to store the token in `localStorage` and send `Authorization` on every request. This is a small, focused change so the SPA migration in Phase 3 starts from a JWT-aware backend.

**Exit criteria:** every request to a protected route requires a valid token; admin routes require admin claim.

### Phase 3 — Frontend rebuild on React + Vite (incremental, ~1–2 weeks)

Stand up the new SPA in parallel; cut over screen by screen.

1. Scaffold `pawble-frontend-v2/` with Vite + React + Tailwind via PostCSS. Keep the old `pawble-frontend/` running.
2. Implement `api/client.js`, `AuthContext`, `LoginPage`, `RegisterPage`, `ProtectedRoute`. Verify end-to-end login against the JWT backend.
3. Port screens in this order (each is a self-contained PR):
   1. Login / Register
   2. Mode select + Home (swipe deck)
   3. Adoption feed
   4. Profile + Pet CRUD
   5. Favorites / History
   6. Matches list + Conversation view
   7. Admin panel
4. After all screens are ported, delete `pawble-frontend/`. Rename `pawble-frontend-v2/` → `pawble-frontend/`. Update README.

**Exit criteria:** `npm run build` in `pawble-frontend/` produces a working SPA; the old vanilla files are gone.

### Phase 4 — Polish (post-cutover)

- Replace chat polling with Socket.IO (optional).
- Move `/uploads` behind nginx or to S3-compatible storage.
- Add Jest/Vitest suites for `services/*` and `hooks/*`.
- Add a GitHub Actions workflow: lint + tests + build on PR.

---

## 9. Risks & Open Questions

- **Token storage in `localStorage`** is vulnerable to XSS. Acceptable for v1 given a trusted dev environment; revisit with httpOnly cookies + CSRF tokens if the app goes public.
- **Polling chat** is fine for low traffic but won't scale past a few hundred concurrent users. Socket.IO migration is a one-day job; do it before public launch.
- **`/uploads` served from the Node process** mixes static asset serving into the API. Fine for dev. In production, put nginx in front or use S3.
- **No DB migrations tooling.** Schema is documented but not versioned. Consider `knex` or `node-pg-migrate`-equivalent (`db-migrate-mysql`) when the schema starts changing.
- **No tests yet.** The refactor is the right time to introduce them; targeting `services/` first gives the most value per line of test code.

---

## 10. Glossary

- **Controller (backend)** — Express handler. HTTP I/O only.
- **Service** — business logic, no HTTP, no SQL.
- **Repository** — SQL + row mapping. Returns domain objects.
- **Model** — shape of a domain entity; no behavior beyond construction/mapping.
- **Container (frontend)** — a page/route component that wires hooks to presentational components.
- **Hook (frontend)** — encapsulates state + side effects for a feature; the frontend analogue of a service.
