// Read-only public demo (claude, 20 Nov 2026; codex review #ideas 6243). Starts the real server in a child process with
// a throwaway data folder and checks: browsing works, every change is refused, sign-out still works, and nothing at all
// is written to db.json while DEMO_READONLY=1. Also checks that normal mode still allows changes.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const SEED = { users: [], videos: [{ id: 'v1', title: 'Seed video', filename: 'seed.mp4', visibility: 'public', uploadedBy: 'nobody', createdAt: '2026-11-05T00:00:00.000Z' }], categories: ['Demo'], settings: {} };
let nextPort = 3410;

async function startServer(t, env) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mytube-test-'));
    fs.mkdirSync(path.join(dir, 'uploads'));
    fs.writeFileSync(path.join(dir, 'db.json'), JSON.stringify(SEED));
    const port = nextPort++;
    const child = spawn(process.execPath, ['index.js'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, AUTH_MODE: 'demo', PORT: String(port), HOST: '127.0.0.1', DB_PATH: path.join(dir, 'db.json'), UPLOADS_DIR: path.join(dir, 'uploads'), ...env },
        stdio: 'ignore',
    });
    t.after(() => { child.kill(); fs.rmSync(dir, { recursive: true, force: true }); });
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/api/auth/config')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
    const res = await fetch(base + '/demo/signin', { method: 'POST', body: new URLSearchParams({ who: 'admin' }), redirect: 'manual' });
    const cookie = (res.headers.getSetCookie?.() || [res.headers.get('set-cookie')]).map((c) => c.split(';')[0]).join('; ');
    const req = (m, p, body) => fetch(base + p, { method: m, headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const dbHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'db.json'))).digest('hex');
    return { req, dbHash, base };
}

test('DEMO_READONLY=1: browse yes, every change no, sign-out yes, db.json never written', async (t) => {
    const { req, dbHash } = await startServer(t, { DEMO_READONLY: '1' });
    const before = dbHash();
    assert.equal((await (await req('GET', '/api/auth/config')).json()).readOnly, true);
    assert.equal((await req('GET', '/api/auth/me')).status, 200, 'signed-in admin can see who they are');
    assert.equal((await req('GET', '/api/videos')).status, 200, 'video list works');
    for (const [m, p, body] of [
        ['POST', '/api/upload'], ['POST', '/api/categories', { name: 'X' }], ['PUT', '/api/categories/Demo', { name: 'Y' }],
        ['DELETE', '/api/categories/Demo'], ['DELETE', '/api/videos/v1'], ['PATCH', '/api/videos/v1/restore'], ['PUT', '/api/videos/v1', { title: 'hacked' }],
    ]) assert.equal((await req(m, p, body)).status, 403, `${m} ${p} is refused`);
    assert.equal((await req('POST', '/api/auth/logout')).status, 200, 'sign-out still works');
    assert.equal(dbHash(), before, 'db.json unchanged (no demo user records written)');
});

test('normal mode still allows changes', async (t) => {
    const { req } = await startServer(t, {});
    assert.equal((await (await req('GET', '/api/auth/config')).json()).readOnly, false);
    assert.equal((await req('POST', '/api/categories', { name: 'NewOne' })).status, 200);
});
