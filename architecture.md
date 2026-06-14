# Pawble — Architecture (Target State + Migration Plan)

> Status: **Phases 1–3 implemented** on branch `v2` (commits `7e12227` backend, `59b7cb5` frontend). **Phase 4 — real-time messaging via WebSocket — implemented** on branch `v3-websocket`. Message delivery and typing indicators run over Socket.IO; the 4 s HTTP-polling loop has been removed from the frontend. `POST /api/messages` remains as a deprecated fallback (§6). `presence:peer` and `message:read`/`message:read:ack` from the original event table (§3.13/§6.1) were not part of this pass — see Phase 4 notes below.

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
┌──────────────────────────┐   HTTPS / JSON    ┌────────────────────────────────┐
│   Browser (React SPA)    │ ────────────────► │   Express API (Node 20+)       │
│                          │ ◄──────────────── │                                │
│  Vite dev / static build │     WebSocket     │  Routes → Middlewares →        │
│  Tailwind CSS            │ ◄═══════════════► │  Controllers → Services →      │
│  React Router            │     (Socket.IO)   │  Repositories → MySQL          │
│  Fetch wrapper + Context │                   │  Realtime Gateway → Services   │
│  Socket.IO client        │                   │                                │
└──────────────────────────┘                   └────────────────────────────────┘
                                                          │
                                                          ▼
                                               ┌────────────────────────┐
                                               │  MySQL 8 (mysql2 pool) │
                                               │  + /uploads (disk)     │
                                               └────────────────────────┘
```

Two deployables: the SPA (static bundle) and the API (Node process). The same Node process serves the HTTP API **and** the WebSocket endpoint — both share the underlying `http.Server`. The API serves `/uploads` for media; in production this should sit behind a reverse proxy (nginx, Caddy — both must allow `Upgrade: websocket`) or move to object storage. See §7.

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
│   ├── realtime/                  # WebSocket layer (Socket.IO)
│   │   ├── index.js               # Attaches Socket.IO to the HTTP server
│   │   ├── socketAuth.js          # JWT verification on handshake
│   │   └── chatGateway.js         # Chat event handlers (the WS analogue of a controller)
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

| Layer                 | Knows about                                            | Never touches             |
|-----------------------|--------------------------------------------------------|---------------------------|
| **Route**             | Express, path, HTTP verb                               | SQL, bcrypt, business rules |
| **Middleware**        | `req` / `res` / `next`, cross-cutting                  | Domain logic              |
| **Controller**        | `req` shape, services, HTTP responses                  | SQL, mysql2, JWT internals |
| **Realtime Gateway**  | Socket.IO event shape, services, emits events back     | SQL, HTTP req/res, JWT internals |
| **Service**           | Domain rules, multiple repositories                    | `req`/`res`, sockets, SQL strings |
| **Repository**        | SQL, mysql2 pool, row mapping                          | HTTP, sockets, business rules |
| **Model**             | Shape of a domain entity                               | I/O of any kind           |

The cardinal rule: **only controllers and gateways see I/O (HTTP / sockets), only repositories see SQL.** Services accept primitives/DTOs and return primitives/DTOs, agnostic to whether the call came from a REST endpoint or a WebSocket event.

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

The same JWT authenticates the **WebSocket handshake** (§3.13). The client passes the token in the Socket.IO `auth` payload; a connection-level middleware verifies it once and attaches the user identity to the socket. After connection, every event is implicitly trusted as that user — no per-event auth required.

### 3.11 Error handling

Single shape, always:

```json
{ "error": { "code": "PET_NOT_FOUND", "message": "Pet not found", "details": {} } }
```

Controllers never `try/catch` for the happy path; `asyncHandler` forwards to `errorMiddleware`. Business errors throw `AppError`. Database errors are caught in the error middleware and logged with the stack but never leaked to clients.

### 3.12 Configuration

`src/config/env.js` loads `.env` once and **validates** required vars at boot. Missing `DB_PASSWORD` or `JWT_SECRET` should crash the process immediately, not surface as a 500 on the first request.

### 3.13 Real-time messaging — WebSocket

Chat runs over a WebSocket connection (Socket.IO). The HTTP-polling endpoints (`GET /api/conversations/:otherId/messages`) remain for **initial load and history scroll-back**, but new messages, typing indicators, and read receipts flow over the socket.

**Why Socket.IO, not raw `ws`:** auto-reconnect on flaky mobile networks, rooms for per-conversation channels, an event API instead of hand-rolling JSON framing, and a JWT auth middleware that runs once per connection. Trade-off: ~15 KB gzipped on the client and a small abstraction over native WebSocket. If we ever need a leaner footprint, the protocol can be reimplemented on native `ws` without changing the service layer — only `src/realtime/` and the frontend client wrapper move.

**Lifecycle:**

```
Client                              Server
  │  connect (auth: { token })       │
  │ ─────────────────────────────►   │
  │                                  │  socketAuth verifies JWT, attaches user
  │  ◄─────────── connected          │
  │                                  │  socket joins room `user:<id>`
  │                                  │
  │  emit 'message:send'             │
  │  { receiverId, content }         │
  │ ─────────────────────────────►   │  chatGateway → chatService.sendMessage
  │                                  │  → messageRepository.insert
  │                                  │  → emit 'message:new' to both rooms
  │  ◄─────────── 'message:new'      │
  │            (full message DTO)    │
