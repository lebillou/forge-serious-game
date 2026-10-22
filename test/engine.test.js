import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, resolveQuarter, sanitize, defaultDecisions, finalDebrief, exportSave, importSave, injectEvent, GLOBAL_EVENTS, balanceSheet, bookEquity } from '../src/engine.js';
import { play, deepFinite } from './play.js';

test('nouvelle partie : bilan équilibré, valorisation positive', () => {
  const G = newGame({ teams: ['A', 'B', 'C'], seed: 7 });
  for (const f of G.firms) {
    const bs = balanceSheet(f);
    assert.ok(Math.abs(bs.assets - bs.liabilities - bs.equity) < 1e-6);
    assert.ok(f.vps > 10 && f.vps < 80, `vps ${f.vps}`);
  }
  for (const n of G.npcs) for (const s of n.segs) assert.ok(n.presence[s] > 0);
});

test('bilan équilibré et valeurs finies à chaque trimestre (toutes stratégies, 30 graines)', () => {
  const strats = ['passive', 'balanced', 'premium', 'cheap', 'aggressive', 'random'];
  for (let seed = 1; seed <= 30; seed++) {
    for (const scenario of ['stable', 'standard', 'volatil']) {
      play(strats, {
        seed, scenario, nQuarters: 16,
        check(G) {
          for (const f of G.firms) {
            const bs = balanceSheet(f);
            const diff = bs.assets - bs.liabilities - bs.equity;
            assert.ok(Math.abs(diff) < 1e-3, `écart bilan ${diff} (${f.name}, T${G.t}, graine ${seed})`);
            assert.ok(f.cash >= -1e-9 && f.overdraft >= -1e-9 && f.kits >= -1e-9 && f.inv.S >= -1e-9 && f.inv.P >= -1e-9);
            assert.ok(f.operators >= 0 && f.lines.length >= 1);
            deepFinite(f.report, f.name);
            deepFinite(f.history[f.history.length - 1], f.name);
          }
        },
      });
    }
  }
});

test('déterminisme : même graine, même partie', () => {
  const a = play(['balanced', 'random', 'premium'], { seed: 42 });
  const b = play(['balanced', 'random', 'premium'], { seed: 42 });
  assert.equal(JSON.stringify(a.firms.map((f) => f.history)), JSON.stringify(b.firms.map((f) => f.history)));
});

test('sauvegarde : export / import puis reprise identique', () => {
  let G = newGame({ teams: ['A', 'B'], seed: 3, nQuarters: 8 });
  for (let i = 0; i < 3; i++) G = resolveQuarter(G, {});
  const H = importSave(exportSave(G));
  const g1 = resolveQuarter(G, {}); const g2 = resolveQuarter(H, {});
  assert.equal(JSON.stringify(g1.firms), JSON.stringify(g2.firms));
  assert.throws(() => importSave('{"a":1}'));
});

test('assainissement des décisions : entrées aberrantes bornées', () => {
  const G = newGame({ teams: ['A', 'B'], seed: 2 });
  const f = G.firms[0];
  const d = sanitize(G, f, { price: { S: -5, P: 'abc' }, production: { S: 1e9 }, shifts: 9, fire: 1e6, hire: 3, supplier: { A: 0, B: 0, C: 0 }, linesSell: 99, acqBid: { targetId: 'durand', price: 1 } });
  assert.equal(d.price.S, 0.5);
  assert.equal(d.price.P, defaultDecisions(G, f).price.P);
  assert.equal(d.shifts, 3);
  assert.ok(d.fire <= f.operators);
  assert.equal(d.supplier.B, 100);
  assert.equal(d.linesSell, f.lines.length - 1);
  assert.equal(d.acqBid, null); // cible pas encore ouverte
  assert.equal(d.hire, 0);
});

test("tous les événements injectables s'appliquent sans erreur", () => {
  for (const id of Object.keys(GLOBAL_EVENTS)) {
    let G = newGame({ teams: ['A', 'B', 'C'], seed: 5, nQuarters: 10 });
    G = injectEvent(G, id);
    G = resolveQuarter(G, {});
    G = resolveQuarter(G, {});
    assert.ok(G.news.some((n) => n.text.includes(GLOBAL_EVENTS[id].label)), id);
  }
});

test('acquisition : transfert des lignes, sortie du marché, goodwill', () => {
  let G = newGame({ teams: ['A', 'B'], seed: 9, nQuarters: 12 });
  G = resolveQuarter(G, {}); G = resolveQuarter(G, {});
  const tg = G.targets.find((t) => t.id === 'durand');
  assert.equal(tg.status, 'open');
  const f = G.firms[0];
  const d = defaultDecisions(G, f);
  d.loan = 12000; d.acqBid = { targetId: 'durand', price: 11000 };
  const linesBefore = f.lines.length;
  const G2 = resolveQuarter(G, { [f.id]: d });
  const f2 = G2.firms[0];
  if (G2.targets.find((t) => t.id === 'durand').status === 'sold') {
    assert.equal(f2.lines.length, linesBefore + 2);
    assert.ok(f2.goodwill > 0);
    assert.equal(G2.npcs.find((n) => n.id === 'durand').acquiredBy, f.id);
  } else {
    assert.fail('acquisition non réalisée : ' + f2.report.notes.join(' | '));
  }
});

test('fin de partie et débriefing', () => {
  const G = play(['balanced', 'cheap', 'premium', 'aggressive'], { seed: 11, nQuarters: 12 });
  assert.equal(G.phase, 'finished');
  const D = finalDebrief(G);
  assert.equal(D.teams.length, 4);
  assert.ok(D.awards.every((a) => a.team));
  assert.throws(() => resolveQuarter(G, {}));
});
