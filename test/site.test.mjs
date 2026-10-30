// Site GitHub Pages (dist/site) : page installable, manifeste, icônes, service worker versionné.
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const D = 'dist/site/';
const page = readFileSync(D + 'index.html', 'utf8');
const manifest = JSON.parse(readFileSync(D + 'manifest.webmanifest', 'utf8'));
const sw = readFileSync(D + 'sw.js', 'utf8');
assert.ok(page.includes('<link rel="manifest" href="manifest.webmanifest">') && page.includes('apple-touch-icon'), 'balises d’installation');
assert.ok(page.includes("navigator.serviceWorker.register('sw.js')"), 'enregistrement du service worker');
assert.equal(page.match(/<\/head>/g).length >= 1 && page.indexOf('rel="manifest"') < page.indexOf('</head>'), true);
assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, './');
for (const i of manifest.icons) assert.ok(existsSync(D + i.src), 'icône ' + i.src);
assert.ok(existsSync(D + 'icon-180.png'));
assert.match(sw, /const VERSION = '[0-9a-f]{12}';/, 'version du service worker');
assert.ok(!readFileSync('dist/forge-un-poste.html', 'utf8').includes('serviceWorker'), 'fichier autonome sans service worker');
process.stdout.write('· site installable : manifeste, icônes, service worker versionné\n');