```

**Event schema** (versioned via the namespace `/chat`):

| Direction         | Event              | Payload                                         |
|-------------------|--------------------|-------------------------------------------------|
| client → server   | `message:send`     | `{ receiverId, content }`                       |
| server → both     | `message:new`      | `{ id, senderId, receiverId, content, sentAt }` |
| client → server   | `typing:start`     | `{ otherUserId }`                               |
| client → server   | `typing:stop`      | `{ otherUserId }`                               |
| server → other    | `typing:peer`      | `{ userId, isTyping }`                          |
| client → server   | `message:read`     | `{ otherUserId, upToMessageId }`                |
| server → sender   | `message:read:ack` | `{ readerId, upToMessageId }`                   |
| server → both     | `presence:peer`    | `{ userId, online: boolean }`                   |

**Gateway pattern:** a gateway is to a socket event what a controller is to an HTTP request. It owns no business logic. The chat gateway translates events ↔ service calls:

```js
// src/realtime/chatGateway.js
import { chatService } from '../services/chatService.js';

export function registerChatGateway(io, socket) {
  socket.on('message:send', async (payload, ack) => {
    try {
      const msg = await chatService.sendMessage({
        senderId: socket.data.user.id,
        receiverId: payload.receiverId,
        content: payload.content,
      });
      // Fan out to both participants' user-rooms
      io.to(`user:${msg.senderId}`).to(`user:${msg.receiverId}`).emit('message:new', msg);
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: { code: err.code, message: err.message } });
    }
  });
}
```

`chatService.sendMessage` is **the same** service that the REST endpoint used. Two transports, one rule. When a future client (mobile app, CLI) needs chat, it talks to the gateway; no business logic has to be reimplemented.

**Why `user:<id>` rooms, not `conversation:<aId>:<bId>`:** a user is online once and may have multiple conversations open. Joining one room per user keeps presence simple and lets us deliver any message to any of their open tabs/devices.

**Server bootstrap:**

```js
// src/realtime/index.js
import { Server } from 'socket.io';
import { socketAuth } from './socketAuth.js';
import { registerChatGateway } from './chatGateway.js';

export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') },
  });
  io.use(socketAuth);                       // verifies JWT, sets socket.data.user
  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.id}`);
    registerChatGateway(io, socket);
    socket.broadcast.emit('presence:peer', { userId: socket.data.user.id, online: true });
    socket.on('disconnect', () => {
      socket.broadcast.emit('presence:peer', { userId: socket.data.user.id, online: false });
    });
  });
  return io;
}
```

`server.js` creates the HTTP server explicitly so both Express and Socket.IO can attach to it:

```js
import http from 'node:http';
import app from './src/app.js';
import { attachRealtime } from './src/realtime/index.js';
import env from './src/config/env.js';

const server = http.createServer(app);
attachRealtime(server);
server.listen(env.port, () => console.log(`Pawble API+WS listening on :${env.port}`));
```

**Errors:** the gateway returns errors via the Socket.IO ack callback (`ack({ ok: false, error })`), not by throwing. Unhandled exceptions are caught, logged, and surfaced as `{ ok: false, error: { code: 'INTERNAL_ERROR' } }`. Same JSON shape as the REST error envelope.

---

## 4. Frontend — Target Architecture

### 4.1 Stack

