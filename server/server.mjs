// Forge — serveur multi-poste (Node ≥ 18, aucune dépendance)
// Lancement : node server.mjs   (variables facultatives : PORT, FORGE_ADMIN, FORGE_DATA)
// Plusieurs parties possibles : le code animateur principal crée des salles, chacune avec son propre code animateur.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
// Le moteur est à côté du serveur dans le paquet distribué, et dans ../src/ dans le dépôt.
const ENGINE_LOCAL = new URL('./engine.js', import.meta.url);
const E = await import(fs.existsSync(ENGINE_LOCAL) ? ENGINE_LOCAL.href : new URL('../src/engine.js', import.meta.url).href);

const NODE_MAJOR = Number(process.versions.node.split('.')[0]);
if (NODE_MAJOR < 18) { console.error(`Forge nécessite Node.js 18 ou plus récent (version détectée : ${process.versions.node}). Téléchargez la version LTS sur https://nodejs.org`); process.exit(1); }

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const DATA_DIR = process.env.FORGE_DATA || path.join(DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, 'partie.json');
const ADMIN_FILE = path.join(DATA_DIR, 'code-animateur.txt');
const PAGE_FILE = path.join(DIR, 'public', 'index.html');
const MAX_BODY = 4 * 1024 * 1024;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Limite de tentatives : au-delà de MAX_FAILS codes invalides en FAIL_WINDOW depuis une adresse, connexions refusées pendant FAIL_WINDOW.
// Seuil volontairement large : une classe derrière une même adresse publique ne doit pas se bloquer après une nouvelle partie.
const MAX_FAILS = Number(process.env.FORGE_MAX_FAILS) || 30;
const FAIL_WINDOW = 10 * 60 * 1000;
const fails = new Map();
const clientIp = (req) => req.socket.remoteAddress || '?';
function blocked(ip) { const f = fails.get(ip); if (!f) return false; if (Date.now() - f.since > FAIL_WINDOW) { fails.delete(ip); return false; } return f.n >= MAX_FAILS; }
function failed(ip) { const f = fails.get(ip); if (!f || Date.now() - f.since > FAIL_WINDOW) fails.set(ip, { n: 1, since: Date.now() }); else f.n++; }

fs.mkdirSync(DATA_DIR, { recursive: true });
const genCode = (n = 6) => Array.from(crypto.randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join('');
let ADMIN = (process.env.FORGE_ADMIN || '').trim().toUpperCase();
if (!ADMIN && fs.existsSync(ADMIN_FILE)) ADMIN = fs.readFileSync(ADMIN_FILE, 'utf8').trim().toUpperCase();
if (!ADMIN) { ADMIN = genCode(6); fs.writeFileSync(ADMIN_FILE, ADMIN); }

// ---------- état : salles ----------
// La salle principale est la partie historique (data/partie.json, code animateur principal). Le code principal gère
// aussi les autres salles (data/salles/<id>.json), chacune avec sa partie, son code animateur et ses codes d'équipe.
const MAIN = 'principale';
const ROOMS_DIR = path.join(DATA_DIR, 'salles');
const ROOMS = {};
const PERSISTED = ['id', 'name', 'admin', 'G', 'prev', 'codes', 'deadline', 'rev', 'srev'];
const roomFile = (id) => (id === MAIN ? STATE_FILE : path.join(ROOMS_DIR, `${id}.json`));
const emptyRoom = (id, name, admin) => ({ id, name, admin, G: null, prev: null, codes: {}, deadline: null, rev: 1, srev: 1, lastSeen: {}, saveTimer: null });

function loadRoom(file, fallback) {
  const R = fallback;
  if (!fs.existsSync(file)) return R;
  try {
    const o = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (o.G) o.G = E.importSave(JSON.stringify(o.G));
    if (o.prev) o.prev = E.importSave(JSON.stringify(o.prev));
    for (const k of PERSISTED) if (k in o) R[k] = o[k];
    R.rev = (o.rev || 1) + 1;
    console.log(`Partie reprise depuis ${file} (${R.G ? `${R.G.t}/${R.G.settings.nQuarters} trimestres joués` : 'aucune partie'}).`);
  } catch (e) { console.error(`Fichier de partie illisible, ignoré : ${file} : ${e.message}`); }
  return R;
}
ROOMS[MAIN] = loadRoom(STATE_FILE, emptyRoom(MAIN, 'Salle principale', ADMIN));
ROOMS[MAIN].id = MAIN; ROOMS[MAIN].admin = ADMIN; // le code principal vient de FORGE_ADMIN ou de code-animateur.txt
if (fs.existsSync(ROOMS_DIR)) {
  for (const fn of fs.readdirSync(ROOMS_DIR).filter((x) => /^[a-z0-9]+\.json$/.test(x))) {
    const id = fn.slice(0, -5);
    const R = loadRoom(path.join(ROOMS_DIR, fn), emptyRoom(id, id, null));
    R.id = id;
    if (R.admin) ROOMS[id] = R;
  }
}

function persistNow(R) {
  clearTimeout(R.saveTimer); R.saveTimer = null;
  const file = roomFile(R.id);
  if (R.id !== MAIN) fs.mkdirSync(ROOMS_DIR, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(PERSISTED.map((k) => [k, R[k]]))));
  fs.renameSync(tmp, file);
}
function persistSoon(R) { if (!R.saveTimer) R.saveTimer = setTimeout(() => persistNow(R), 1000); }
function changed(R, kind = 'rev') { if (kind === 'rev') R.rev++; R.srev++; persistNow(R); }

