import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'https://example.test/', pretendToBeVisual: true });
const { window } = dom;
globalThis.window = window; globalThis.document = window.document; Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.localStorage = window.localStorage; globalThis.HTMLElement = window.HTMLElement; globalThis.FileReader = window.FileReader;
window.scrollTo = () => {};
const errors = [];
const origErr = console.error, origWarn = console.warn;
console.error = (...a) => { errors.push(a.map(String).join(' ')); };
console.warn = (...a) => { errors.push('WARN ' + a.map(String).join(' ')); };
window.addEventListener('error', (e) => errors.push('window error: ' + e.message));
globalThis.React = require('react');
globalThis.ReactDOM = { ...require('react-dom'), ...require('react-dom/client') };
window.React = globalThis.React; window.ReactDOM = globalThis.ReactDOM;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const flush = async () => { for (let i = 0; i < 4; i++) await tick(0); };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const btn = (txt) => $$('button').find((b) => b.textContent.trim().startsWith(txt));
const click = async (el, label) => { if (!el) throw new Error('élément introuvable : ' + label); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await flush(); };
const type = async (sel, val) => {
  const el = $(sel); if (!el) throw new Error('champ introuvable ' + sel);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, val); el.dispatchEvent(new window.Event('input', { bubbles: true })); await flush();
};
const check = async (sel) => { const el = $(sel); if (!el) throw new Error('case introuvable ' + sel); el.click(); await flush(); };

new Function(readFileSync('dist/app.test.js', 'utf8'))();
await flush();
const step = (m) => { process.stdout.write(`· ${m}\n`); if (errors.length) { console.log = origErr; origErr('ERREURS:', errors); process.exit(1); } };
if (!document.body.textContent.includes('Nouvelle partie')) throw new Error('accueil absent');
step('accueil');
await click(btn('Nouvelle partie'), 'nouvelle partie');
await click($$('.seg-btn').find((b) => b.textContent === '3'), '3 équipes');
await click($$('.seg-btn').find((b) => b.textContent === '8 trim.'), '8 trimestres');
await type('#seed', '42');
await click(btn('Lancer la partie'), 'lancer');
if (!document.body.textContent.includes('Décisions — A1·T1')) throw new Error('hub absent');
step('paramétrage → hub');
for (let q = 1; q <= 8; q++) {
  const teams = $$('.andon-row').length;
  for (let i = 0; i < teams; i++) {
    if (q === 3 && i === 2) continue; // une équipe oublie de valider
    await click($$('.andon-row')[i].querySelector('button'), 'ouvrir console');
    await click(btn('Afficher la console'), 'afficher');
    for (const t of ['Production', 'Marché', 'Finances', 'Historique', 'Synthèse']) await click($$('.tab').find((b) => b.textContent === t), t);
    await click($$('.tab').find((b) => b.textContent === 'Décisions'), 'décisions');
    await type('#price-S', String(980 + i * 20));
    await type('#mkt-P', '260');
    if (q === 2 && i === 0) { await type('#loan', '7000'); await type('#lines-buy', '1'); await check('#cert'); await check('#study'); }
    if (q === 4 && i === 1) { await click($$('.seg-btn').find((b) => b.textContent === '3×8'), '3x8'); await type('#hire', '40'); }
    if ($('#tender-on') && i === 1) { await check('#tender-on'); }
    const bid = $$('input[id^="bid-"]').find((x) => x.type === 'checkbox');
    if (bid && i === 0 && q >= 3) { await check('#' + bid.id); await type('#loan', '12000'); }
    if (q === 5 && i === 2) { await type('#fire', '30'); await type('#salary', '90'); await type('#dividend', '500'); }
    await click(btn('Valider et masquer') || btn('Décisions validées'), 'valider');
  }
  await click(btn('Résoudre le trimestre'), 'résoudre');
  if (q === 3) await click(btn('Résoudre quand même'), 'confirmer');
  if (!document.body.textContent.includes('résolu')) throw new Error('résultat absent T' + q);
  if (q === 2) { // annulation puis re-résolution
    await click(btn('Continuer'), 'continuer');
    await click(btn('Annuler la dernière résolution'), 'annuler');
    if (!document.body.textContent.includes('Décisions — A1·T2')) throw new Error('annulation KO');
    await click(btn('Résoudre le trimestre'), 'résoudre bis');
  }
  if (q < 8) await click(btn('Continuer'), 'continuer'); else await click(btn('Débriefing final'), 'débriefing');
  step(`trimestre ${q} résolu`);
}
if (!document.body.textContent.includes('Distinctions')) throw new Error('débriefing absent');
step('débriefing');
await click($$('button').find((b) => b.textContent === 'Comptes détaillés'), 'comptes');
await click(btn('Afficher la console'), 'afficher');
for (const t of ['Production', 'Marché', 'Finances', 'Historique']) await click($$('.tab').find((b) => b.textContent === t), t);
await click(btn('Fermer'), 'fermer');
step('console après la partie');
await click(btn('Sauvegarder'), 'sauvegarder'); await tick(50); await flush();
if (!document.body.textContent.includes('Sauvegarder la partie')) throw new Error('dialogue sauvegarde absent');
await click(btn('Copier le code de sauvegarde'), 'copier');
const code = $('#save-code').value;
await click($$('.modal-actions button').find((b) => b.textContent === 'Fermer'), 'fermer dialog');
step('sauvegarde (code de ' + Math.round(code.length / 1024) + ' Ko)');
await click(btn('Règles'), 'règles'); if (!document.body.textContent.includes('Finance et valorisation')) throw new Error('règles');
await click(btn('Retour'), 'retour');
await click(btn('Accueil'), 'accueil');
if (!btn('Reprendre la partie en cours')) throw new Error('reprise absente (autosave)');
step('accueil avec reprise');
// import du code collé
const det = $('details'); det.open = true;
const ta = $('#paste-save'); const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
setter.call(ta, code); ta.dispatchEvent(new window.Event('input', { bubbles: true })); await flush();
await click($$('button').find((b) => b.textContent === 'Charger'), 'charger');
if (!document.body.textContent.includes('Distinctions')) throw new Error('import KO');
step('import du code de sauvegarde');
const G = JSON.parse(code).game;
console.log = origErr;
console.log(`Partie : ${G.firms.map((f) => `${f.name} TSR ${(f.tsr * 100).toFixed(0)}% acq [${f.acquisitions.map((a) => a.name)}] lignes ${f.lines.length} cert ${f.cert.status}`).join(' | ')}`);
console.log('erreurs/avertissements React :', errors.length);
process.exit(errors.length ? 1 : 0);