- **React 18** with function components + hooks
- **Vite** for dev server / build
- **Tailwind CSS** via PostCSS plugin (not CDN)
- **React Router** for screens
- **Plain JavaScript (`.jsx`)** — no TypeScript
- **No Redux** — feature-scoped Context + custom hooks; reach for Zustand only if state actually outgrows that
- **Socket.IO client** for real-time chat (see §3.13)

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
│   │   ├── chatApi.js             # REST: history, list conversations (initial load only)
│   │   └── adminApi.js
│   ├── realtime/                  # WebSocket client wrapper
│   │   └── socket.js              # Lazy Socket.IO client, JWT injected on connect, auto-reconnect
│   ├── models/                    # Plain JS factories / shape helpers
│   │   ├── pet.js
│   │   └── user.js
│   ├── context/
│   │   ├── AuthContext.jsx        # currentUser, token, login, logout
│   │   ├── SocketContext.jsx      # Single socket instance, connects when authed, disconnects on logout
│   │   └── ThemeContext.jsx       # dark mode
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useCandidates.js
│   │   ├── useSwipe.js
│   │   ├── useChat.js             # Subscribes to socket events, merges with REST-loaded history
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
- **SocketContext** — single Socket.IO client instance, scoped to an authed session. Connects on login, disconnects on logout. `useChat` subscribes to `message:new` / `typing:peer` from this socket.
- **Per-feature hooks** own their own state. `useCandidates` owns the swipe deck; `useChat` owns the message list and merges socket-pushed messages with the REST-loaded history.
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
| GET    | `/api/conversations`                       | Caller's conversations (list)       |        |
| GET    | `/api/conversations/:otherId/messages`     | Message history with another user   |        |
| GET    | `/api/admin/users`                         | List users (admin)                  |        |
| PUT    | `/api/admin/users/:id/shelter`             | Toggle shelter flag (admin)         |        |

The shift from `/api/users/:userId` to `/api/users/me` removes a class of authorization bugs — you can no longer act on someone else by guessing an ID.

> **Note:** `POST /api/messages` is **deprecated** as of Phase 4. New messages flow over the WebSocket gateway. The endpoint remains for one minor version as a fallback, then is removed.

### 6.1 WebSocket Events

Namespace: `/chat` on the same origin as the HTTP API. Connection requires a valid JWT in the Socket.IO handshake `auth` payload. Full event schema in §3.13. Summary:

| Event              | Direction              | Purpose                                  |
|--------------------|------------------------|------------------------------------------|
| `message:send`     | client → server (ack)  | Send a new message                       |
| `message:new`      | server → both peers    | Deliver a new message                    |
| `typing:start/stop`| client → server        | Local user starts/stops typing           |
| `typing:peer`      | server → other peer    | Peer's typing state changed              |
| `message:read`     | client → server        | Mark thread read up to a message id      |
| `message:read:ack` | server → original sender | Confirm peer has read up to that point |
| `presence:peer`    | server → all           | A user came online or went offline       |

---

## 7. Cross-Cutting Concerns

- **Uploads.** Multer writes to `public/uploads/`. The DB stores **relative paths** (`/uploads/pet-123.jpg`), not absolute URLs with `http://localhost:3000` baked in. The frontend prepends the API origin at render time. This kills the `fixMediaUrl` hack.
- **Secrets.** `JWT_SECRET`, `DB_PASSWORD` validated at boot.
- **CORS.** Origin allowlist from env in production; permissive in dev.
- **Logging.** Pino with request IDs in production. `console.log` only in `server.js` boot output.
- **Security.** bcrypt cost ≥ 10, JWT in `Authorization` header (not cookies for now), parameterized SQL everywhere (already true), file type and size limits enforced in multer.
- **Chat real-time.** WebSocket (Socket.IO) from Phase 4 onward — see §3.13 for the protocol and §6.1 for the event surface. The polling implementation introduced in the v2 frontend is a temporary shim and is removed once the gateway lands. REST endpoints stay only for initial history load.
- **Reverse proxy.** Any production proxy in front of the API (nginx, Caddy, Cloudflare) must allow `Upgrade: websocket` on the chat path. Default nginx blocks it — `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` is required. Caddy handles it automatically.

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

### Phase 4 — Real-time messaging via WebSocket (implemented on `v3-websocket`)

Replace the temporary HTTP polling in the v2 frontend with Socket.IO. The service layer doesn't change; we add a gateway above it and a socket client below it.

**Backend:**
1. ✅ `npm i socket.io` in `pawble-backend`.
2. ✅ Convert `server.js` to explicitly create an `http.Server` so both Express and Socket.IO attach to the same port.
3. ✅ Add `src/realtime/index.js`, `src/realtime/socketAuth.js`, `src/realtime/chatGateway.js` per §3.13 (`message:send`, `typing:start`/`typing:stop`).
4. ✅ Wire `message:send` to the existing `chatService.sendMessage` (no service-layer changes; it now returns the full message DTO via `messageRepository.findById`).
5. ⏸ `presence:peer` join/leave — deferred (see note below).
6. ✅ Mark `POST /api/messages` deprecated (keeps working, logs a warning when used).

