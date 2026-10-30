// Assemble les pages de Forge.
//   dist/forge.html              version un poste pour claude.ai (React via cdnjs, sans en-tête de document)
//   dist/forge-un-poste.html     version un poste autonome (ouverture directe du fichier, paquet de version)
//   dist/site/                   la même page installable (manifeste, icônes, service worker) pour GitHub Pages
//   server/public/index.html     client de la version multi-poste
//   dist/app.test.js             paquet non minifié pour les tests d'interface
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (p) => path.join(ROOT, p);
const common = {
  bundle: true, format: 'iife', write: false, target: ['es2020'], legalComments: 'none',
  jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', loader: { '.jsx': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
};
const bundle = async (entry, minify = true) => (await build({ ...common, entryPoints: [r(entry)], minify })).outputFiles[0].text;
const inlineScript = (js) => js.replace(/<\/script/gi, '<\\/script');

const tpl = readFileSync(r('src/template.html'), 'utf8');
const cut = tpl.indexOf('<div id="app">');
const tplHead = tpl.slice(0, cut);
const standaloneCss = readFileSync(r('src/standalone.css'), 'utf8');
const standalone = (title, extraCss, js) => {
  const head = tplHead
    .replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    .replace('<title>Forge</title>', `<title>${title}</title>`)
    .replace('</style>', standaloneCss + extraCss + '</style>');
  const body = inlineScript(js);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${head}</head><body><div id="app"></div>\n<script>\n${body}\n</script></body></html>\n`;
};

mkdirSync(r('dist'), { recursive: true });
mkdirSync(r('server/public'), { recursive: true });

const out = {};
const artifactJs = inlineScript(await bundle('src/app.jsx'));
out['dist/forge.html'] = tpl.replace('/*__APP__*/', () => artifactJs);
out['dist/forge-un-poste.html'] = standalone('Forge', '', await bundle('src/hotseat-entry.js'));
out['server/public/index.html'] = standalone('Forge multi-poste', readFileSync(r('src/net-extra.css'), 'utf8'), await bundle('src/net-entry.js'));
out['dist/app.test.js'] = await bundle('src/app.jsx', false);

// Site GitHub Pages : page installable sur l'écran d'accueil (iPhone, iPad, Android) et jouable hors connexion.
// Le fichier autonome reste sans service worker : il doit pouvoir s'ouvrir directement depuis le disque.
const ICONS = [180, 192, 512];
const pwaHead = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<meta name="theme-color" content="#17202a">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Forge">',
  '<link rel="apple-touch-icon" href="icon-180.png">',
  '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">',
].join('\n') + '\n';
const swRegister = "<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});</script>";
const one = out['dist/forge-un-poste.html'];
const bodyEnd = one.lastIndexOf('</body>');
const sitePage = one.replace('</head>', pwaHead + '</head>').slice(0, bodyEnd + pwaHead.length) + swRegister + one.slice(bodyEnd);
const manifest = {
  name: 'Forge — gestion industrielle', short_name: 'Forge', lang: 'fr',
  description: 'Serious game de gestion industrielle en équipes, sur un même poste.',
  start_url: './', scope: './', display: 'standalone', orientation: 'any',
  background_color: '#e9edf1', theme_color: '#17202a',
  icons: [
    ...ICONS.map((n) => ({ src: `icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png', purpose: 'any' })),
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
// la version du service worker change avec la page : les postes installés récupèrent la nouvelle au lancement suivant
const version = createHash('sha256').update(sitePage).digest('hex').slice(0, 12);
mkdirSync(r('dist/site'), { recursive: true });
out['dist/site/index.html'] = sitePage;
out['dist/site/manifest.webmanifest'] = JSON.stringify(manifest, null, 2) + '\n';
out['dist/site/sw.js'] = readFileSync(r('src/pwa/sw.js'), 'utf8').replace('__VERSION__', version);
for (const n of ICONS) copyFileSync(r(`src/pwa/icon-${n}.png`), r(`dist/site/icon-${n}.png`));

for (const [p, content] of Object.entries(out)) {
  writeFileSync(r(p), content);
  if (p.endsWith('.html')) console.log(`${p.padEnd(28)} ${(content.length / 1024).toFixed(1)} Ko`);
}
