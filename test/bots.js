// Stratégies automatiques servant à tester et calibrer le moteur.
import { defaultDecisions, forecastDemand, preview, loanCapacity, targetAsk, CFG, eqOf, kitsOf } from '../src/engine.js';

function planOps(G, f, d, allowFire = false) {
  const pv = preview(G, f, d);
  const avail = f.operators - pv.quitsEst;
  const gap = pv.needed - avail;
  d.hire = Math.max(0, Math.min(pv.maxHires, Math.ceil(gap)));
  d.fire = allowFire && gap < -6 ? Math.floor(-gap - 3) : 0;
  return d;
}

function chooseShifts(G, f, d) {
  // hystérésis : on monte dès que nécessaire, on ne redescend que si la capacité excède le plan de 30 %
  const cur = f.shifts;
  const capAt = (s) => { const x = { ...d, shifts: s }; return preview(G, f, x).grossCapEq; };
  const plan = preview(G, f, d).planEq;
  let s = cur;
  while (s < 3 && capAt(s) < plan * 1.02) s++;
  if (s === cur && s > 1 && capAt(s - 1) > plan * 1.3) s--;
  d.shifts = s;
  return s;
}

function production(G, f, d, cover = 1.08) {
  const fc = forecastDemand(G, f);
  d.production = { S: Math.max(0, Math.round(fc.S * cover - f.inv.S)), P: Math.max(0, Math.round(fc.P * cover - f.inv.P)) };
  const need = kitsOf(d.production);
  d.kitsOrder = Math.max(0, Math.round(need * 1.12 - f.kits + 1500));
  return d;
}

export const STRATEGIES = {
  passive(G, f) { return defaultDecisions(G, f); },

  balanced(G, f) {
    const d = defaultDecisions(G, f);
    production(G, f, d);
    const pv = preview(G, f, d);
    if (pv.loadPct > 0.97 && G.t < G.settings.nQuarters - 6) {
      if (pv.loanCap + f.cash > CFG.lineCost + 1500) { d.linesBuy = 1; d.loan = Math.max(0, CFG.lineCost - Math.max(0, f.cash - 2000)); }
    }
    d.maintenance = 55 * (f.lines.length + f.pending.length);
    d.training = 0.55 * f.operators;
    d.quality = Math.max(80, 0.014 * eqOf(d.production));
    d.rd = { S: 120, P: 250, process: 150 };
    if (G.t === 2) d.cert = true;
    if (G.tender && G.tender.status === 'open') d.tenderBid = Math.round(G.tender.maxPrice * 0.95 * 100) / 100;
    if (f.cash > 6000 && f.surveillance === 0) d.dividend = Math.round((f.cash - 5000) * 0.5);
    return planOps(G, f, d);
  },

  premium(G, f) {
    const d = defaultDecisions(G, f);
    d.price = { S: 1.0, P: 2.85 };
    d.marketing = { S: 150, P: 380 };
    d.rd = { S: 60, P: 500, process: 100 };
    d.supplier = { A: 0, B: 40, C: 60 };
    production(G, f, d);
    if (G.t === 0) d.cert = true;
    d.quality = Math.max(120, 0.02 * eqOf(d.production));
    d.training = 0.8 * f.operators;
    d.maintenance = 70 * f.lines.length;
    const pv = preview(G, f, d);
    if (pv.loadPct > 0.97 && G.t < G.settings.nQuarters - 6 && pv.loanCap > CFG.lineCost) { d.linesBuy = 1; d.loan = CFG.lineCost; }
    return planOps(G, f, d);
  },

  costLeader(G, f) {
    const d = defaultDecisions(G, f);
    d.price = { S: 0.95, P: 2.55 };
    d.marketing = { S: 220, P: 140 };
    d.rd = { S: 60, P: 130, process: 400 };
    production(G, f, d, 1.04);
    d.shifts = 2;
    const pv = preview(G, f, d);
    if (pv.loadPct > 0.98 && G.t < G.settings.nQuarters - 6 && f.pending.length === 0 && pv.loanCap + f.cash > CFG.lineCost + 1500) {
      d.linesBuy = 1; d.loan = Math.max(0, CFG.lineCost - Math.max(0, f.cash - 2500));
    }
    d.maintenance = 60 * (f.lines.length + f.pending.length);
    d.training = 0.55 * f.operators;
    d.quality = Math.max(80, 0.013 * eqOf(d.production));
    if (G.t === 3) d.cert = true;
    if (G.tender && G.tender.status === 'open') d.tenderBid = Math.round(G.tender.maxPrice * 0.92 * 100) / 100;
    if (f.cash > 7000 && f.surveillance === 0) d.dividend = Math.round((f.cash - 6000) * 0.5);
    return planOps(G, f, d, false);
  },

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

  aggressive(G, f) {
    const d = defaultDecisions(G, f);
    d.price = { S: 0.93, P: 2.45 };
    d.marketing = { S: 450, P: 450 };
    production(G, f, d, 1.15);
    d.shifts = 3;
    if (G.t < G.settings.nQuarters - 6 && f.lines.length + f.pending.length < 8) {
      const cap = loanCapacity(f);
      if (cap > CFG.lineCost) { d.linesBuy = 1; d.loan = CFG.lineCost; }
    }
    d.maintenance = 60 * f.lines.length;
    d.training = 0.5 * f.operators;
    d.quality = 0.012 * eqOf(d.production);
    if (G.settings.ma) {
      const tg = G.targets.find((t) => t.status === 'open' && t.type === 'competitor');
      if (tg) { const ask = targetAsk(G, tg); d.loan = Math.max(d.loan, ask); d.acqBid = { targetId: tg.id, price: ask * 1.05 }; d.linesBuy = 0; }
    }
    if (G.tender && G.tender.status === 'open') d.tenderBid = Math.round(G.tender.maxPrice * 0.88 * 100) / 100;
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
