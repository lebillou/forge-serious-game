// Version un poste autonome (GitHub Pages) : la page complète se charge et se joue sans claude.ai.
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/forge-un-poste.html', import.meta.url), 'utf8');
const errors = [];
const dom = new JSDOM(html, { url: 'https://exemple.github.io/forge/', runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(w) {
  w.scrollTo = () => {};
  w.console.error = (...a) => errors.push(a.map(String).join(' '));
  w.console.warn = (...a) => errors.push('WARN ' + a.map(String).join(' '));
  w.addEventListener('error', (e) => errors.push('erreur : ' + e.message));
} });
const w = dom.window, doc = w.document;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const $$ = (s) => [...doc.querySelectorAll(s)];
const btn = (t) => $$('button').find((b) => b.textContent.trim().startsWith(t));
const click = async (el, label) => { if (!el) throw new Error('introuvable : ' + label); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await tick(20); };
const appText = () => doc.getElementById('app').textContent;
const fail = (m) => { console.error('ÉCHEC :', m, errors); process.exit(1); };

await tick(50);
if (doc.compatMode !== 'CSS1Compat') fail('mode quirks');
if (!appText().includes('Nouvelle partie')) fail('accueil absent');
if (btn('Sauvegardes en ligne')) fail('bouton de sauvegarde en ligne visible hors claude.ai');
await click(btn('Nouvelle partie'), 'nouvelle partie');
await click(btn('Lancer la partie'), 'lancer');
await click(btn('Résoudre le trimestre'), 'résoudre');
await click(btn('Résoudre quand même'), 'confirmer');
if (!appText().includes('A1·T1 résolu')) fail('résolution : ' + (doc.querySelector('.toast')?.textContent || '?'));
await click(btn('Continuer'), 'continuer');
await click(btn('Sauvegarder'), 'sauvegarder');
await tick(30);
if (appText().includes('Sauvegarde en ligne')) fail('rubrique en ligne affichée hors claude.ai');
if (!btn('Télécharger le fichier .json')) fail('téléchargement classique absent');
if (errors.length) fail('erreurs console');
console.log('· version autonome : chargement en mode standard, partie jouable, sauvegarde par fichier');
w.close();
