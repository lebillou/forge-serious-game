// Assemble les pages de Forge.
//   dist/forge.html              version un poste pour claude.ai (React via cdnjs, sans en-tête de document)
//   dist/forge-un-poste.html     version un poste autonome (GitHub Pages, ouverture directe du fichier)
//   server/public/index.html     client de la version multi-poste
//   dist/app.test.js             paquet non minifié pour les tests d'interface
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
for (const [p, content] of Object.entries(out)) {
  writeFileSync(r(p), content);
  if (!p.endsWith('.js')) console.log(`${p.padEnd(28)} ${(content.length / 1024).toFixed(1)} Ko`);
}
