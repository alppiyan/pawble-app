const BASE = 'http://localhost:3000/api';
const stamp = Date.now();

let pass = 0;
let fail = 0;
const log = (label, obj) => {
  console.log(`\n--- ${label} ---`);
  console.log(typeof obj === 'object' ? JSON.stringify(obj, null, 2) : obj);
};
const assert = (label, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`PASS  ${label}${detail ? ' :: ' + detail : ''}`);
  } else {
    fail++;
    console.log(`FAIL  ${label}${detail ? ' :: ' + detail : ''}`);
  }
};

const req = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
};

// Health
const h = await req('/health');
assert('health 200', h.status === 200 && h.data.ok === true);

// Metadata
const meta = await req('/metadata');
assert('metadata 200', meta.status === 200);
const species = meta.data.species[0];
const breed = meta.data.breeds.find((b) => b.speciesId === species.id);
log('metadata sample', { species, breed });
assert('species + breed seeded', !!species && !!breed);

// Register A
const ra = await req('/auth/register', {
  method: 'POST',
  body: { name: 'Ada', surname: 'Lovelace', email: `ada+${stamp}@test.dev`, password: 'secret123', location: 'Istanbul' },
});
log('register A', ra);
assert('register A 201', ra.status === 201 && !!ra.data.token);

// Register B
const rb = await req('/auth/register', {
  method: 'POST',
  body: { name: 'Linus', surname: 'Torvalds', email: `linus+${stamp}@test.dev`, password: 'secret123', location: 'Helsinki' },
});
log('register B', rb);
assert('register B 201', rb.status === 201 && !!rb.data.token);

const tokenA = ra.data.token;
const tokenB = rb.data.token;

// Login A
const la = await req('/auth/login', {
  method: 'POST',
  body: { email: `ada+${stamp}@test.dev`, password: 'secret123' },
});
assert('login A 200', la.status === 200 && !!la.data.token);

// /me
const meA = await req('/auth/me', { token: tokenA });
assert('me A 200', meA.status === 200 && meA.data.user.email === `ada+${stamp}@test.dev`);

// Create pets
const petA = await req('/pets', {
  method: 'POST',
  token: tokenA,
  body: { name: 'Mochi', speciesId: species.id, breedId: breed.id, gender: 'disi', age: 3, vaccinated: true, description: 'Friendly', goal: 'mating' },
});
log('pet A', petA);
assert('create pet A 201', petA.status === 201 && !!petA.data.id);

const petB = await req('/pets', {
  method: 'POST',
  token: tokenB,
  body: { name: 'Bandit', speciesId: species.id, breedId: breed.id, gender: 'erkek', age: 4, vaccinated: true, description: 'Energetic', goal: 'mating' },
});
log('pet B', petB);
assert('create pet B 201', petB.status === 201 && !!petB.data.id);

// pets/mine
const myA = await req('/pets/mine', { token: tokenA });
assert('pets mine has 1', myA.status === 200 && myA.data.length === 1 && myA.data[0].id === petA.data.id);

// Candidates for A
const cands = await req(`/candidates?mode=mating&myPetId=${petA.data.id}`, { token: tokenA });
log('candidates', cands);
assert('candidates includes B', cands.status === 200 && cands.data.some((c) => c.id === petB.data.id));

// A swipes right on B (should not match yet)
const sw1 = await req('/swipes', {
  method: 'POST',
  token: tokenA,
  body: { likerPetId: petA.data.id, likedPetId: petB.data.id, action: 'right' },
});
log('swipe 1', sw1);
assert('A→B swipe records, no match', sw1.status === 200 && sw1.data.match === false);

// B swipes right on A → match
const sw2 = await req('/swipes', {
  method: 'POST',
  token: tokenB,
  body: { likerPetId: petB.data.id, likedPetId: petA.data.id, action: 'right' },
});
log('swipe 2', sw2);
assert('B→A swipe results in match', sw2.status === 200 && sw2.data.match === true);

// Stats
const stats = await req(`/pets/${petA.data.id}/stats`, { token: tokenA });
log('stats', stats);
assert('A pet has 1 matched/pending like', stats.status === 200 && stats.data.likeCount >= 1);

// Message A→B
const msg = await req('/messages', {
  method: 'POST',
  token: tokenA,
  body: { receiverId: rb.data.user.id, content: 'Hello from Mochi' },
});
log('message', msg);
assert('message sent 201', msg.status === 201);

// Conversations for B
const convB = await req('/conversations', { token: tokenB });
log('conversations B', convB);
assert('B has 1 conversation', convB.status === 200 && convB.data.length === 1);

// Messages between B and A (from B view)
const msgsB = await req(`/conversations/${ra.data.user.id}/messages`, { token: tokenB });
log('messages B view', msgsB);
assert('B sees message', msgsB.status === 200 && msgsB.data.length === 1 && msgsB.data[0].content === 'Hello from Mochi');

// Authorization: A tries to delete B's pet
const badDel = await req(`/pets/${petB.data.id}`, { method: 'DELETE', token: tokenA });
log('cross-user delete attempt', badDel);
assert('cross-user delete blocked 403', badDel.status === 403);

// Authorization: missing token on protected endpoint
const noAuth = await req('/pets/mine');
assert('no-token protected route → 401', noAuth.status === 401);

// Validation: short password
const badReg = await req('/auth/register', {
  method: 'POST',
  body: { name: 'X', surname: 'Y', email: `bad+${stamp}@test.dev`, password: '123' },
});
log('short password', badReg);
assert('short password → 422', badReg.status === 422);

// Validation: missing fields
const badReg2 = await req('/auth/register', {
  method: 'POST',
  body: { email: `nope+${stamp}@test.dev`, password: 'secret123' },
});
assert('missing required fields → 422', badReg2.status === 422);

// Duplicate email
const dupReg = await req('/auth/register', {
  method: 'POST',
  body: { name: 'Ada', surname: 'L', email: `ada+${stamp}@test.dev`, password: 'secret123' },
});
log('duplicate email', dupReg);
assert('duplicate email rejected', dupReg.status === 409);

console.log(`\n=== Smoke test: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
