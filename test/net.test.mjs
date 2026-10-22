// Test de bout en bout de la version multi-poste : serveur réel + API + trois navigateurs jsdom.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA = mkdtempSync(path.join(tmpdir(), 'forge-'));
const ADMIN = 'PROF42';
let proc;
let serverErr = '';
const browsers = [];
const ql = (q) => `A${Math.floor((q - 1) / 4) + 1}·T${((q - 1) % 4) + 1}`;
const log = (m) => process.stdout.write(`· ${m}\n`);

function startServer() {
  return new Promise((resolve, reject) => {
    proc = spawn(process.execPath, ['server/server.mjs'], { env: { ...process.env, PORT: String(PORT), FORGE_DATA: DATA, FORGE_ADMIN: ADMIN }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', (d) => { out += d; if (out.includes('Code animateur')) resolve(out); });
    proc.stderr.on('data', (d) => { serverErr += d; process.stderr.write(d); });
    proc.on('exit', (c) => { if (!out.includes('Code animateur')) reject(new Error('serveur arrêté ' + c)); });
  });
}
const stopServer = () => new Promise((r) => { proc.once('exit', r); proc.kill('SIGTERM'); });

async function call(p, { method = 'GET', body, code } = {}) {
  const res = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(code ? { 'X-Forge-Code': code } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, timeout = 8000) {
  const t0 = Date.now();
  for (;;) { try { const v = await fn(); if (v) return v; } catch { /* réessayer */ } if (Date.now() - t0 > timeout) throw new Error('délai dépassé : ' + label); await tick(60); }
}

function browser(name) {
  const errors = [];
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { url: BASE + '/', pretendToBeVisual: true });
  return { dom, name, errors, async open() {
    const html = await (await fetch(BASE + '/')).text();
    const d = new JSDOM(html, { url: BASE + '/', runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(w) {
      w.fetch = (u, o) => fetch(u, o); w.scrollTo = () => {};
      w.console.error = (...a) => errors.push(a.map(String).join(' '));
      w.console.warn = (...a) => errors.push('WARN ' + a.map(String).join(' '));
      w.addEventListener('error', (e) => errors.push('erreur : ' + e.message));
    } });
    this.dom = d; this.w = d.window; this.doc = d.window.document; browsers.push(this); return this;
  },
  $(s) { return this.doc.querySelector(s); }, $$(s) { return [...this.doc.querySelectorAll(s)]; },
  text() { const a = this.doc.getElementById('app'); return a ? a.textContent : ''; },
  btn(t) { return this.$$('button').find((b) => b.textContent.trim().startsWith(t)); },
  async click(el, label) { if (!el) throw new Error(`${this.name} : introuvable ${label}`); el.dispatchEvent(new this.w.MouseEvent('click', { bubbles: true })); await tick(30); },
  async type(sel, val) {
    const el = this.$(sel); if (!el) throw new Error(`${this.name} : champ ${sel}`);
    const proto = el.tagName === 'TEXTAREA' ? this.w.HTMLTextAreaElement.prototype : this.w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val); el.dispatchEvent(new this.w.Event('input', { bubbles: true })); await tick(20);
  },
  async submit(sel) { this.$(sel).dispatchEvent(new this.w.Event('submit', { bubbles: true, cancelable: true })); await tick(30); },
  check() { if (this.errors.length) throw new Error(`${this.name} : ${this.errors.join(' | ')}`); },
  close() { this.w.close(); } };
}

try {
  await startServer();
  log('serveur démarré');
  // ----- API -----
  assert.equal((await call('/api/login', { method: 'POST', body: { code: 'XXXX' } })).status, 401);
  assert.equal((await call('/api/login', { method: 'POST', body: { code: ADMIN.toLowerCase() } })).data.role, 'admin');
  assert.equal((await call('/api/view')).status, 401);
  let r = await call('/api/admin/new', { method: 'POST', code: ADMIN, body: { teams: ['Rouge', 'Bleu', 'Vert'], nQuarters: 6, seed: 7 } });
  assert.equal(r.status, 200);
  let adm = (await call('/api/view', { code: ADMIN })).data;
  const codes = adm.codes; const ids = adm.G.firms.map((f) => f.id);
  assert.equal(new Set(Object.values(codes)).size, 3);
  const tv = (await call('/api/view', { code: codes[ids[0]] })).data;
  assert.equal(tv.role, 'team'); assert.equal(tv.firmId, ids[0]);
  assert.equal(tv.G.seed, 0); assert.equal(tv.G.rng, 0);
  const other = tv.G.firms.find((f) => f.id === ids[1]);
  for (const k of ['cash', 'debt', 'lines', 'tech', 'operators', 'kits', 'inv', 'climate']) assert.equal(other[k], undefined, `fuite : ${k}`);
  assert.ok(tv.G.firms.find((f) => f.id === ids[0]).cash > 0);
  assert.equal((await call('/api/admin/resolve', { method: 'POST', code: codes[ids[0]] })).status, 403);
  assert.equal((await call('/api/decisions', { method: 'PUT', code: codes[ids[0]], body: { q: 9, decisions: {} } })).status, 409);
  log('API : authentification, rôles, confidentialité des vues');

  // ----- navigateurs -----
  const A = await browser('animateur').open();
  const T1 = await browser('équipe Rouge').open();
  const T2 = await browser('équipe Bleu').open();
  for (const [b, c] of [[A, ADMIN], [T1, codes[ids[0]]], [T2, codes[ids[1]]]]) {
    await until(() => b.$('#login-code'), b.name + ' connexion');
    await b.type('#login-code', c); await b.submit('form');
  }
  await until(() => A.text().includes('Décisions — A1·T1'), 'hub animateur');
  await until(() => T1.text().includes('Votre situation de départ'), 'console Rouge');
  await until(() => T2.text().includes('Votre situation de départ'), 'console Bleu');
  assert.ok(!T1.text().includes('Bleu') || !T1.text().includes(String(codes[ids[1]])), 'code d’une autre équipe visible');
  log('connexion des trois postes');

  // minuteur
  await A.type('#timer-min', '12'); await A.click(A.btn('Lancer'), 'minuteur');
  await until(() => T1.$('.countdown'), 'minuteur côté équipe');
  log('minuteur propagé aux équipes');

  for (let q = 1; q <= 6; q++) {
    for (const [T, i] of [[T1, 0], [T2, 1]]) {
      await until(() => T.$$('.tab').some((b) => b.textContent === 'Décisions'), T.name + ' onglets');
      await T.click(T.$$('.tab').find((b) => b.textContent === 'Décisions'), 'décisions');
      await until(() => T.$('#price-S'), 'formulaire');
      await T.type('#price-S', String(990 + 30 * i + q));
      await T.type('#mkt-P', String(240 + 40 * i + q));
      if (q === 2 && i === 0) { await T.type('#loan', '6500'); await T.type('#lines-buy', '1'); }
      if (T.$('#tender-on') && i === 1) { T.$('#tender-on').click(); await tick(20); }
      await until(() => T.text().includes('Brouillon enregistré'), T.name + ' enregistrement auto', 4000);
      if (!(q === 3 && i === 1)) {
        await T.click(T.btn('Valider mes décisions') || T.btn('Valider de nouveau'), 'valider');
        await until(() => T.$('.chip-ok') && T.$('.chip-ok').textContent === 'Validé', T.name + ' validé');
      }
    }
    const want = q === 3 ? '1 / 3 validées' : '2 / 3 validées';
    await until(() => A.text().includes(want), 'compteur animateur T' + q);
    // l'animateur voit le brouillon non validé
    if (q === 3) await until(() => A.$$('.andon-row')[1].textContent.includes('Brouillon'), 'brouillon visible');
    await A.click(A.btn('Résoudre le trimestre'), 'résoudre');
    await A.click(A.btn('Résoudre quand même'), 'confirmer');
    await until(() => A.$('.modal h3') && A.$('.modal h3').textContent.includes('résolu'), 'résultat T' + q);
    if (q === 2) {
      await A.click(A.btn('Continuer'), 'continuer');
      await A.click(A.btn('Annuler la dernière résolution'), 'annuler');
      await until(() => A.text().includes('Décisions — A1·T2'), 'annulation');
      // les validations sont restaurées
      await until(() => A.text().includes('2 / 3 validées'), 'validations restaurées');
      await A.click(A.btn('Résoudre le trimestre'), 'résoudre bis');
      await A.click(A.btn('Résoudre quand même'), 'confirmer bis');
      await until(() => A.$('.modal h3') && A.$('.modal h3').textContent.includes('résolu'), 'résultat bis');
      await tick(3200); // laisser les postes observer l'annulation puis la nouvelle résolution
    }
    if (q < 6) await A.click(A.btn('Continuer'), 'continuer');
    else await A.click(A.btn('Débriefing final'), 'débriefing');
    // les deux équipes doivent afficher le nouveau trimestre avant toute saisie (sondage toutes les 2,5 s)
    const next = q < 6 ? `Décisions pour ${ql(q + 1)}` : 'Partie terminée';
    for (const T of [T1, T2]) await until(() => (T.$('.console-head .muted')?.textContent || '').startsWith(next), `${T.name} : passage à ${next}`, 12000);
    if (q === 4) {
      // redémarrage du serveur en cours de partie
      await stopServer(); await startServer();
      await tick(3000); // au moins un sondage de chaque poste pendant ou après la coupure
      for (const T of [T1, T2]) await until(() => !T.$('.conn-lost') && (T.$('.console-head .muted')?.textContent || '').startsWith(`Décisions pour ${ql(5)}`), `${T.name} : reconnexion`, 12000);
      log('redémarrage du serveur : reprise transparente');
    }
    log(`trimestre ${q} joué`);
  }
  await until(() => A.text().includes('Distinctions'), 'débriefing animateur');
  await T1.click(T1.$$('.tab').find((b) => b.textContent === 'Débriefing'), 'onglet débriefing');
  await until(() => T1.text().includes('Tableau comparatif'), 'débriefing équipe');
  for (const t of ['Production', 'Marché', 'Finances', 'Historique', 'Classement']) await T1.click(T1.$$('.tab').find((b) => b.textContent === t), t);
  log('débriefing côté animateur et côté équipe');

  // vue finale complète et export
  const fin = (await call('/api/view', { code: codes[ids[1]] })).data;
  assert.equal(fin.G.phase, 'finished');
  assert.ok(fin.G.firms.find((f) => f.id === ids[0]).cash !== undefined, 'données révélées en fin de partie');
  const exp = await fetch(BASE + '/api/admin/export', { headers: { 'X-Forge-Code': ADMIN } });
  const saveText = await exp.text();
  assert.equal(exp.status, 200);
  r = await call('/api/admin/import', { method: 'POST', code: ADMIN, body: { save: saveText } });
  assert.equal(r.status, 200);
  const adm2 = (await call('/api/view', { code: ADMIN })).data;
  assert.notEqual(adm2.codes[ids[0]], codes[ids[0]], 'codes régénérés à l’import');
  await until(() => T1.text().includes('n’est plus valable'), 'équipe déconnectée après import');
  log('export / import (codes régénérés, anciennes sessions invalidées)');

  for (const b of [A, T1, T2]) b.check();
  log('aucune erreur ni avertissement React sur les trois postes');
  for (const b of [A, T1, T2]) b.close();
} catch (e) {
  // Annotation GitHub Actions : la cause s'affiche dans le résumé de l'exécution.
  const shot = browsers.map((b) => { try { return `${b.name} : [état ${b.doc.querySelector('.save-state')?.textContent || b.doc.querySelector('.chip-ok')?.textContent || '-'} | toast ${b.doc.querySelector('.toast')?.textContent || '-'} | bandeau ${b.doc.querySelector('.conn-lost') ? 'connexion perdue' : 'non'} | ${b.doc.querySelector('.console-head .muted')?.textContent || ''}]`; } catch { return ''; } }).join(' || ');
  const msg = [`${e.message}`, (e.stack || '').split('\n').slice(1, 3).join(' '), shot && `Écrans : ${shot}`, serverErr && `Serveur : ${serverErr.slice(-400)}`,
    browsers.some((b) => b.errors.length) && `Console : ${browsers.map((b) => b.errors.join(' | ')).join(' || ').slice(0, 400)}`].filter(Boolean).join(' — ');
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Test multi-poste::${msg.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A')}`);
  throw e;
} finally {
  if (proc && proc.exitCode === null) await stopServer();
  rmSync(DATA, { recursive: true, force: true });
}
