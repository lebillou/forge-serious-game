// Prépare les fichiers distribuables dans release/ (lancer après « npm run build »).
//   release/forge-multiposte/    dossier prêt à zipper pour les animateurs
//   release/forge-un-poste.html  version un poste autonome
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (p) => path.join(ROOT, p);
for (const p of ['server/public/index.html', 'dist/forge-un-poste.html']) {
  if (!existsSync(r(p))) { console.error(`${p} manquant : lancez d'abord « npm run build ».`); process.exit(1); }
}
const { version } = JSON.parse(readFileSync(r('package.json'), 'utf8'));
const out = r('release/forge-multiposte');
rmSync(r('release'), { recursive: true, force: true });
mkdirSync(path.join(out, 'public'), { recursive: true });

copyFileSync(r('server/server.mjs'), path.join(out, 'server.mjs'));
copyFileSync(r('src/engine.js'), path.join(out, 'engine.js'));
copyFileSync(r('server/public/index.html'), path.join(out, 'public/index.html'));
copyFileSync(r('distrib/LISEZMOI.md'), path.join(out, 'LISEZMOI.md'));
// fins de ligne imposées quel que soit le système qui a extrait le dépôt
const bat = readFileSync(r('distrib/lancer-windows.bat'), 'utf8').replace(/\r?\n/g, '\r\n');
writeFileSync(path.join(out, 'lancer-windows.bat'), bat);
const cmd = readFileSync(r('distrib/lancer-mac.command'), 'utf8').replace(/\r\n/g, '\n');
writeFileSync(path.join(out, 'lancer-mac.command'), cmd);
try { chmodSync(path.join(out, 'lancer-mac.command'), 0o755); } catch { /* sans effet sous Windows */ }
writeFileSync(path.join(out, 'package.json'), JSON.stringify({
  name: 'forge-multiposte', version, private: true, type: 'module',
  description: 'Forge, serious game de gestion industrielle, version multi-poste',
  scripts: { start: 'node server.mjs' }, engines: { node: '>=18' },
}, null, 2) + '\n');
copyFileSync(r('dist/forge-un-poste.html'), r('release/forge-un-poste.html'));
console.log(`release/ prêt (version ${version}) : forge-multiposte/ et forge-un-poste.html`);
