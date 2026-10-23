// Forge — serveur multi-poste (Node ≥ 18, aucune dépendance)
// Lancement : node server.mjs   (variables facultatives : PORT, FORGE_ADMIN, FORGE_DATA)
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

fs.mkdirSync(DATA_DIR, { recursive: true });
const genCode = (n = 6) => Array.from(crypto.randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join('');
let ADMIN = (process.env.FORGE_ADMIN || '').trim().toUpperCase();
if (!ADMIN && fs.existsSync(ADMIN_FILE)) ADMIN = fs.readFileSync(ADMIN_FILE, 'utf8').trim().toUpperCase();
if (!ADMIN) { ADMIN = genCode(6); fs.writeFileSync(ADMIN_FILE, ADMIN); }

// ---------- état ----------
let S = { G: null, prev: null, codes: {}, deadline: null, rev: 1, srev: 1 };
const lastSeen = {};
if (fs.existsSync(STATE_FILE)) {
  try {
    const o = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (o.G) o.G = E.importSave(JSON.stringify(o.G));
    if (o.prev) o.prev = E.importSave(JSON.stringify(o.prev));
    S = { ...S, ...o, rev: (o.rev || 1) + 1 };
    console.log(`Partie reprise depuis ${STATE_FILE} (${S.G ? `${S.G.t}/${S.G.settings.nQuarters} trimestres joués` : 'aucune partie'}).`);
  } catch (e) { console.error(`Fichier de partie illisible, ignoré : ${e.message}`); }
}

let saveTimer = null;
function persistNow() {
  clearTimeout(saveTimer); saveTimer = null;
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(S));
  fs.renameSync(tmp, STATE_FILE);
}
function persistSoon() { if (!saveTimer) saveTimer = setTimeout(persistNow, 1000); }
function changed(kind = 'rev') { if (kind === 'rev') S.rev++; S.srev++; persistNow(); }

