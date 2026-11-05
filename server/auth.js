// Sign-in for MyTube (claude, 2026-11-05). Replaces the old check, which trusted any "cf-access-authenticated-user-email"
// header, decoded Cloudflare's token without checking it, and made everyone an admin when not in production.
//
// AUTH_MODE=cloudflare  Behind Cloudflare Access. The Cf-Access-Jwt-Assertion header (or CF_Authorization cookie) must be a
//                       token signed by your Cloudflare team (CF_TEAM_DOMAIN, e.g. bytemypc.cloudflareaccess.com) for this
//                       app (CF_AUD = the Application Audience tag). Anything else is refused.
// AUTH_MODE=demo        A demo with made-up data: /demo/signin lists demo people; picking one sets a signed cookie.
//                       Only for a copy with sample videos that is not reachable from the internet without Cloudflare.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const MODE = (process.env.AUTH_MODE || 'cloudflare').toLowerCase();
const TEAM = (process.env.CF_TEAM_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const AUD = process.env.CF_AUD || '';
const DEMO_COOKIE = 'mt_demo';
const DEMO_PEOPLE = [
    { key: 'admin', email: 'alex.admin@demo.test', name: 'Alex (admin)', role: 'admin' },
    { key: 'viewer', email: 'sam.viewer@demo.test', name: 'Sam (viewer)', role: 'user' },
];

if (!['cloudflare', 'demo'].includes(MODE)) throw new Error(`AUTH_MODE must be "cloudflare" or "demo", not "${MODE}"`);
if (MODE === 'cloudflare' && (!TEAM || !AUD)) console.warn('AUTH_MODE=cloudflare needs CF_TEAM_DOMAIN and CF_AUD: every sign-in will be refused until they are set.');

/* ---------- Cloudflare Access: verify the token against the team's public keys (cached for an hour) ---------- */
let keys = { at: 0, byKid: new Map() };
async function cfKeys() {
    if (Date.now() - keys.at < 3600_000 && keys.byKid.size) return keys.byKid;
    const res = await fetch(`https://${TEAM}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Cloudflare certs: ${res.status}`);
    const body = await res.json();
    const byKid = new Map((body.keys || []).map((k) => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })]));
    keys = { at: Date.now(), byKid };
    return byKid;
}
async function verifyCf(token) {
    if (!TEAM || !AUD || !token) return null;
    const head = jwt.decode(token, { complete: true })?.header;
    if (!head?.kid) return null;
    let key = (await cfKeys()).get(head.kid);
    if (!key) { keys.at = 0; key = (await cfKeys()).get(head.kid); } // keys rotated
    if (!key) return null;
    const p = jwt.verify(token, key, { algorithms: ['RS256'], audience: AUD, issuer: `https://${TEAM}` });
    return p?.email ? { email: String(p.email).toLowerCase(), name: p.name || p.common_name || '' } : null;
}

/* ---------- demo ---------- */
const sign = (secret, v) => `${v}.${crypto.createHmac('sha256', secret).update(v).digest('base64url')}`;
function unsign(secret, s) {
    const i = String(s || '').lastIndexOf('.');
    if (i < 1) return null;
    const v = s.slice(0, i), mac = Buffer.from(s.slice(i + 1)), want = Buffer.from(sign(secret, v).slice(i + 1));
    return mac.length === want.length && crypto.timingSafeEqual(mac, want) ? v : null;
}

// Returns { email, name, demoRole? } for the signed-in person, or null.
async function identify(req, secret) {
    if (MODE === 'demo') {
        const key = unsign(secret, req.cookies?.[DEMO_COOKIE]);
        const p = DEMO_PEOPLE.find((x) => x.key === key);
        return p ? { email: p.email, name: p.name, demoRole: p.role } : null;
    }
    const token = req.get('cf-access-jwt-assertion') || req.cookies?.CF_Authorization;
    try { return await verifyCf(token); } catch (e) { console.warn('Cloudflare sign-in refused:', e.message); return null; }
}

function demoRoutes(app, secret) {
    if (MODE !== 'demo') return;
    const page = (body) => `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MyTube demo</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e2e8f0;font:16px system-ui,sans-serif}main{width:min(420px,92vw)}h1{margin:0 0 6px}p{color:#94a3b8;margin:0 0 20px}
button{display:block;width:100%;text-align:left;margin:0 0 10px;padding:16px 18px;border-radius:12px;border:1px solid #334155;background:#1e293b;color:#fff;font:inherit;cursor:pointer}button:hover{border-color:#ef4444}button small{display:block;color:#94a3b8;margin-top:2px}</style></head><body><main>${body}</main></body></html>`;
    app.get('/demo/signin', (req, res) => {
        res.set('Cache-Control', 'no-store').send(page(`<h1>MyTube demo</h1><p>Made-up videos. Pick who to be:</p>
<form method="post" action="/demo/signin">${DEMO_PEOPLE.map((p) => `<button name="who" value="${p.key}">${p.name}<small>${p.role === 'admin' ? 'Can upload, edit, delete and manage users' : 'Can watch and upload'}</small></button>`).join('')}</form>`));
    });
    app.post('/demo/signin', require('express').urlencoded({ extended: false, limit: '1kb' }), (req, res) => {
        const p = DEMO_PEOPLE.find((x) => x.key === req.body?.who);
        if (!p) return res.redirect('/demo/signin');
        res.cookie(DEMO_COOKIE, sign(secret, p.key), { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 8 * 3600_000 });
        res.redirect('/');
    });
}

module.exports = { MODE, identify, demoRoutes, DEMO_COOKIE, _sign: sign, _unsign: unsign };
