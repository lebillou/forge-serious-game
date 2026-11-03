// Outils de calibration.
//   node tools/sim.mjs trace                         trajectoire de référence (4 équipes passives, sans aléas)
//   node tools/sim.mjs tour [N] [scénario] [stratégies]   tournoi sur N graines, positions tournantes
//   ex. node tools/sim.mjs tour 40 standard balanced,premium,costLeader,passive,aggressive,cheap
//   node tools/sim.mjs sens [N] [scénario] [référence] [variantes]
//     sensibilité : chaque variante affronte trois copies de la référence sur N graines (position tournante).
//     La ligne « référence contre elle-même » donne le bruit : un écart dans son intervalle n'est pas significatif.
//   ex. node tools/sim.mjs sens 24 standard balanced balPrice105,balNoRD
import { play } from '../test/play.js';
import { STRATEGIES } from '../test/bots.js';

const mode = process.argv[2] || 'trace';
if (mode === 'trace') {
  const G = play(['passive', 'passive', 'passive', 'passive'], { seed: 3, nQuarters: 20, events: false, tenders: false, ma: false });
  const f = G.firms[0];
  console.log('trim   CA  EBITDA  EBIT    RN  tréso  dette  cours  pdmS   pdmP   rép  clim  TRS    charge serv   déf    techP  capa   prod   stS  stP');
  for (const h of f.history) {
    console.log([h.q, h.revenue, h.ebitda, h.ebit, h.ni, h.cash, h.debt, h.vps, h.shareS, h.shareP, h.rep, h.climate, h.trs, h.util, h.fill, h.escRate, h.techP, h.capEq, h.prodEq, h.invS, h.invP]
      .map((x, i) => (typeof x === 'number' ? (Math.abs(x) < 2 && i > 7 ? x.toFixed(3) : Math.round(x)) : x)).join(' '));
  }
  console.log('Concurrents :', G.npcs.map((n) => `${n.name} S ${Math.round(n.lastSales.S)} P ${Math.round(n.lastSales.P)} prix ${n.price.S.toFixed(2)}/${n.price.P.toFixed(2)}`).join(' | '));
} else if (mode === 'tour') {
  const N = Number(process.argv[3]) || 40;
  const scenario = process.argv[4] || 'standard';
  const strats = (process.argv[5] || 'passive,balanced,premium,costLeader,aggressive,cheap').split(',');
  for (const s of strats) if (!STRATEGIES[s]) { console.error(`Stratégie inconnue : ${s}`); process.exit(1); }
  // une partie compte au plus 6 équipes : au-delà, les stratégies en trop ne joueraient pas et fausseraient les moyennes
  if (strats.length < 2 || strats.length > 6) { console.error(`Un tournoi oppose 2 à 6 stratégies (${strats.length} demandées). Pour comparer davantage de variantes, utilisez le mode « sens ».`); process.exit(1); }
  const acc = Object.fromEntries(strats.map((s) => [s, { tsr: 0, wins: 0, rank: 0, ccc: 0 }]));
  for (let seed = 1; seed <= N; seed++) {
    const order = strats.map((_, i) => strats[(i + seed) % strats.length]);
    const G = play(order, { seed, nQuarters: 20, scenario });
    const ranked = [...G.firms].sort((a, b) => b.tsr - a.tsr);
    G.firms.forEach((f, i) => {
      const a = acc[order[i]];
      a.tsr += f.tsr / N; a.rank += (ranked.indexOf(f) + 1) / N;
      if (ranked[0] === f) a.wins++;
      if (f.history.some((h) => h.rating === 'CCC')) a.ccc++;
    });
  }
  console.log(`${N} parties, scénario ${scenario}`);
  for (const s of strats) console.log(s.padEnd(12), `TSR moyen ${(acc[s].tsr * 100).toFixed(1)} %`.padEnd(20), `rang moyen ${acc[s].rank.toFixed(2)}`.padEnd(17), `victoires ${acc[s].wins}`.padEnd(14), `notation CCC atteinte ${acc[s].ccc}`);
} else if (mode === 'sens') {
  const N = Number(process.argv[3]) || 24;
  const scenario = process.argv[4] || 'standard';
  const ref = process.argv[5] || 'balanced';
  const vars = (process.argv[6] || Object.keys(STRATEGIES).filter((k) => k.startsWith('bal') && k !== 'balanced').join(',')).split(',');
  for (const s of [ref, ...vars]) if (!STRATEGIES[s]) { console.error(`Stratégie inconnue : ${s}`); process.exit(1); }
  console.log(`${N} parties par variante contre 3 × ${ref}, scénario ${scenario}. Écart = TSR de la variante − TSR moyen des trois autres.`);
  for (const v of [ref, ...vars]) {
    const gaps = []; let wins = 0;
    for (let seed = 1; seed <= N; seed++) {
      const pos = seed % 4;
      const strats = [ref, ref, ref, ref]; strats[pos] = v;
      const G = play(strats, { seed, nQuarters: 20, scenario });
      const me = G.firms[pos].tsr;
      const others = G.firms.filter((_, i) => i !== pos).map((f) => f.tsr);
      gaps.push(me - others.reduce((a, b) => a + b, 0) / others.length);
      if (me > Math.max(...others)) wins++;
    }
    const m = gaps.reduce((a, b) => a + b, 0) / N;
    const se = Math.sqrt(gaps.reduce((a, g) => a + (g - m) ** 2, 0) / (N - 1) / N);
    const label = v === ref ? `${ref} (bruit)` : v;
    console.log(label.padEnd(18), `écart ${(m * 100).toFixed(1).padStart(7)} pts ± ${(1.96 * se * 100).toFixed(1).padStart(5)}`, `  1re place ${String(wins).padStart(2)}/${N}`, Math.abs(m) > 1.96 * se && v !== ref ? '  significatif' : '');
  }
} else {
  console.error('Mode inconnu. Utilisez « trace », « tour » ou « sens ».'); process.exit(1);
}
