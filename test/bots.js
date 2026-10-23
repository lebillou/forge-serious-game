// Stratégies automatiques servant à tester et calibrer le moteur.
import { defaultDecisions, targetAsk, CFG, AI_PROFILES, aiPlanOps, aiProduction } from '../src/engine.js';

// Les cinq profils jouables par l'IA sont définis dans le moteur ; s'y ajoutent deux stratégies de test.
const planOps = aiPlanOps;
const production = aiProduction;

export const STRATEGIES = {
  ...Object.fromEntries(Object.entries(AI_PROFILES).map(([k, p]) => [k, p.decide])),

  cheap(G, f) {
    const d = defaultDecisions(G, f);
    d.price = { S: 0.88, P: 2.3 };
    d.marketing = { S: 50, P: 50 };
    d.rd = { S: 0, P: 0, process: 0 };
    d.maintenance = 50; d.training = 0; d.quality = 30;
    d.supplier = { A: 100, B: 0, C: 0 };
    d.salaryIndex = 0.9;
    production(G, f, d, 1.0);
    return planOps(G, f, d);
  },

  random(G, f, rnd = Math.random) {
    const d = defaultDecisions(G, f);
    const j = (x, a) => x * (1 + (rnd() * 2 - 1) * a);
    d.price = { S: j(1.0, 0.15), P: j(2.6, 0.15) };
    d.marketing = { S: j(200, 0.9), P: j(200, 0.9) };
    d.rd = { S: j(100, 1), P: j(200, 1), process: j(100, 1) };
    production(G, f, d, j(1.05, 0.2));
    d.maintenance = j(200, 0.9); d.training = j(60, 0.9); d.quality = j(120, 0.9);
    d.shifts = 1 + Math.floor(rnd() * 3);
    d.salaryIndex = j(1, 0.1);
    d.linesBuy = rnd() < 0.1 ? 1 : 0; if (d.linesBuy) d.loan = CFG.lineCost;
    d.linesSell = rnd() < 0.03 ? 1 : 0;
    d.supplier = { A: rnd() * 100, B: rnd() * 100, C: rnd() * 100 };
    d.dividend = rnd() < 0.2 ? rnd() * 1500 : 0;
    d.equity = rnd() < 0.05 ? 3000 : 0;
    d.repay = rnd() < 0.1 ? 2000 : 0;
    d.hedge = rnd() < 0.1;
    d.cert = rnd() < 0.1;
    d.study = rnd() < 0.3;
    if (G.tender && G.tender.status === 'open' && rnd() < 0.5) d.tenderBid = G.tender.maxPrice * j(0.93, 0.08);
    const tg = G.targets.find((t) => t.status === 'open');
    if (tg && rnd() < 0.15) { const ask = targetAsk(G, tg); d.loan += ask; d.acqBid = { targetId: tg.id, price: ask * j(1.1, 0.1) }; }
    d.hire = Math.floor(rnd() * 25); d.fire = rnd() < 0.1 ? Math.floor(rnd() * 15) : 0;
    return d;
  },
};

// variantes pour analyse de sensibilité (un seul paramètre modifié)
STRATEGIES.balPrice95 = (G, f) => { const d = STRATEGIES.balanced(G, f); d.price = { ...d.price, S: 0.95 }; return d; };
STRATEGIES.balProcess = (G, f) => { const d = STRATEGIES.balanced(G, f); d.rd = { ...d.rd, process: 450 }; return d; };
STRATEGIES.balNoRD = (G, f) => { const d = STRATEGIES.balanced(G, f); d.rd = { S: 0, P: 0, process: 0 }; return d; };
STRATEGIES.balPrice105 = (G, f) => { const d = STRATEGIES.balanced(G, f); d.price = { S: 1.05, P: 2.75 }; return d; };
STRATEGIES.balMkt = (G, f) => { const d = STRATEGIES.balanced(G, f); d.marketing = { S: 400, P: 400 }; return d; };
STRATEGIES.balNoMaint = (G, f) => { const d = STRATEGIES.balanced(G, f); d.maintenance = 40; return d; };
STRATEGIES.balNoQual = (G, f) => { const d = STRATEGIES.balanced(G, f); d.quality = 20; return d; };
STRATEGIES.balSupA = (G, f) => { const d = STRATEGIES.balanced(G, f); d.supplier = { A: 100, B: 0, C: 0 }; return d; };
STRATEGIES.balNoTrain = (G, f) => { const d = STRATEGIES.balanced(G, f); d.training = 0; return d; };
STRATEGIES.balLowSal = (G, f) => { const d = STRATEGIES.balanced(G, f); d.salaryIndex = 0.9; return d; };
STRATEGIES.balSupC = (G, f) => { const d = STRATEGIES.balanced(G, f); d.supplier = { A: 0, B: 0, C: 100 }; return d; };
STRATEGIES.balHighSal = (G, f) => { const d = STRATEGIES.balanced(G, f); d.salaryIndex = 1.08; return d; };
STRATEGIES.balHedge = (G, f) => { const d = STRATEGIES.balanced(G, f); d.hedge = true; return d; };