function codeRole(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  if (c === ADMIN) return { role: 'admin', room: MAIN, master: true };
  for (const R of Object.values(ROOMS)) {
    if (c === R.admin) return { role: 'admin', room: R.id, master: false };
    for (const [fid, k] of Object.entries(R.codes || {})) if (k === c && R.G && R.G.firms.some((f) => f.id === fid)) return { role: 'team', room: R.id, fid };
  }
  return null;
}
// codes uniques sur tout le serveur (codes animateur et codes d'équipe de toutes les salles)
function freshCode(extra = []) {
  const used = new Set([ADMIN, ...extra]);
  for (const R of Object.values(ROOMS)) { if (R.admin) used.add(R.admin); for (const k of Object.values(R.codes || {})) used.add(k); }
  let c; do c = genCode(6); while (used.has(c));
  return c;
}
function newCodes(G) {
  const codes = {};
  for (const f of G.firms) codes[f.id] = freshCode(Object.values(codes));
  return codes;
}

// ---------- vues ----------
function publicFirm(f) {
  return {
    id: f.id, name: f.name, color: f.color, kind: f.kind, ai: f.ai || null, vps: f.vps, vps0: f.vps0, tsr: f.tsr, marketCap: f.marketCap, cumDivPS: f.cumDivPS,
    rating: f.rating, shares: f.shares, revHist: f.revHist, report: f.report ? { pnl: { ni: f.report.pnl.ni } } : null,
    history: f.history.map((h) => ({ q: h.q, vps: h.vps, tsr: h.tsr, revenue: h.revenue, ni: h.ni, revShare: h.revShare, shareS: h.shareS, shareP: h.shareP })),
  };
}
function teamView(S, fid) {
  const G = S.G;
  const base = { ...G, rng: 0, seed: 0, injected: [], schedule: [], decisions: {}, submitted: G.submitted || {} };
  if (G.phase === 'finished') return base; // débriefing : tout est public
  // l'état initial et le journal contiennent les décisions de toutes les équipes : révélés seulement en fin de partie
  base.origin = null; base.log = [];
  base.viewTechAvg = { S: E.marketTechAvg(G, 'S'), P: E.marketTechAvg(G, 'P') };
  if (!E.isPureTsr(G)) base.viewScores = E.scores(G); // les équipes ne voient pas les données internes des concurrents
  base.firms = G.firms.map((f) => (f.id === fid ? f : publicFirm(f)));
  if (G.lastMarket) base.lastMarket = { q: G.lastMarket.q, seg: Object.fromEntries(E.SEGS.map((s) => [s, { total: G.lastMarket.seg[s].total, avgP: G.lastMarket.seg[s].avgP }])) };
  return base;
}

// ---------- HTTP ----------
function send(req, res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra };
  if (buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { buf = zlib.gzipSync(buf); headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = buf.length;
  res.writeHead(status, headers); res.end(buf);
}
const err = (req, res, status, message) => send(req, res, status, { error: message });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('Requête trop volumineuse.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('JSON invalide.')); } });
    req.on('error', reject);
  });
}