function codeRole(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  if (c === ADMIN) return { role: 'admin' };
  for (const [fid, k] of Object.entries(S.codes || {})) if (k === c && S.G && S.G.firms.some((f) => f.id === fid)) return { role: 'team', fid };
  return null;
}
function newCodes(G) {
  const used = new Set([ADMIN]); const codes = {};
  for (const f of G.firms) { let c; do c = genCode(6); while (used.has(c)); used.add(c); codes[f.id] = c; }
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
function teamView(fid) {
  const G = S.G;
  const base = { ...G, rng: 0, seed: 0, injected: [], decisions: {}, submitted: G.submitted || {} };
  if (G.phase === 'finished') return base; // débriefing : tout est public
  base.viewTechAvg = { S: E.marketTechAvg(G, 'S'), P: E.marketTechAvg(G, 'P') };
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

function statusFor(who) {
  const G = S.G;
  const out = { rev: S.rev, srev: S.srev, now: Date.now(), deadline: S.deadline, hasGame: !!G };
  if (G) Object.assign(out, { phase: G.phase, t: G.t, nQ: G.settings.nQuarters, submitted: G.submitted || {}, drafted: Object.fromEntries(G.firms.map((f) => [f.id, !!(G.decisions && G.decisions[f.id])])) });
  if (who && who.role === 'admin') out.lastSeen = Object.fromEntries(Object.entries(lastSeen).map(([k, v]) => [k, Date.now() - v]));
  return out;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'GET' && (p === '/' || p === '/index.html')) return send(req, res, 200, page(), 'text/html; charset=utf-8');
  if (!p.startsWith('/api/')) return err(req, res, 404, 'Introuvable.');
  const who = codeRole(req.headers['x-forge-code']);
  if (who && who.role === 'team') lastSeen[who.fid] = Date.now();

  if (req.method === 'POST' && p === '/api/login') {
    const body = await readBody(req);
    const r = codeRole(body.code);
    if (!r) return err(req, res, 401, 'Code inconnu. Vérifiez-le auprès de l’animateur.');
    if (r.role === 'team') { lastSeen[r.fid] = Date.now(); const f = S.G.firms.find((x) => x.id === r.fid); return send(req, res, 200, { role: 'team', firmId: r.fid, name: f.name }); }
    return send(req, res, 200, { role: 'admin' });
  }
  if (req.method === 'GET' && p === '/api/status') return send(req, res, 200, statusFor(who));
  if (!who) return err(req, res, 401, 'Connexion requise.');

  if (req.method === 'GET' && p === '/api/view') {
    if (who.role === 'admin') return send(req, res, 200, { role: 'admin', G: S.G, canUndo: !!S.prev, codes: S.codes, deadline: S.deadline, rev: S.rev, addresses: lanAddresses(req) });
    const G = S.G;
    return send(req, res, 200, { role: 'team', firmId: who.fid, G: teamView(who.fid), draft: (G.decisions || {})[who.fid] || null, submitted: !!(G.submitted || {})[who.fid], rev: S.rev });
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
      G.decisions = { ...(G.decisions || {}), [who.fid]: body.decisions };
      G.submitted = { ...(G.submitted || {}), [who.fid]: !!body.submit };
      S.srev++; persistSoon();
      return send(req, res, 200, { ok: true, submitted: !!body.submit, srev: S.srev });
    }
    return err(req, res, 403, 'Action réservée à l’animateur.');
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
      S = { ...S, G, prev: null, codes: newCodes(G), deadline: null };
      for (const k of Object.keys(lastSeen)) delete lastSeen[k];
      changed(); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/resolve': {
      if (!S.G || S.G.phase === 'finished') return err(req, res, 409, 'Aucun trimestre à résoudre.');
      if (body.t !== undefined && body.t !== S.G.t) return err(req, res, 409, 'Ce trimestre a déjà été résolu.');
      const ng = E.resolveQuarter(S.G, S.G.decisions || {});
      ng.submitted = {};
      S.prev = S.G; S.G = ng; S.deadline = null;
      changed(); return send(req, res, 200, { ok: true, q: ng.t });
    }
    case '/api/admin/undo':
      if (!S.prev) return err(req, res, 409, 'Rien à annuler.');
      S.G = S.prev; S.prev = null; changed(); return send(req, res, 200, { ok: true });
    case '/api/admin/inject':
      if (!S.G || !E.GLOBAL_EVENTS[body.id]) return err(req, res, 400, 'Événement inconnu.');
      S.G = E.injectEvent(S.G, body.id); changed(); return send(req, res, 200, { ok: true });
    case '/api/admin/finish':
      if (!S.G) return err(req, res, 409, 'Aucune partie.');
      S.G = { ...S.G, phase: 'finished' }; S.deadline = null; changed(); return send(req, res, 200, { ok: true });
    case '/api/admin/rename': {
      const nm = String(body.name || '').trim().slice(0, 24);
      if (!S.G || !nm) return err(req, res, 400, 'Nom invalide.');
      S.G = { ...S.G, firms: S.G.firms.map((f) => (f.id === body.id ? { ...f, name: nm } : f)) }; changed(); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/ai': {
      if (!S.G || S.G.phase === 'finished') return err(req, res, 409, 'Aucune partie en cours.');
      if (!S.G.firms.some((f) => f.id === body.id)) return err(req, res, 400, 'Équipe inconnue.');
      if (body.profile != null && !E.AI_PROFILES[body.profile]) return err(req, res, 400, 'Profil d’IA inconnu.');
      S.G = E.setAi(S.G, body.id, body.profile || null); changed(); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/timer': {
      const m = Number(body.minutes);
      S.deadline = Number.isFinite(m) && m > 0 ? Date.now() + Math.round(m * 60000) : null;
      changed('srev'); return send(req, res, 200, { ok: true, deadline: S.deadline });
    }
    case '/api/admin/import': {
      const G = E.importSave(String(body.save || ''));
      if (!G.submitted) G.submitted = {};
      S = { ...S, G, prev: null, codes: newCodes(G), deadline: null };
      changed(); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/newcode': {
      if (!S.G || !S.G.firms.some((f) => f.id === body.id)) return err(req, res, 400, 'Équipe inconnue.');
      const used = new Set([ADMIN, ...Object.values(S.codes)]); let c; do c = genCode(6); while (used.has(c));
      S.codes = { ...S.codes, [body.id]: c }; changed(); return send(req, res, 200, { ok: true });
    }
    case '/api/admin/close':
      S = { ...S, G: null, prev: null, codes: {}, deadline: null }; changed(); return send(req, res, 200, { ok: true });
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
  const stop = () => { try { if (saveTimer) persistNow(); } catch { /* rien */ } process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
export { server, ADMIN };
