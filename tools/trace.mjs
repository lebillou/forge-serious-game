// Trajectoire trimestrielle des indicateurs de chaque stratégie.
// Usage : node tools/trace.mjs premium,cheap,aggressive,passive [graine]
import { play } from '../test/play.js';

const strats = (process.argv[2] || 'premium,cheap,aggressive,passive').split(',');
if (strats.length < 2) { console.error('Indiquez au moins 2 stratégies séparées par des virgules.'); process.exit(1); }
const G = play(strats, { seed: Number(process.argv[3]) || 5, nQuarters: 20 });
const r = (x) => (typeof x === 'number' ? Math.round(x) : x);
for (const f of G.firms) {
  console.log(`\n== ${f.name}`);
  console.log('trim   CA  EBITDA     RN  tréso  découv   dette  cours  pdmS  pdmP  rép  clim  TRS  serv  déf%  techS  techP  lignes  opér  note');
  for (const h of f.history) {
    console.log([h.q, h.revenue, h.ebitda, h.ni, h.cash, h.overdraft, h.debt, h.vps, h.shareS * 100, h.shareP * 100, h.rep, h.climate,
      h.trs * 100, h.fill * 100, h.escRate * 100, h.techS, h.techP, h.lines, h.operators, h.rating].map(r).join(' '));
  }
  console.log('événements du dernier trimestre :', f.report.events.map((e) => e.kind).join(', ') || 'aucun');
}