function lanAddresses(req) {
  const port = (req.headers.host || '').split(':')[1] || PORT;
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  const host = (req.headers.host || '').split(':')[0];
  if (host && !['localhost', '127.0.0.1'].includes(host)) return [`http://${req.headers.host}`];
  return ips.map((ip) => `http://${ip}:${port}`);
}

let pageCache = null;
function page() { if (!pageCache || process.env.FORGE_DEV) pageCache = fs.readFileSync(PAGE_FILE); return pageCache; }

function statusFor(S, who) {
  const G = S.G;
  const out = { rev: S.rev, srev: S.srev, now: Date.now(), deadline: S.deadline, hasGame: !!G };
  if (G) Object.assign(out, { phase: G.phase, t: G.t, nQ: G.settings.nQuarters, submitted: G.submitted || {}, drafted: Object.fromEntries(G.firms.map((f) => [f.id, !!(G.decisions && G.decisions[f.id])])),
    submittedRoles: G.settings.roles ? G.submittedRoles || {} : undefined });
  if (who && who.role === 'admin') out.lastSeen = Object.fromEntries(Object.entries(S.lastSeen).map(([k, v]) => [k, Date.now() - v]));
  return out;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'GET' && (p === '/' || p === '/index.html')) return send(req, res, 200, page(), 'text/html; charset=utf-8');
  if (!p.startsWith('/api/')) return err(req, res, 404, 'Introuvable.');
  const ip = clientIp(req);
  const limited = (p === '/api/login' || (p !== '/api/status' && req.headers['x-forge-code'])) && blocked(ip);
  if (limited) return err(req, res, 429, 'Trop de codes erronés depuis ce poste. Réessayez dans une dizaine de minutes.');
  const who = codeRole(req.headers['x-forge-code']);
  const S = ROOMS[who ? who.room : MAIN];
  if (who && who.role === 'team') S.lastSeen[who.fid] = Date.now();

  if (req.method === 'POST' && p === '/api/login') {
    const body = await readBody(req);
    const r = codeRole(body.code);
    if (!r) { failed(ip); return err(req, res, 401, 'Code inconnu. Vérifiez-le auprès de l’animateur.'); }
    const R = ROOMS[r.room];
    if (r.role === 'team') { R.lastSeen[r.fid] = Date.now(); const f = R.G.firms.find((x) => x.id === r.fid); return send(req, res, 200, { role: 'team', firmId: r.fid, name: f.name }); }
    return send(req, res, 200, { role: 'admin', master: r.master, room: R.id === MAIN ? null : R.name });
  }
  if (req.method === 'GET' && p === '/api/status') return send(req, res, 200, statusFor(S, who));
  if (!who) { if (req.headers['x-forge-code']) failed(ip); return err(req, res, 401, 'Connexion requise.'); }

  if (req.method === 'GET' && p === '/api/view') {
    if (who.role === 'admin') return send(req, res, 200, { role: 'admin', master: who.master, room: S.id === MAIN ? null : S.name, G: S.G, canUndo: !!S.prev, codes: S.codes, deadline: S.deadline, rev: S.rev, addresses: lanAddresses(req) });
    const G = S.G;
    return send(req, res, 200, { role: 'team', firmId: who.fid, G: teamView(S, who.fid), draft: (G.decisions || {})[who.fid] || null, submitted: !!(G.submitted || {})[who.fid],
      submittedRoles: (G.submittedRoles || {})[who.fid] || {}, rev: S.rev, srev: S.srev });
  }

  if (who.role === 'team') {
    if (req.method === 'PUT' && p === '/api/decisions') {
      const body = await readBody(req);
      const G = S.G;
      if (!G || G.phase === 'finished') return err(req, res, 409, 'La partie est terminée.');
      if (body.q !== G.t + 1) return err(req, res, 409, 'Ce trimestre vient d’être résolu : vos données ont été rechargées.');
      if (!body.decisions || typeof body.decisions !== 'object') return err(req, res, 400, 'Décisions manquantes.');
      const f = G.firms.find((x) => x.id === who.fid);
      if (E.isAi(f)) return err(req, res, 409, 'Votre entreprise est pilotée par l’IA sur décision de l’animateur : vos décisions ne sont pas prises en compte.');
      E.sanitize(G, f, body.decisions); // validation : lève une erreur si la structure est inexploitable
      if (G.settings.roles) {
        // rôles : seuls les champs des rôles du poste sont fusionnés ; l'équipe est validée quand chaque rôle a validé sa partie
        const roles = E.validRoles(body.roles);
        if (!roles.length) return err(req, res, 400, 'Choisissez au moins un rôle avant de saisir des décisions.');
        const merged = E.mergeRoleDecisions(G, f, (G.decisions || {})[who.fid], body.decisions, roles);
        const sr = { ...((G.submittedRoles || {})[who.fid] || {}) };
        for (const r of roles) sr[r] = !!body.submit;
        G.decisions = { ...(G.decisions || {}), [who.fid]: merged };
        G.submittedRoles = { ...(G.submittedRoles || {}), [who.fid]: sr };
        G.submitted = { ...(G.submitted || {}), [who.fid]: E.ROLE_KEYS.every((r) => sr[r]) };
        S.srev++; persistSoon(S);
        return send(req, res, 200, { ok: true, submitted: G.submitted[who.fid], submittedRoles: sr, draft: merged, srev: S.srev });
      }
      G.decisions = { ...(G.decisions || {}), [who.fid]: body.decisions };
      G.submitted = { ...(G.submitted || {}), [who.fid]: !!body.submit };
      S.srev++; persistSoon(S);
      return send(req, res, 200, { ok: true, submitted: !!body.submit, srev: S.srev });
    }
    return err(req, res, 403, 'Action réservée à l’animateur.');
  }

  // ----- salles (code animateur principal) -----
  if (p.startsWith('/api/master/')) {
    if (!who.master) return err(req, res, 403, 'Action réservée au code animateur principal du serveur.');
    const list = () => Object.values(ROOMS).map((R) => ({ id: R.id, name: R.name, main: R.id === MAIN, admin: R.id === MAIN ? null : R.admin,
      hasGame: !!R.G, phase: R.G ? R.G.phase : null, t: R.G ? R.G.t : 0, nQ: R.G ? R.G.settings.nQuarters : 0, teams: R.G ? R.G.firms.map((f) => f.name) : [] }));
    if (req.method === 'GET' && p === '/api/master/rooms') return send(req, res, 200, { rooms: list() });
    if (req.method !== 'POST') return err(req, res, 405, 'Méthode non autorisée.');
    const body = await readBody(req);
    if (p === '/api/master/rooms') {
      const name = String(body.name || '').trim().slice(0, 40);
      if (!name) return err(req, res, 400, 'Nommez la salle.');
      if (Object.keys(ROOMS).length >= 50) return err(req, res, 409, 'Nombre maximal de salles atteint.');
      let id; do id = crypto.randomBytes(4).toString('hex'); while (ROOMS[id]);
      ROOMS[id] = emptyRoom(id, name, freshCode()); persistNow(ROOMS[id]);
      return send(req, res, 200, { ok: true, rooms: list() });
    }
    const R = ROOMS[body.id];
    if (!R || R.id === MAIN) return err(req, res, 400, 'Salle inconnue.');
    if (p === '/api/master/rooms/newcode') { R.admin = freshCode(); changed(R); return send(req, res, 200, { ok: true, rooms: list() }); }
    if (p === '/api/master/rooms/delete') {
      clearTimeout(R.saveTimer); delete ROOMS[R.id];
      try { fs.unlinkSync(roomFile(R.id)); } catch { /* déjà absent */ }
      return send(req, res, 200, { ok: true, rooms: list() });
    }
    return err(req, res, 404, 'Action inconnue.');
  }

  // ----- animateur -----
  if (req.method === 'GET' && p === '/api/admin/export') {
    if (!S.G) return err(req, res, 404, 'Aucune partie.');
    return send(req, res, 200, E.exportSave(S.G), 'application/json; charset=utf-8', { 'Content-Disposition': `attachment; filename="forge-T${S.G.t}.json"` });
  }
  if (req.method !== 'POST') return err(req, res, 405, 'Méthode non autorisée.');
  const body = await readBody(req);
  switch (p) {
    case '/api/admin/new': {
      const G = E.newGame(body); G.submitted = {};
      Object.assign(S, { G, prev: null, codes: newCodes(G), deadline: null, lastSeen: {} });
      changed(S); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/resolve': {
      if (!S.G || S.G.phase === 'finished') return err(req, res, 409, 'Aucun trimestre à résoudre.');
      if (body.t !== undefined && body.t !== S.G.t) return err(req, res, 409, 'Ce trimestre a déjà été résolu.');
      const ng = E.resolveQuarter(S.G, S.G.decisions || {});
      ng.submitted = {}; ng.submittedRoles = {};
      S.prev = S.G; S.G = ng; S.deadline = null;
      changed(S); return send(req, res, 200, { ok: true, q: ng.t });
    }
    case '/api/admin/undo':
      if (!S.prev) return err(req, res, 409, 'Rien à annuler.');
      S.G = S.prev; S.prev = null; changed(S); return send(req, res, 200, { ok: true });
    case '/api/admin/inject':
      if (!S.G || !E.GLOBAL_EVENTS[body.id]) return err(req, res, 400, 'Événement inconnu.');
      S.G = E.injectEvent(S.G, body.id); changed(S); return send(req, res, 200, { ok: true });
    case '/api/admin/finish':
      if (!S.G) return err(req, res, 409, 'Aucune partie.');
      S.G = { ...S.G, phase: 'finished' }; S.deadline = null; changed(S); return send(req, res, 200, { ok: true });
    case '/api/admin/rename': {
      const nm = String(body.name || '').trim().slice(0, 24);
      if (!S.G || !nm) return err(req, res, 400, 'Nom invalide.');
      S.G = { ...S.G, firms: S.G.firms.map((f) => (f.id === body.id ? { ...f, name: nm } : f)) }; changed(S); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/ai': {
      if (!S.G || S.G.phase === 'finished') return err(req, res, 409, 'Aucune partie en cours.');
      if (!S.G.firms.some((f) => f.id === body.id)) return err(req, res, 400, 'Équipe inconnue.');
      if (body.profile != null && !E.AI_PROFILES[body.profile]) return err(req, res, 400, 'Profil d’IA inconnu.');
      S.G = E.setAi(S.G, body.id, body.profile || null); changed(S); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/schedule': {
      if (!S.G || S.G.phase === 'finished') return err(req, res, 409, 'Aucune partie en cours.');
      const list = typeof body.text === 'string' ? E.parseSchedule(body.text) : body.schedule;
      S.G = E.setSchedule(S.G, list); changed(S); return send(req, res, 200, { ok: true, schedule: S.G.schedule });
    }
    case '/api/admin/timer': {
      const m = Number(body.minutes);
      S.deadline = Number.isFinite(m) && m > 0 ? Date.now() + Math.round(m * 60000) : null;
      changed(S, 'srev'); return send(req, res, 200, { ok: true, deadline: S.deadline });
    }
    case '/api/admin/import': {
      const G = E.importSave(String(body.save || ''));
      if (!G.submitted) G.submitted = {};
      Object.assign(S, { G, prev: null, codes: newCodes(G), deadline: null });
      changed(S); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/newcode': {
      if (!S.G || !S.G.firms.some((f) => f.id === body.id)) return err(req, res, 400, 'Équipe inconnue.');
      S.codes = { ...S.codes, [body.id]: freshCode() }; changed(S); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/close':
      Object.assign(S, { G: null, prev: null, codes: {}, deadline: null }); changed(S); return send(req, res, 200, { ok: true });
    default: return err(req, res, 404, 'Action inconnue.');
  }
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) err(req, res, e.message && e.message.length < 200 ? 400 : 500, e.message || 'Erreur serveur.'); });
});

export function start(port = PORT) {
  return new Promise((resolve) => server.listen(port, '0.0.0.0', () => resolve(server)));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  start().then(() => {
    const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
    console.log('\nForge — serveur multi-poste démarré');
    console.log(`  Sur ce poste       : http://localhost:${PORT}`);
    for (const ip of ips) console.log(`  Pour les équipes   : http://${ip}:${PORT}`);
    console.log(`  Code animateur     : ${ADMIN}   (conservé dans ${ADMIN_FILE})`);
    console.log('  Arrêt : Ctrl+C. La partie est enregistrée en continu et reprise au redémarrage.\n');
  });
  const stop = () => { for (const R of Object.values(ROOMS)) { try { if (R.saveTimer) persistNow(R); } catch { /* rien */ } } process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
export { server, ADMIN };