**Frontend:**
1. ✅ `npm i socket.io-client` in `pawble-frontend`.
2. ✅ Add `src/realtime/socket.js` — a lazy singleton that connects with the current JWT (`auth` callback reads the token store on each (re)connect).
3. ✅ Add `SocketContext` that connects on login, disconnects on logout.
4. ✅ Rewrite `useChat`:
   - Initial messages still loaded via REST (`chatApi.listMessages`), and re-synced on socket reconnect.
   - Subscribe to `message:new` events for the active `otherId`; append to the message list (deduped by id).
   - Send via `socket.emit('message:send', ...)` with ack, falling back to the deprecated REST endpoint if the socket is disconnected; removed the polling interval entirely.
5. ✅ Added a typing indicator (`typing:start`/`typing:stop` ↔ `typing:peer`) in `ConversationPage`. ⏸ Online dot — deferred along with presence.
6. ✅ Deleted the 4 s `setInterval` from `useChat`.

**Deferred to Phase 5:** `presence:peer` and `message:read`/`message:read:ack` (rows in §3.13/§6.1) need a bit more design — presence needs an initial "who's online" snapshot on connect (not just deltas), and read receipts need a persisted last-read pointer (no `read_at` column yet). Implementing either without the other half is a half-finished UI feature, so both were left out of this pass.

**Exit criteria:** opening two browser tabs as different users and sending a message in one shows it in the other in under 200 ms — verified against a live server + DB (see PR notes). No network tab traffic between sends. Disconnecting the network and reconnecting auto-restores the socket and re-syncs history.

### Phase 5 — Hardening (post real-time)

- Move `/uploads` behind nginx or to S3-compatible storage.
- Add Jest/Vitest suites for `services/*` and `hooks/*`. The gateway is testable by feeding it a fake socket.
- Add a GitHub Actions workflow: lint + tests + build on PR.
- Add database migration tooling (`db-migrate-mysql` or similar) before schema starts diverging across environments.

---

## 9. Risks & Open Questions

- **Token storage in `localStorage`** is vulnerable to XSS. Acceptable for v1 given a trusted dev environment; revisit with httpOnly cookies + CSRF tokens if the app goes public.
- **Reverse proxy must support WebSocket upgrade.** Default nginx config drops the `Upgrade` header — the chat will silently fall back to polling (Socket.IO's default fallback) or fail entirely. Verify in staging: `wscat -c wss://host/socket.io/?EIO=4&transport=websocket` should return 101.
- **Horizontal scaling needs sticky sessions or a Redis adapter.** Two API instances behind a load balancer can't see each other's connected sockets — a user connected to instance A won't receive messages emitted on instance B. Solutions: sticky sessions (per-user pinning) or `socket.io-redis-adapter` to fan out events through Redis. Not needed for v1 single-instance deploys; add when scaling out.
- **Socket auth on long-lived connections.** A JWT expires after 7 days, but a socket might stay open longer. We re-verify on reconnect, and currently force-disconnect when a token expires mid-session is left as a Phase 5 polish item.
- **`/uploads` served from the Node process** mixes static asset serving into the API. Fine for dev. In production, put nginx in front or use S3.
- **No DB migrations tooling.** Schema is documented but not versioned. Consider `knex` or `db-migrate-mysql` when the schema starts changing.
- **No tests yet.** The refactor is the right time to introduce them; targeting `services/` first gives the most value per line of test code. The chat gateway is also test-worthy — stub the socket and assert it emits the right events.

---

## 10. Glossary

- **Controller (backend)** — Express handler. HTTP I/O only.
- **Gateway (backend)** — Socket.IO event handler. The WebSocket analogue of a controller: parses an event, calls services, emits events back. No business logic, no SQL.
- **Service** — business logic, no HTTP, no sockets, no SQL.
- **Repository** — SQL + row mapping. Returns domain objects.
- **Model** — shape of a domain entity; no behavior beyond construction/mapping.
- **Room (Socket.IO)** — a named group of sockets the server can broadcast to. We use one room per user (`user:<id>`) so messages reach every device that user has open.
- **Container (frontend)** — a page/route component that wires hooks to presentational components.
- **Hook (frontend)** — encapsulates state + side effects for a feature; the frontend analogue of a service.
