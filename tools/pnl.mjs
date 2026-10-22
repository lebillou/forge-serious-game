// Compte de résultat trimestriel moyen par stratégie automatique.
// Usage : node tools/pnl.mjs balanced,premium,costLeader,passive [graine]
import * as E from '../src/engine.js';
import { STRATEGIES } from '../test/bots.js';
import { mulberry } from '../test/play.js';

const strats = (process.argv[2] || 'balanced,premium,costLeader,passive').split(',');
const seed = Number(process.argv[3]) || 5;
if (strats.length < 2) { console.error('Indiquez au moins 2 stratégies séparées par des virgules.'); process.exit(1); }
for (const s of strats) if (!STRATEGIES[s]) { console.error(`Stratégie inconnue : ${s}. Disponibles : ${Object.keys(STRATEGIES).join(', ')}`); process.exit(1); }
const keys = ['revenue', 'cogs', 'scrap', 'labor', 'selling', 'hr', 'marketing', 'rd', 'maintenance', 'quality', 'training', 'cert', 'overhead',
  'warranty', 'holding', 'incidents', 'penalties', 'integration', 'ebitda', 'dep', 'interest', 'ni'];
const rnd = mulberry(seed);
let G = E.newGame({ teams: strats, nQuarters: 20, seed });
const tot = strats.map(() => Object.fromEntries(keys.map((k) => [k, 0])));
const ev = strats.map(() => ({}));
while (G.phase !== 'finished') {
  const d = {};
  G.firms.forEach((f, i) => { d[f.id] = STRATEGIES[strats[i]](G, f, rnd); });
  G = E.resolveQuarter(G, d);
  G.firms.forEach((f, i) => {
    for (const k of keys) tot[i][k] += f.report.pnl[k] || 0;
    for (const e of f.report.events) ev[i][e.kind] = (ev[i][e.kind] || 0) + 1;
  });
}
const n = G.t;
console.log('poste'.padEnd(12), strats.map((s) => s.padStart(12)).join(''));
for (const k of keys) console.log(k.padEnd(12), tot.map((t) => String(Math.round(t[k] / n)).padStart(12)).join(''));
console.log('\nincidents', JSON.stringify(ev));
console.log('TSR final', G.firms.map((f) => `${(f.tsr * 100).toFixed(0)} %`).join(' | '));
