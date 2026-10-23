// Forge — moteur de simulation de gestion industrielle (pur, sans DOM)
// Unités : montants en k€, volumes en unités physiques, 1 tour = 1 trimestre.
// Prix unitaires en k€ (1,00 = 1 000 €). Capacité exprimée en « équivalents Standard » (éq.).

export const VERSION = 1;
export const SEGS = ['S', 'P'];
export const SEG_LABEL = { S: 'Standard', P: 'Premium' };
export const TEAM_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2'];

export const CFG = {
  capEq: { S: 1, P: 2.4 },            // temps machine par unité, en éq. Standard
  kits: { S: 1, P: 2.2 },             // kits de composants par unité
  refPrice: { S: 1.0, P: 2.6 },       // prix de référence k€
  elasticity: { S: 2.2, P: 1.7 },     // élasticité-prix de la part de marché
  marketElasticity: { S: 0.6, P: 0.4 },
  repBeta: { S: 0.4, P: 1.0 },
  techGamma: { S: 0.025, P: 0.05 },
  techSat: 8,                         // saturation de l'avantage technologique (points)
  techDiffusion: 0.08,                // part de l'écart rattrapée par trimestre par imitation
  mktAlpha: { S: 0.25, P: 0.3 },
  brandRef: 600,
  demandPerTeam: { S: 6200, P: 1700 },
  npcDemand: { S: 5000, P: 1600 },
  growth: { S: 0.008, P: 0.025 },
  season: [0.96, 1.04, 0.92, 1.08],
  lineCap: 1600, opsPerLineShift: 15, lineCost: 6000, lineLife: 24, lineSaleRatio: 0.6,
  shiftPremium: [0, 1.0, 1.05, 1.13],   // prime moyenne : 2e équipe +10 %, nuit +30 %
  shiftWear: [0, 0.7, 1.0, 1.45],
  shiftDefect: [0, 0.95, 1.0, 1.12],
  salaryBase: 12, hireCost: 6, fireCost: 15,
  energyPerEq: 0.035, kitBase: 0.40,
  suppliers: {
    A: { label: 'A — low-cost', priceF: 0.93, rel: 0.86, relSd: 0.09, q: 1.5 },
    B: { label: 'B — standard', priceF: 1.0, rel: 0.95, relSd: 0.03, q: 1.0 },
    C: { label: 'C — premium', priceF: 1.06, rel: 0.99, relSd: 0.01, q: 0.6 },
  },
  captive: { priceF: 0.82, rel: 0.995, relSd: 0.004, q: 0.65 },
  fixedOverhead: 900, overheadPerLine: 60, sellingVar: 0.03,
  holdingRate: 0.025, recvShare: 0.33, payShare: 0.33, taxRate: 0.25,
  odSpread: 7, emergencySpread: 9,
  warranty: { S: 0.45, P: 1.3 },
  certCost: 250, certAudit: 30, studyCost: 40, hedgePremium: 0.03,
  maxLeverage: 3.5,
};

export const SCENARIOS = {
  stable: { label: 'Stable', kitSd: 2, energySd: 2, eventF: 0.5, cycleAmp: 0.03 },
  standard: { label: 'Standard', kitSd: 3.5, energySd: 3, eventF: 1, cycleAmp: 0.05 },
  volatil: { label: 'Volatil', kitSd: 6, energySd: 5, eventF: 1.6, cycleAmp: 0.08 },
};

export const GLOBAL_EVENTS = {
  mp: { label: 'Flambée des matières premières', text: "L'indice des composants bondit de 20 %.", p: 0.07 },
  energie: { label: "Crise de l'énergie", text: "Le coût de l'énergie augmente de 45 % pendant 3 trimestres.", p: 0.05 },
  recession: { label: 'Récession', text: 'La demande recule de 12 % pendant 4 trimestres.', p: 0.05 },
  reprise: { label: 'Reprise économique', text: 'La demande progresse de 8 % pendant 4 trimestres.', p: 0.05 },
  penurie: { label: 'Pénurie de composants', text: 'La fiabilité de livraison chute pendant 2 trimestres (surtout chez A).', p: 0.06 },
  taux: { label: 'Resserrement monétaire', text: 'Le taux directeur augmente de 1,25 point.', p: 0.05 },
  detente: { label: 'Détente monétaire', text: 'Le taux directeur baisse de 1 point.', p: 0.04 },
  salaires: { label: 'Tension sur les salaires', text: 'Le salaire de marché des opérateurs augmente de 4 %.', p: 0.04 },
  norme: { label: 'Nouvelle norme Premium', text: "Une norme qualité s'appliquera au Premium dès le trimestre suivant : les offres non certifiées perdent 20 % d'attractivité.", p: 0.09 },
};

// ---------- utilitaires ----------
// L'état de partie est du JSON pur : le repli JSON est équivalent sur les navigateurs sans structuredClone (Safari < 15.4).
const deepClone = typeof structuredClone === 'function' ? (o) => structuredClone(o) : (o) => JSON.parse(JSON.stringify(o));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fin = (v, d = 0) => {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN);
  return Number.isFinite(n) ? n : d;
};
const sum = (a) => a.reduce((s, x) => s + x, 0);
const r0 = (x) => Math.round(x);

export function rand(G) {
  let t = (G.rng = (G.rng + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randn(G) { const u = Math.max(1e-12, rand(G)); const v = rand(G); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function uni(G, a, b) { return a + (b - a) * rand(G); }

const lineNbv = (l) => l.cost * Math.max(0, 1 - l.age / CFG.lineLife);
const avgAge = (lines) => (lines.length ? sum(lines.map((l) => l.age)) / lines.length : 0);
export const techGain = (rd) => (rd > 0 ? 2.0 * Math.sqrt(rd / 150) : 0);
export const procFactor = (process) => 1 - 0.25 * (1 - Math.exp(-process / 3000));
export const perfOf = (skill, climate) => (0.80 + 0.20 * skill / 100) * (0.9 + 0.2 * climate / 100);
const certOk = (f) => f.kind === 'team' ? f.cert.status === 'ok' : !!f.certified;
export const eqOf = (x) => x.S * CFG.capEq.S + x.P * CFG.capEq.P;
export const kitsOf = (x) => x.S * CFG.kits.S + x.P * CFG.kits.P;
const ttm = (arr) => sum(arr.slice(-4));
const quarterLabel = (q) => `A${Math.floor((q - 1) / 4) + 1}·T${((q - 1) % 4) + 1}`;
export { quarterLabel };

// ---------- création de partie ----------
function newTeam(id, name, color) {
  const lines = [6, 8, 8, 10].map((age) => ({ age, cost: CFG.lineCost }));
  return {
    id, name, color, kind: 'team',
    shares: 1000, shareCapital: 0, retained: 0,
    cash: 2500, receivables: 3500, payables: 1270, debt: 10000, overdraft: 0,
    lines, pending: [],
    shifts: 2, operators: 120, salaryIndex: 1, climate: 60, skill: 50, condition: 75,
    tech: { S: 20, P: 20 }, process: 0, reputation: 60,
    brand: { S: 570, P: 570 }, presence: { S: 1, P: 1 },
    inv: { S: 500, P: 150 }, invCost: { S: 0.435, P: 0.964 },
    kits: 3000, kitCost: 0.40, kitQ: 1.0,
    cert: { status: 'none', q: 0 },
    hedge: null, captive: false,
    goodwill: 0, participation: 0, intangibles: [], subsidiaryIncome: 0,
    taxLoss: 0, surveillance: 0, cumDivPS: 0, divTotal: 0,
    ebitdaHist: [1740, 1760, 1780, 1800], rdHist: [400, 400, 400, 400],
    revHist: [10250, 10300, 10380, 10420, 10480, 10530, 10580, 10620],
    fill: { S: 1, P: 1 }, lastDemand: { S: 6200, P: 1700 }, lastSales: { S: 6200, P: 1700 },
    integration: [], tenderCommit: null, acquisitions: [],
    lastDec: null, history: [], report: null,
    rating: 'A', rate: 5.1, vps: 0, vps0: 0, tsr: 0, marketCap: 0,
    cum: { rd: 0, capex: 0, mkt: 0, training: 0, maint: 0, quality: 0, acquisitions: 0 },
  };
}

function newNpc(spec) {
  return {
    kind: 'npc', acquiredBy: null, fill: { S: 1, P: 1 },
    lines: spec.lineAges.map((age) => ({ age, cost: CFG.lineCost })),
    brand: { S: spec.mkt.S / 0.35, P: spec.mkt.P / 0.35 },
    price: { S: CFG.refPrice.S * spec.priceF.S, P: CFG.refPrice.P * spec.priceF.P },
    presence: { S: 0, P: 0 }, revHist: [], lastSales: { S: 0, P: 0 },
    ...spec,
  };
}

const NPC_SPECS = [
  { id: 'durand', name: 'Ateliers Durand', segs: ['S'], lineAges: [10, 12], shifts: 2, operators: 60,
    priceF: { S: 0.94, P: 1 }, reputation: 52, tech: { S: 17, P: 0 }, mkt: { S: 90, P: 0 },
    inv: { S: 300, P: 0 }, target: { S: 3000, P: 0 }, margin: 0.13, certified: false,
    desc: 'Concurrent régional low-cost, positionné sur le Standard. Capacité excédentaire.' },
  { id: 'hydrotec', name: 'Hydrotec', segs: ['P'], lineAges: [4, 6], shifts: 1, operators: 30,
    priceF: { S: 1, P: 1.02 }, reputation: 66, tech: { S: 0, P: 23 }, mkt: { S: 0, P: 110 },
    inv: { S: 0, P: 110 }, target: { S: 0, P: 1100 }, margin: 0.18, certified: true,
    desc: 'Spécialiste Premium, technologie avancée, certifié. Saturé en capacité.' },
  { id: 'mecanova', name: 'Mécanova', segs: ['S', 'P'], lineAges: [14, 16], shifts: 2, operators: 60,
    priceF: { S: 0.98, P: 0.97 }, reputation: 58, tech: { S: 19, P: 18 }, mkt: { S: 80, P: 60 },
    inv: { S: 200, P: 40 }, target: { S: 2000, P: 500 }, margin: 0.14, certified: false,
    desc: 'Généraliste vieillissant, parc machines ancien. Deux segments.' },
];

export function newGame(opts = {}) {
  const names = (opts.teams && opts.teams.length ? opts.teams : ['Équipe 1', 'Équipe 2', 'Équipe 3', 'Équipe 4'])
    .slice(0, 6).map((n, i) => (String(n || '').trim() || `Équipe ${i + 1}`));
  if (names.length < 2) throw new Error('Il faut au moins 2 équipes.');
  const seed = (fin(opts.seed, Math.floor(Math.random() * 2 ** 31)) >>> 0) || 12345;
  const G = {
    version: VERSION, seed, rng: seed,
    settings: {
      nQuarters: clamp(Math.round(fin(opts.nQuarters, 20)), 4, 32),
      scenario: SCENARIOS[opts.scenario] ? opts.scenario : 'standard',
      events: opts.events !== false, tenders: opts.tenders !== false, ma: opts.ma !== false,
    },
    t: 0, phase: 'decisions',
    macro: { kitIndex: 100, kitSmooth: 100, energyIndex: 100, baseRate: 3.5, salaryBase: CFG.salaryBase, cyclePhase: 0, effects: [] },
    norm: { status: 'none', at: null },
    firms: names.map((n, i) => ({ ...newTeam(`e${i + 1}`, n, TEAM_COLORS[i]), ai: aiOk(opts.ai?.[i]) ? opts.ai[i] : null })),
    npcs: NPC_SPECS.map((s) => newNpc(JSON.parse(JSON.stringify(s)))),
    targets: [
      { id: 'durand', type: 'competitor', name: 'Ateliers Durand', from: 3, status: 'hidden', owner: null },
      { id: 'mecanova', type: 'competitor', name: 'Mécanova', from: 4, status: 'hidden', owner: null },
      { id: 'hydrotec', type: 'competitor', name: 'Hydrotec', from: 6, status: 'hidden', owner: null },
      { id: 'adour', type: 'supplier', name: 'Composants Adour', from: 5, status: 'hidden', owner: null, ask: 7000,
        desc: 'Fournisseur de composants. Intégration verticale : kits à −18 %, fiabilité 99,5 %, meilleure qualité ; la filiale continue de vendre à des tiers (≈175 k€/trim. de résultat).' },
      { id: 'robotix', type: 'startup', name: 'Robotix Lab', from: 7, status: 'hidden', owner: null, ask: 3600,
        desc: 'Start-up de robotique et de conception. Apport : +6 points de technologie sur les deux segments et +3 000 k€ de R&D procédé capitalisée.' },
    ],
    tender: null, news: [], injected: [], decisions: {}, market: { history: [] },
  };
  G.macro.cyclePhase = rand(G) * 16;
  // capitaux propres d'ouverture : équilibre du bilan
  for (const f of G.firms) {
    const assets = totalAssets(f);
    const equity = assets - f.debt - f.overdraft - f.payables;
    f.shareCapital = Math.round(equity * 0.6);
    f.retained = equity - f.shareCapital;
    f.rate = G.macro.baseRate + spreadFor(netDebt(f) / ttm(f.ebitdaHist));
    f.rating = ratingFor(netDebt(f) / ttm(f.ebitdaHist), ttm(f.ebitdaHist));
  }
  // calibration de la « présence » des concurrents non-joueurs
  const team = G.firms[0];
  for (const s of SEGS) {
    const techAvg = team.tech[s];
    const aTeam = rawAttract(team, s, CFG.refPrice[s], techAvg, CFG.refPrice[s]);
    for (const n of G.npcs) {
      if (!n.segs.includes(s)) continue;
      const aRaw = rawAttract({ ...n, presence: { S: 1, P: 1 } }, s, n.price[s], techAvg, CFG.refPrice[s]);
      n.presence[s] = (n.target[s] / CFG.demandPerTeam[s]) * (aTeam / aRaw);
    }
  }
  for (const n of G.npcs) {
    n.lastDemand = { S: n.target.S, P: n.target.P };
    const rev = n.target.S * n.price.S + n.target.P * n.price.P;
    n.revHist = [rev, rev, rev, rev];
  }
  for (const f of G.firms) { valuate(G, f); f.vps0 = f.vps; f.tsr = 0; }
  const nAi = G.firms.filter(isAi).length;
  G.news.push({ t: 0, kind: 'info', text: `Ouverture du marché : ${names.length} équipes${nAi ? ` dont ${nAi} pilotée${nAi > 1 ? 's' : ''} par l'IA` : ''}, ${G.settings.nQuarters} trimestres, scénario ${SCENARIOS[G.settings.scenario].label}.` });
  return G;
}

// ---------- bilan, notation, valorisation ----------
function fgValue(f) { return sum(SEGS.map((s) => f.inv[s] * f.invCost[s])); }
function fixedAssets(f) {
  return sum(f.lines.map(lineNbv)) + sum(f.pending.map((p) => p.cost)) + f.goodwill + f.participation + sum(f.intangibles.map((i) => i.value));
}
function totalAssets(f) { return fixedAssets(f) + fgValue(f) + f.kits * f.kitCost + f.receivables + f.cash; }
function netDebt(f) { return f.debt + f.overdraft - f.cash; }
export function bookEquity(f) { return f.shareCapital + f.retained; }

function spreadFor(ratio) {
  if (!Number.isFinite(ratio) || ratio < 0) return ratio < 0 ? 1.0 : 8;
  if (ratio < 1) return 1.0; if (ratio < 2) return 1.6; if (ratio < 3) return 2.4;
  if (ratio < 3.5) return 3.5; if (ratio < 4.5) return 5; return 8;
}
function ratingFor(ratio, ebitda) {
  if (ebitda <= 0) return 'CCC';
  if (ratio < 1) return 'AA'; if (ratio < 2) return 'A'; if (ratio < 3) return 'BBB';
  if (ratio < 3.5) return 'BB'; if (ratio < 4.5) return 'B'; return 'CCC';
}

export function marketTechAvg(G, s) {
  const ents = activeEntities(G).filter((e) => e.presence[s] > 0);
  return ents.length ? sum(ents.map((e) => e.tech[s])) / ents.length : 20;
}

function valuate(G, f) {
  const e = ttm(f.ebitdaHist);
  const rev = ttm(f.revHist);
  const revPrev = sum(f.revHist.slice(-8, -4)) || rev;
  const g = revPrev > 0 ? rev / revPrev - 1 : 0;
  const techF = (f.tech.S + f.tech.P) / 2 - (marketTechAvg(G, 'S') + marketTechAvg(G, 'P')) / 2;
  const m = clamp(6 + 10 * clamp(g, -0.15, 0.25) + 0.04 * (f.reputation - 60) + 0.03 * techF, 3, 11);
  const ev = Math.max(0, e + 0.4 * ttm(f.rdHist || [])) * m;
  const value = Math.max(ev - netDebt(f), 0.6 * Math.max(bookEquity(f), 0), 50);
  f.multiple = m;
  f.marketCap = value;
  f.vps = value / f.shares;
  if (f.vps0 > 0) f.tsr = (f.vps + f.cumDivPS) / f.vps0 - 1;
  return value;
}

// ---------- entités actives & attractivité ----------
export function activeEntities(G) {
  return [...G.firms, ...G.npcs.filter((n) => !n.acquiredBy)];
}

function rawAttract(e, s, price, techAvg, refP) {
  if (!(e.presence[s] > 0) || !(price > 0)) return 0;
  const pf = Math.pow(price / refP, -CFG.elasticity[s]);
  const bf = Math.pow(1 + Math.max(0, e.brand[s]) / CFG.brandRef, CFG.mktAlpha[s]);
  const rf = Math.pow(Math.max(5, e.reputation) / 60, CFG.repBeta[s]);
  const tf = Math.exp(CFG.techGamma[s] * CFG.techSat * Math.tanh((e.tech[s] - techAvg) / CFG.techSat));
  const ff = 0.85 + 0.15 * clamp(e.fill?.[s] ?? 1, 0, 1);
  return e.presence[s] * pf * bf * rf * tf * ff;
}

function attract(G, e, s, price, techAvg, refP) {
  let a = rawAttract(e, s, price, techAvg, refP);
  if (s === 'P' && G.norm.status === 'active' && !certOk(e)) a *= 0.8;
  if (e.kind === 'team' && e.surveillance > 0) a *= 0.97;
  return a;
}

function refPrices(G) {
  const k = 1 + 0.45 * (G.macro.kitSmooth / 100 - 1);
  return { S: CFG.refPrice.S * k, P: CFG.refPrice.P * k };
}

function effectMult(G, key) {
  return G.macro.effects.reduce((m, e) => m * (e[key] ?? 1), 1);
}

export function marketDemandBase(G, q) {
  const n = G.firms.length;
  const cyc = 1 + SCENARIOS[G.settings.scenario].cycleAmp * Math.sin((2 * Math.PI * (q + G.macro.cyclePhase)) / 16);
  const season = CFG.season[(q - 1) % 4];
  const ev = effectMult(G, 'demand');
  const out = {};
  for (const s of SEGS) {
    out[s] = (n * CFG.demandPerTeam[s] + CFG.npcDemand[s]) * Math.pow(1 + CFG.growth[s], q - 1) * season * cyc * ev;
  }
  return out;
}

// ---------- décisions ----------
export function defaultDecisions(G, f) {
  const base = f.lastDec ? JSON.parse(JSON.stringify(f.lastDec)) : {
    offer: { S: true, P: true }, price: { S: 1.0, P: 2.6 }, marketing: { S: 200, P: 200 },
    production: { S: 6200, P: 1700 }, linesBuy: 0, linesSell: 0, shifts: 2, hire: 3, fire: 0, salaryIndex: 1,
    training: 60, maintenance: 200, quality: 120, cert: false,
    rd: { S: 100, P: 200, process: 100 }, supplier: { A: 0, B: 100, C: 0 }, kitsOrder: 9900, hedge: false,
    loan: 0, repay: 0, equity: 0, dividend: 0, study: false, tenderBid: null, acqBid: null,
  };
  base.linesBuy = 0; base.linesSell = 0; base.fire = 0; base.cert = false; base.hedge = false;
  base.loan = 0; base.repay = 0; base.equity = 0; base.dividend = 0; base.tenderBid = null; base.acqBid = null; base.study = false;
  if (f.lastDec) {
    // recrutements : remplacer les départs attendus et couvrir le besoin des lignes (y compris celles en commande)
    const needed = (f.lines.length + f.pending.length) * base.shifts * CFG.opsPerLineShift;
    const quits = Math.round(f.operators * quitRate(f.climate, base.salaryIndex));
    base.hire = clamp(needed - (f.operators - quits), 0, maxHires(f));
    const fc = forecastDemand(G, f);
    base.production = { S: r0(Math.max(0, fc.S - f.inv.S * 0.5)), P: r0(Math.max(0, fc.P - f.inv.P * 0.5)) };
    const needKits = kitsOf(base.production) * procFactor(f.process);
    base.kitsOrder = r0(Math.max(0, needKits * 1.05 - f.kits * 0.6));
  }
  return base;
}

export function sanitize(G, f, d0) {
  const def = defaultDecisions(G, f);
  const d = d0 || {};
  const o = {};
  o.offer = { S: d.offer?.S !== false, P: d.offer?.P !== false };
  o.price = { S: clamp(fin(d.price?.S, def.price.S), 0.5, 2.2), P: clamp(fin(d.price?.P, def.price.P), 1.3, 5.5) };
  o.marketing = { S: clamp(fin(d.marketing?.S, def.marketing.S), 0, 3000), P: clamp(fin(d.marketing?.P, def.marketing.P), 0, 3000) };
  o.production = { S: r0(clamp(fin(d.production?.S, def.production.S), 0, 80000)), P: r0(clamp(fin(d.production?.P, def.production.P), 0, 40000)) };
  if (!o.offer.S) o.production.S = 0;
  if (!o.offer.P) o.production.P = 0;
  o.linesBuy = r0(clamp(fin(d.linesBuy, 0), 0, 4));
  o.linesSell = r0(clamp(fin(d.linesSell, 0), 0, Math.max(0, f.lines.length - 1)));
  o.shifts = r0(clamp(fin(d.shifts, def.shifts), 1, 3));
  o.hire = r0(clamp(fin(d.hire, 0), 0, maxHires(f)));
  o.fire = r0(clamp(fin(d.fire, 0), 0, f.operators));
  if (o.hire > 0 && o.fire > 0) { const net = o.hire - o.fire; o.hire = Math.max(0, net); o.fire = Math.max(0, -net); }
  o.salaryIndex = clamp(fin(d.salaryIndex, def.salaryIndex), 0.85, 1.25);
  o.training = clamp(fin(d.training, def.training), 0, 3000);
  o.maintenance = clamp(fin(d.maintenance, def.maintenance), 0, 4000);
  o.quality = clamp(fin(d.quality, def.quality), 0, 3000);
  o.cert = !!d.cert && f.cert.status === 'none';
  o.rd = {
    S: clamp(fin(d.rd?.S, def.rd.S), 0, 5000), P: clamp(fin(d.rd?.P, def.rd.P), 0, 5000),
    process: clamp(fin(d.rd?.process, def.rd.process), 0, 5000),
  };
  const sup = { A: Math.max(0, fin(d.supplier?.A, 0)), B: Math.max(0, fin(d.supplier?.B, 0)), C: Math.max(0, fin(d.supplier?.C, 0)) };
  const st = sup.A + sup.B + sup.C;
  o.supplier = st > 0 ? { A: (sup.A / st) * 100, B: (sup.B / st) * 100, C: (sup.C / st) * 100 } : { A: 0, B: 100, C: 0 };
  o.kitsOrder = r0(clamp(fin(d.kitsOrder, def.kitsOrder), 0, 150000));
  o.hedge = !!d.hedge && !f.hedge && !f.captive;
  o.loan = clamp(fin(d.loan, 0), 0, 100000);
  o.repay = clamp(fin(d.repay, 0), 0, f.debt);
  o.equity = clamp(fin(d.equity, 0), 0, 100000);
  o.dividend = clamp(fin(d.dividend, 0), 0, 100000);
  o.study = !!d.study;
  o.tenderBid = G.tender && G.tender.status === 'open' && d.tenderBid != null && fin(d.tenderBid, 0) > 0
    ? clamp(fin(d.tenderBid, 0), 0.1, 10) : null;
  const tg = d.acqBid && G.targets.find((x) => x.id === d.acqBid.targetId && x.status === 'open');
  o.acqBid = tg && fin(d.acqBid.price, 0) > 0 ? { targetId: tg.id, price: Math.max(0, fin(d.acqBid.price, 0)) } : null;
  return o;
}

export function maxHires(f) { return Math.round(20 + 0.25 * f.operators); }

export function forecastDemand(G, f) {
  const q = G.t + 1;
  const base = marketDemandBase(G, q);
  const prevBase = G.t >= 1 ? marketDemandBase(G, G.t) : base;
  const out = {};
  for (const s of SEGS) {
    const last = f.lastDemand?.[s] ?? 0;
    out[s] = r0(last * (prevBase[s] > 0 ? base[s] / prevBase[s] : 1));
  }
  return out;
}

export function targetAsk(G, tg) {
  if (tg.type !== 'competitor') return tg.ask;
  const n = G.npcs.find((x) => x.id === tg.id);
  const ebitda = ttm(n.revHist) * n.margin;
  const nbv = sum(n.lines.map(lineNbv)) + sum(SEGS.map((s) => n.inv[s] * CFG.refPrice[s] * 0.4));
  return Math.round(Math.max(6 * ebitda, 1.1 * nbv) / 50) * 50;
}

function loanCapacity(f) {
  const e = ttm(f.ebitdaHist);
  if (e > 0) return Math.max(0, CFG.maxLeverage * e - f.debt - f.overdraft);
  return Math.max(0, 0.5 * sum(f.lines.map(lineNbv)) - f.debt - f.overdraft);
}
export { loanCapacity };

function overdraftLimit(f) { return Math.max(1500, 0.35 * (f.revHist[f.revHist.length - 1] || 0)); }

// Aperçu des contraintes pour l'interface (estimation, hors aléas)
export function preview(G, f, d0) {
  const d = sanitize(G, f, d0);
  const linesActive = f.lines.length + f.pending.length - d.linesSell;
  const quitsEst = Math.round(f.operators * quitRate(f.climate, d.salaryIndex));
  const ops = Math.max(0, f.operators - quitsEst - d.fire + d.hire);
  const needed = linesActive * d.shifts * CFG.opsPerLineShift;
  const avail = 0.70 + 0.28 * f.condition / 100;
  const skillAfter = ops > 0 ? (f.skill * Math.max(0, ops - d.hire) + 25 * d.hire) / ops : f.skill;
  const perf = perfOf(skillAfter, f.climate);
  const machineCapEq = linesActive * d.shifts * CFG.lineCap;
  const grossCapEq = machineCapEq * avail * perf;
  const capEq = grossCapEq * Math.min(1, (ops * 1.1) / Math.max(1, needed));
  const planEq = eqOf(d.production);
  const pf = procFactor(f.process);
  const rel = f.captive ? CFG.captive.rel : sum(['A', 'B', 'C'].map((k) => (d.supplier[k] / 100) * CFG.suppliers[k].rel));
  const kitsAvail = f.kits + d.kitsOrder * rel;
  const kitsNeeded = kitsOf(d.production) * pf;
  const kitPrice = currentKitPrice(G, f, d);
  const fc = forecastDemand(G, f);
  const salary = G.macro.salaryBase * d.salaryIndex * CFG.shiftPremium[d.shifts];
  const opex = d.marketing.S + d.marketing.P + d.rd.S + d.rd.P + d.rd.process + d.training + d.maintenance + d.quality
    + (d.cert ? CFG.certCost : 0) + (f.cert.status === 'ok' || f.cert.status === 'suspended' ? CFG.certAudit : 0)
    + (d.study ? CFG.studyCost : 0) + ops * salary + d.hire * CFG.hireCost + d.fire * CFG.fireCost
    + CFG.fixedOverhead + CFG.overheadPerLine * Math.max(0, f.lines.length - d.linesSell);
  const capex = d.linesBuy * CFG.lineCost;
  return {
    d, linesActive, newLinesNextQ: d.linesBuy, quitsEst, ops, needed, machineCapEq, avail, perf, grossCapEq, capEq, planEq,
    loadPct: capEq > 0 ? planEq / capEq : 0, kitsAvail, kitsNeeded, kitPrice, rel, forecast: fc, opex, capex,
    kitsCost: d.kitsOrder * rel * kitPrice, loanCap: loanCapacity(f), maxHires: maxHires(f),
    cashAvailable: f.cash + Math.max(0, overdraftLimit(f) - f.overdraft),
    overdraftLimit: overdraftLimit(f),
  };
}

function currentKitPrice(G, f, d) {
  if (f.captive) return CFG.kitBase * (G.macro.kitIndex / 100) * CFG.captive.priceF;
  const idx = f.hedge ? f.hedge.index : (d && d.hedge ? G.macro.kitIndex * (1 + CFG.hedgePremium) : G.macro.kitIndex);
  const pf = d ? sum(['A', 'B', 'C'].map((k) => (d.supplier[k] / 100) * CFG.suppliers[k].priceF)) : 1;
  return CFG.kitBase * (idx / 100) * pf;
}

function quitRate(climate, salaryIndex) {
  return 0.02 + 0.12 * Math.max(0, (55 - climate) / 55) + 0.5 * Math.max(0, 1 - salaryIndex);
}

// ---------- entreprises pilotées par l'IA ----------
// Stratégies déterministes (aucun tirage aléatoire) : la partie reste reproductible à graine fixée.
// Les niveaux reflètent le classement moyen obtenu par « npm run tournoi ».
export function aiPlanOps(G, f, d, allowFire = false) {
  const pv = preview(G, f, d);
  const avail = f.operators - pv.quitsEst;
  const gap = pv.needed - avail;
  d.hire = Math.max(0, Math.min(pv.maxHires, Math.ceil(gap)));
  d.fire = allowFire && gap < -6 ? Math.floor(-gap - 3) : 0;
  return d;
}

export function aiProduction(G, f, d, cover = 1.08) {
  const fc = forecastDemand(G, f);
  d.production = { S: Math.max(0, Math.round(fc.S * cover - f.inv.S)), P: Math.max(0, Math.round(fc.P * cover - f.inv.P)) };
  const need = kitsOf(d.production);
  d.kitsOrder = Math.max(0, Math.round(need * 1.12 - f.kits + 1500));
  return d;
}

export const AI_PROFILES = {
  passive: {
    label: 'Prudente', level: 'Débutant',
    desc: 'Reconduit ses décisions et recale la production sur la demande. N\'investit pas : une cible facile.',
    decide(G, f) { return defaultDecisions(G, f); },
  },
  costLeader: {
    label: 'Low-cost', level: 'Intermédiaire',
    desc: 'Prix bas, R&D procédé, 2×8 permanent. Pèse sur les prix du Standard ; s\'endette parfois trop.',
    decide(G, f) {
      const d = defaultDecisions(G, f);
      d.price = { S: 0.95, P: 2.55 };
      d.marketing = { S: 220, P: 140 };
      d.rd = { S: 60, P: 130, process: 400 };
      aiProduction(G, f, d, 1.04);
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
      return aiPlanOps(G, f, d, false);
    },
  },
  balanced: {
    label: 'Équilibrée', level: 'Confirmé',
    desc: 'Gestion saine sur les deux segments : capacité suivant la charge, maintenance, formation, certification, dividendes.',
    decide(G, f) {
      const d = defaultDecisions(G, f);
      aiProduction(G, f, d);
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
      return aiPlanOps(G, f, d);
    },
  },
  premium: {
    label: 'Premium', level: 'Expert',
    desc: 'Montée en gamme : R&D produit, fournisseurs haut de gamme, certification immédiate, prix élevés. La stratégie la plus performante des tournois.',
    decide(G, f) {
      const d = defaultDecisions(G, f);
      d.price = { S: 1.0, P: 2.85 };
      d.marketing = { S: 150, P: 380 };
      d.rd = { S: 60, P: 500, process: 100 };
      d.supplier = { A: 0, B: 40, C: 60 };
      aiProduction(G, f, d);
      if (G.t === 0) d.cert = true;
      d.quality = Math.max(120, 0.02 * eqOf(d.production));
      d.training = 0.8 * f.operators;
      d.maintenance = 70 * f.lines.length;
      const pv = preview(G, f, d);
      if (pv.loadPct > 0.97 && G.t < G.settings.nQuarters - 6 && pv.loanCap > CFG.lineCost) { d.linesBuy = 1; d.loan = CFG.lineCost; }
      return aiPlanOps(G, f, d);
    },
  },
  aggressive: {
    label: 'Conquérante', level: 'Perturbateur',
    desc: 'Croissance à crédit : prix cassés, marketing massif, 3×8, rachats de concurrents. Déstabilise le marché et finit souvent surendettée.',
    decide(G, f) {
      const d = defaultDecisions(G, f);
      d.price = { S: 0.93, P: 2.45 };
      d.marketing = { S: 450, P: 450 };
      aiProduction(G, f, d, 1.15);
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
      return aiPlanOps(G, f, d);
    },
  },
};
const aiOk = (p) => !!p && Object.prototype.hasOwnProperty.call(AI_PROFILES, p);
export const isAi = (f) => !!f && aiOk(f.ai);

// Décisions que l'IA prendrait pour cette entreprise au trimestre en cours (null si pilotée par une équipe).
export function aiDecisions(G, f) { return isAi(f) ? AI_PROFILES[f.ai].decide(G, f) : null; }

// Confie une entreprise à l'IA (profil) ou la rend à son équipe (null). Effet dès la prochaine résolution.
export function setAi(G, fid, profile) {
  const p = aiOk(profile) ? profile : null;
  const N = deepClone(G);
  const f = N.firms.find((x) => x.id === fid);
  if (!f || (f.ai || null) === p) return G;
  f.ai = p;
  if (N.decisions) delete N.decisions[fid];
  if (N.submitted) N.submitted = { ...N.submitted, [fid]: false };
  return N;
}

// ---------- résolution d'un trimestre ----------
export function resolveQuarter(G0, decisionsIn = {}) {
  if (G0.phase === 'finished') throw new Error('La partie est terminée.');
  const G = deepClone(G0);
  const q = G.t + 1;
  const scen = SCENARIOS[G.settings.scenario];
  const news = [];
  const dec = {};
  for (const f of G.firms) dec[f.id] = sanitize(G, f, isAi(f) ? aiDecisions(G, f) : (decisionsIn[f.id] || G.decisions?.[f.id]));
  const R = {};
  for (const f of G.firms) R[f.id] = { events: [], pnl: {}, cf: {}, ops: {}, mkt: {}, fin: {}, hr: {}, quality: {}, notes: [] };

  // 1. Environnement : effets expirés, événements globaux, indices
  G.macro.effects = G.macro.effects.filter((e) => e.until >= q);
  if (G.norm.status === 'announced' && G.norm.at < q) { G.norm.status = 'active'; news.push({ t: q, kind: 'event', text: 'La norme Premium est désormais en vigueur.' }); }
  const evToApply = [...(G.injected || [])];
  G.injected = [];
  if (G.settings.events && q >= 2 && evToApply.length === 0) {
    const ids = Object.keys(GLOBAL_EVENTS);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rand(G) * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    for (const id of ids) {
      if (rand(G) < GLOBAL_EVENTS[id].p * scen.eventF) { evToApply.push(id); break; }
    }
  }
  for (const id of evToApply) applyGlobalEvent(G, id, q, news);
  G.macro.kitIndex = clamp(G.macro.kitIndex + 0.15 * (100 - G.macro.kitIndex) + scen.kitSd * randn(G), 60, 200);
  G.macro.kitSmooth = 0.7 * G.macro.kitSmooth + 0.3 * G.macro.kitIndex;
  G.macro.energyIndex = clamp(G.macro.energyIndex + 0.2 * (100 - G.macro.energyIndex) + scen.energySd * randn(G), 60, 220);
  const energyIdx = G.macro.energyIndex * effectMult(G, 'energy');
  const relDrop = { A: 0, B: 0, C: 0 };
  for (const e of G.macro.effects) if (e.relDrop) for (const k of ['A', 'B', 'C']) relDrop[k] += e.relDrop[k];

  // 2. Début de trimestre : lignes livrées, financement
  for (const f of G.firms) {
    const r = R[f.id]; const d = dec[f.id];
    r.cashStart = f.cash;
    for (const p of f.pending) f.lines.push({ age: 0, cost: p.cost });
    if (f.pending.length) {
      const n = f.lines.length, k = f.pending.length;
      f.condition = (f.condition * (n - k) + 100 * k) / n;
      r.notes.push(`${k} ligne(s) mise(s) en service.`);
    }
    f.pending = [];
    // financement
    const cap = loanCapacity(f);
    const loan = Math.min(d.loan, cap);
    if (d.loan > 0 && loan < d.loan) r.notes.push(`Prêt accordé : ${r0(loan)} k€ sur ${r0(d.loan)} demandés (plafond d'endettement : ${CFG.maxLeverage} × EBITDA annuel).`);
    f.debt += loan; f.cash += loan;
    const repay = Math.min(d.repay, f.debt, Math.max(0, f.cash));
    f.debt -= repay; f.cash -= repay;
    let equity = 0, newShares = 0;
    if (d.equity > 0) {
      if (f.vps >= 0.5) {
        const discount = f.surveillance > 0 ? 0.7 : 0.9;
        equity = Math.min(d.equity, (f.surveillance > 0 ? 0.6 : 0.3) * f.marketCap);
        const price = f.vps * discount;
        newShares = equity / price;
        f.shares += newShares; f.shareCapital += equity; f.cash += equity;
        r.notes.push(`Augmentation de capital : ${r0(equity)} k€ à ${price.toFixed(2)} €/action (${r0(newShares)} k actions nouvelles).`);
        if (f.surveillance > 0) r.notes.push('Augmentation de capital de sauvetage : décote de 30 % imposée par les investisseurs.');
      } else r.notes.push('Augmentation de capital refusée par le marché (cours trop bas).');
    }
    r.fin = { loan, repay, equity, newShares };
    // coût moyen de la dette (taux variable) après financement
    const e = ttm(f.ebitdaHist);
    const ratio = e > 0 ? (f.debt + f.overdraft - f.cash) / e : Infinity;
    f.rate = G.macro.baseRate + spreadFor(ratio);
    f.rating = ratingFor(ratio, e);
  }

  // 3. Croissance externe (enchères sous pli scellé)
  if (G.settings.ma) resolveAcquisitions(G, dec, R, q, news);

  // 4. Capacité, RH, achats, certification
  for (const f of G.firms) {
    const r = R[f.id]; const d = dec[f.id];
    // cession de lignes (les plus anciennes)
    let saleProceeds = 0, saleLoss = 0;
    if (d.linesSell > 0) {
      f.lines.sort((a, b) => b.age - a.age);
      const sold = f.lines.splice(0, Math.min(d.linesSell, f.lines.length - 1));
      for (const l of sold) { const v = lineNbv(l); saleProceeds += v * CFG.lineSaleRatio; saleLoss += v * (1 - CFG.lineSaleRatio); }
      f.cash += saleProceeds;
    }
    const capex = d.linesBuy * CFG.lineCost;
    for (let i = 0; i < d.linesBuy; i++) f.pending.push({ cost: CFG.lineCost });
    f.cash -= capex;
    r.capex = capex; r.saleProceeds = saleProceeds; r.saleLoss = saleLoss;
    // RH
    const quits = Math.min(f.operators, Math.round(f.operators * quitRate(f.climate, d.salaryIndex)));
    f.operators -= quits;
    const fired = Math.min(d.fire, f.operators);
    const firedRate = f.operators > 0 ? fired / f.operators : 0;
    f.operators -= fired;
    const hired = d.hire;
    if (f.operators + hired > 0) f.skill = (f.skill * f.operators + 25 * hired) / (f.operators + hired);
    f.operators += hired;
    f.climate = clamp(f.climate - 150 * firedRate, 0, 100);
    f.shifts = d.shifts; f.salaryIndex = d.salaryIndex;
    r.hr = { quits, fired, hired, hireCost: hired * CFG.hireCost, fireCost: fired * CFG.fireCost };
    // achats de kits
    let delivered = 0, qSum = 0;
    if (d.kitsOrder > 0) {
      const mix = f.captive ? [['X', 1, CFG.captive]] : ['A', 'B', 'C'].map((k) => [k, d.supplier[k] / 100, CFG.suppliers[k]]);
      for (const [k, share, sp] of mix) {
        if (share <= 0) continue;
        const relMean = clamp(sp.rel - (relDrop[k] || 0), 0.3, 1);
        const rel = clamp(relMean + sp.relSd * randn(G), 0.3, 1);
        const got = d.kitsOrder * share * rel;
        delivered += got; qSum += got * sp.q;
      }
    }
    if (d.hedge && !f.hedge) { f.hedge = { index: G.macro.kitIndex * (1 + CFG.hedgePremium), left: 4 }; r.notes.push(`Couverture achats : indice figé à ${f.hedge.index.toFixed(1)} pour 4 trimestres.`); }
    const kitPrice = currentKitPrice(G, f, d);
    const purchases = delivered * kitPrice;
    if (f.kits + delivered > 0) {
      f.kitCost = (f.kits * f.kitCost + purchases) / (f.kits + delivered);
      f.kitQ = (f.kits * f.kitQ + qSum) / (f.kits + delivered);
    }
    f.kits += delivered;
    const payNew = purchases * CFG.payShare;
    f.cash -= f.payables + purchases - payNew;
    r.kitsPaid = f.payables + purchases - payNew;
    f.payables = payNew;
    r.purchase = { ordered: d.kitsOrder, delivered, price: kitPrice, purchases, rate: d.kitsOrder > 0 ? delivered / d.kitsOrder : 1 };
    if (f.hedge) { f.hedge.left -= 1; if (f.hedge.left <= 0) f.hedge = null; }
    // certification
    r.certCost = 0;
    if (d.cert && f.cert.status === 'none') { f.cert = { status: 'progress', q: 0 }; r.notes.push('Projet de certification lancé (2 trimestres).'); }
    if (f.cert.status === 'progress') { r.certCost = CFG.certCost; f.cert.q += 1; }
    else if (f.cert.status === 'ok' || f.cert.status === 'suspended') r.certCost = CFG.certAudit;
  }

  // 5. Production
  for (const f of G.firms) {
    const r = R[f.id]; const d = dec[f.id];
    const nL = f.lines.length;
    const needed = nL * f.shifts * CFG.opsPerLineShift;
    const machineCapEq = nL * f.shifts * CFG.lineCap;
    let avail = 0.70 + 0.28 * f.condition / 100;
    const ef = 0.5 + 0.5 * scen.eventF;
    let breakdown = false, strike = false;
    if (G.settings.events) {
      if (rand(G) < (0.03 + 0.30 * Math.pow(1 - f.condition / 100, 2)) * ef) { breakdown = true; avail *= 0.8; r.events.push({ kind: 'panne', text: 'Panne majeure sur une ligne : disponibilité −20 %, réparation 120 k€.' }); }
      if (f.climate < 38 && rand(G) < ((38 - f.climate) / 40) * ef) { strike = true; avail *= 0.65; r.events.push({ kind: 'greve', text: 'Grève : disponibilité −35 % ce trimestre.' }); }
    }
    const perf = perfOf(f.skill, f.climate);
    const grossCapEq = machineCapEq * avail * perf;
    const planEq = eqOf(d.production);
    const requiredOps = needed * Math.min(1, grossCapEq > 0 ? planEq / grossCapEq : 0);
    const overtimeOps = Math.min(0.1 * f.operators, Math.max(0, requiredOps - f.operators));
    const laborRatio = needed > 0 ? Math.min(1, (f.operators + overtimeOps) / needed) : 0;
    const capEq = grossCapEq * laborRatio;
    const pf = procFactor(f.process);
    const planKits = kitsOf(d.production) * pf;
    let scale = 1, bottleneck = 'aucun';
    if (planEq > 0) {
      const sCap = capEq / planEq, sKit = planKits > 0 ? f.kits / planKits : Infinity;
      scale = Math.min(1, sCap, sKit);
      if (scale < 1) bottleneck = sKit < sCap ? 'kits' : (laborRatio < 0.999 ? 'main-d\'œuvre' : 'machines');
    }
    const prod = { S: Math.floor(d.production.S * scale), P: Math.floor(d.production.P * scale) };
    const prodEq = eqOf(prod);
    const kitsUsed = kitsOf(prod) * pf;
    const kitCostUnit = f.kitCost;
    f.kits = Math.max(0, f.kits - kitsUsed);
    // qualité
    const dRate = clamp(0.05 * f.kitQ * (1.4 - 0.8 * f.skill / 100) * (1.25 - 0.5 * f.condition / 100)
      * CFG.shiftDefect[f.shifts] * (certOk(f) ? 0.8 : 1) * (overtimeOps > 0 ? 1.05 : 1), 0.005, 0.25);
    const insp = prodEq > 0 ? Math.min(0.95, 1 - Math.exp(-d.quality / (0.012 * prodEq))) : 0;
    const scrapRate = dRate * insp, escRate = dRate * (1 - insp);
    const energyUnit = { S: CFG.capEq.S * CFG.energyPerEq * (energyIdx / 100) * pf, P: CFG.capEq.P * CFG.energyPerEq * (energyIdx / 100) * pf };
    const energyCost = prod.S * energyUnit.S + prod.P * energyUnit.P;
    let scrapCost = 0;
    for (const s of SEGS) {
      if (prod[s] <= 0) continue;
      const unitCost = CFG.kits[s] * pf * kitCostUnit + energyUnit[s];
      const good = prod[s] * (1 - scrapRate);
      scrapCost += (prod[s] - good) * unitCost;
      const newInv = f.inv[s] + good;
      f.invCost[s] = newInv > 0 ? (f.inv[s] * f.invCost[s] + good * unitCost) / newInv : f.invCost[s];
      f.inv[s] = newInv;
      prod[s] = good;
    }
    f.cash -= energyCost;
    const salary = G.macro.salaryBase * f.salaryIndex * CFG.shiftPremium[f.shifts];
    const labor = f.operators * salary + overtimeOps * salary * 1.5;
    r.ops = {
      lines: nL, shifts: f.shifts, operators: f.operators, needed, overtimeOps, machineCapEq, avail, perf, grossCapEq, capEq,
      planEq, prodEq, prod: { ...prod }, plan: { ...d.production }, bottleneck, laborRatio, dRate, insp, scrapRate, escRate,
      trs: avail * perf * (1 - dRate), util: machineCapEq > 0 ? prodEq / machineCapEq : 0, kitsUsed, energyCost, scrapCost,
      condition: f.condition, skill: f.skill, breakdown, strike, pf,
    };
    r.pnl.labor = labor; r.pnl.scrap = scrapCost;
    r.incidents = breakdown ? 120 : 0;
    r.strike = strike;
  }

  // 6. Livraison des appels d'offres gagnés au trimestre précédent
  for (const f of G.firms) {
    const r = R[f.id];
    r.tender = null;
    if (f.tenderCommit) {
      const c = f.tenderCommit;
      const delivered = Math.min(c.units, Math.floor(f.inv[c.seg]));
      f.inv[c.seg] -= delivered;
      const shortfall = c.units - delivered;
      const penalty = shortfall * c.price * 0.3;
      r.tender = { ...c, delivered, shortfall, revenue: delivered * c.price, cogs: delivered * f.invCost[c.seg], penalty };
      if (shortfall > 0) { f.reputation = clamp(f.reputation - 5, 0, 100); r.events.push({ kind: 'penalite', text: `Appel d'offres : ${shortfall} u. non livrées, pénalité ${r0(penalty)} k€ et réputation −5.` }); }
      else r.notes.push(`Appel d'offres livré : ${delivered} u. ${SEG_LABEL[c.seg]} à ${c.price.toFixed(2)} k€.`);
      f.tenderCommit = null;
    }
  }

  // 7. Marché
  const refP = refPrices(G);
  const base = marketDemandBase(G, q);
  // production des concurrents non-joueurs
  for (const n of G.npcs) {
    if (n.acquiredBy) continue;
    npcPlan(G, n, refP, base, q);
  }
  const mkt = { q, base, refP, seg: {} };
  for (const s of SEGS) {
    const ents = activeEntities(G).filter((e) => e.presence[s] > 0 && (e.kind === 'npc' ? e.segs.includes(s) : dec[e.id].offer[s]));
    const techAvg = ents.length ? sum(ents.map((e) => e.tech[s])) / ents.length : 20;
    const price = (e) => (e.kind === 'npc' ? e.price[s] : dec[e.id].price[s]);
    const A = ents.map((e) => attract(G, e, s, price(e), techAvg, refP[s]));
    const At = sum(A);
    const shares = A.map((a) => (At > 0 ? a / At : 0));
    const avgP = sum(ents.map((e, i) => shares[i] * price(e))) || refP[s];
    const total = base[s] * Math.pow(avgP / refP[s], -CFG.marketElasticity[s]);
    const demand = shares.map((sh) => total * sh);
    const availU = ents.map((e) => Math.max(0, e.inv[s]));
    const sales = demand.map((dm, i) => Math.min(dm, availU[i]));
    const unmet = sum(demand.map((dm, i) => Math.max(0, dm - availU[i])));
    const spare = ents.map((e, i) => availU[i] - sales[i]);
    const Asp = sum(A.filter((_, i) => spare[i] > 1e-9));
    const extra = ents.map((e, i) => (spare[i] > 1e-9 && Asp > 0 ? Math.min(spare[i], 0.5 * unmet * A[i] / Asp) : 0));
    const rows = [];
    ents.forEach((e, i) => {
      const sold = sales[i] + extra[i];
      e.inv[s] = Math.max(0, e.inv[s] - sold);
      e.fill[s] = demand[i] > 0 ? sales[i] / demand[i] : 1;
      e.lastDemand[s] = demand[i];
      e.lastSales[s] = sold;
      rows.push({ id: e.id, name: e.name, kind: e.kind, price: price(e), demand: demand[i], sales: sold, lost: Math.max(0, demand[i] - sales[i]), extra: extra[i], share: 0 });
    });
    const soldTot = sum(rows.map((x) => x.sales));
    rows.forEach((x) => { x.share = soldTot > 0 ? x.sales / soldTot : 0; });
    // segments non offerts par une équipe
    for (const f of G.firms) if (!ents.includes(f)) { f.lastDemand[s] = 0; f.lastSales[s] = 0; f.fill[s] = 1; }
    mkt.seg[s] = { total, avgP, techAvg, unmet, rows, soldTot };
  }
  for (const n of G.npcs) {
    if (n.acquiredBy) continue;
    const rev = sum(SEGS.map((s) => n.lastSales[s] * n.price[s]));
    n.revHist.push(rev); if (n.revHist.length > 8) n.revHist.shift();
    for (const s of n.segs) n.tech[s] += (s === 'P' ? 1.7 : 1.4) * uni(G, 0.8, 1.2);
    for (const s of SEGS) n.brand[s] = 0.65 * n.brand[s] + n.mkt[s];
    for (const l of n.lines) l.age += 1;
  }

  // 8. Conséquences post-marché : qualité, réputation, marque, technologie, RH
  for (const f of G.firms) {
    const r = R[f.id]; const d = dec[f.id]; const o = r.ops;
    const rev = sum(SEGS.map((s) => f.lastSales[s] * d.price[s]));
    const cogs = sum(SEGS.map((s) => f.lastSales[s] * f.invCost[s]));
    const warranty = sum(SEGS.map((s) => f.lastSales[s] * o.escRate * CFG.warranty[s]));
    let recall = false;
    if (G.settings.events && o.escRate > 0.02 && rand(G) < Math.min(0.6, (o.escRate - 0.02) * 12)) {
      recall = true; r.incidents += 350; f.reputation = clamp(f.reputation - 10, 0, 100);
      r.events.push({ kind: 'rappel', text: 'Rappel produit : 350 k€ de coûts et réputation −10.' });
    }
    const demTot = f.lastDemand.S + f.lastDemand.P;
    const fillAvg = demTot > 0 ? (f.fill.S * f.lastDemand.S + f.fill.P * f.lastDemand.P) / demTot : 1;
    const repTarget = clamp(70 - 500 * o.escRate - 35 * (1 - fillAvg) + (certOk(f) ? 8 : 0), 5, 95);
    f.reputation = clamp(0.75 * f.reputation + 0.25 * repTarget, 0, 100);
    for (const s of SEGS) f.brand[s] = 0.65 * f.brand[s] + d.marketing[s];
    for (const s of SEGS) if (d.rd[s] > 0) f.tech[s] += techGain(d.rd[s]) * uni(G, 0.85, 1.15);
    f.process += d.rd.process;
    // certification : obtention / suspension
    if (f.cert.status === 'progress' && f.cert.q >= 2) { f.cert = { status: 'ok', q: 0 }; r.events.push({ kind: 'cert', text: 'Certification qualité obtenue.' }); }
    else if (f.cert.status === 'ok' && o.escRate > 0.04) { f.cert = { status: 'suspended', q: 2 }; r.events.push({ kind: 'cert', text: 'Certification suspendue : taux de défauts livrés > 4 %.' }); }
    else if (f.cert.status === 'suspended') { f.cert.q -= 1; if (f.cert.q <= 0 && o.escRate <= 0.04) f.cert = { status: 'ok', q: 0 }; }
    // compétences, état machines, climat social
    const tau = f.operators > 0 ? d.training / f.operators : 0;
    f.skill = clamp(0.85 * f.skill + 0.15 * (25 + 75 * tau / (tau + 1.0)), 0, 100);
    const wear = 6 * CFG.shiftWear[f.shifts] * (1 + avgAge(f.lines) / 40);
    const mpl = f.lines.length ? d.maintenance / f.lines.length : 0;
    f.condition = clamp(f.condition - wear + (100 - f.condition) * (1 - Math.exp(-mpl / 150)), 0, 100);
    const climTarget = 60 + 120 * (f.salaryIndex - 1) + 0.15 * (f.skill - 50) - (f.shifts === 3 ? 10 : 0) - (f.surveillance > 0 ? 8 : 0) + (certOk(f) ? 3 : 0);
    f.climate = clamp(0.7 * f.climate + 0.3 * climTarget + (r.strike ? 10 : 0), 0, 100);
    if (G.settings.events) {
      const ef = 0.5 + 0.5 * scen.eventF;
      if (rand(G) < (0.015 + 0.04 * (1 - f.skill / 100) + (f.shifts === 3 ? 0.02 : 0)) * ef) {
        r.incidents += 100; f.climate = clamp(f.climate - 8, 0, 100); f.reputation = clamp(f.reputation - 1, 0, 100);
        r.events.push({ kind: 'accident', text: 'Accident du travail : 100 k€, climat social −8.' });
      }
      if (rand(G) < (0.02 + 0.05 * Math.max(0, (50 - f.climate) / 50)) * ef) {
        f.tech.S = Math.max(0, f.tech.S - 1.5); f.tech.P = Math.max(0, f.tech.P - 1.5);
        r.events.push({ kind: 'depart', text: "Départ d'un ingénieur clé : technologie −1,5 point sur les deux segments." });
      }
    }
    // âge des lignes et amortissements
    let dep = 0;
    for (const l of f.lines) { const before = lineNbv(l); l.age += 1; dep += before - lineNbv(l); }
    let amort = 0;
    for (const it of f.intangibles) { const a = Math.min(it.value, it.amort); it.value -= a; amort += a; }
    f.intangibles = f.intangibles.filter((it) => it.value > 0.01);
    r.sales = { S: f.lastSales.S, P: f.lastSales.P, rev, cogs, warranty, recall, fillAvg };
    r.dep = dep + amort; r.depLines = dep; r.amort = amort;
  }

  // diffusion technologique : les retardataires rattrapent une partie de l'écart
  for (const s of SEGS) {
    const avg = marketTechAvg(G, s);
    for (const e of activeEntities(G)) if (e.presence[s] > 0 && e.tech[s] < avg) e.tech[s] += CFG.techDiffusion * (avg - e.tech[s]);
  }

  // 9. Appels d'offres : attribution et annonce
  if (G.tender && G.tender.status === 'open') awardTender(G, dec, R, q, news);
  if (G.settings.tenders && !G.tender && q >= 2 && q < G.settings.nQuarters - 1 && rand(G) < 0.3) {
    const seg = rand(G) < 0.55 ? 'S' : 'P';
    const n = G.firms.length;
    const units = Math.round((seg === 'S' ? uni(G, 1200, 2400) : uni(G, 350, 750)) * (0.6 + 0.1 * n) / 10) * 10;
    const maxPrice = Math.round(refP[seg] * uni(G, 0.9, 1.0) * 100) / 100;
    G.tender = { id: `AO${q + 1}`, seg, units, maxPrice, quarter: q + 1, status: 'open', bids: {} };
    news.push({ t: q, kind: 'tender', text: `Appel d'offres ${G.tender.id} : ${units} u. ${SEG_LABEL[seg]}, prix plafond ${maxPrice.toFixed(2)} k€/u., livraison au trimestre suivant l'attribution.` });
  }

  // 10. Finance
  for (const f of G.firms) {
    const r = R[f.id]; const d = dec[f.id];
    const t = r.tender;
    const revenue = r.sales.rev + (t ? t.revenue : 0);
    const cogs = r.sales.cogs + (t ? t.cogs : 0);
    const integ = sum(f.integration.map((x) => x.cost));
    f.integration.forEach((x) => { x.left -= 1; });
    f.integration = f.integration.filter((x) => x.left > 0);
    const P = r.pnl;
    P.revenue = revenue; P.cogs = cogs;
    P.selling = revenue * CFG.sellingVar;
    P.hr = r.hr.hireCost + r.hr.fireCost;
    P.marketing = d.marketing.S + d.marketing.P;
    P.rd = d.rd.S + d.rd.P + d.rd.process;
    P.maintenance = d.maintenance; P.quality = d.quality; P.training = d.training;
    P.cert = r.certCost; P.study = d.study ? CFG.studyCost : 0;
    P.overhead = CFG.fixedOverhead + CFG.overheadPerLine * f.lines.length;
    P.warranty = r.sales.warranty;
    P.holding = CFG.holdingRate * (fgValue(f) + f.kits * f.kitCost);
    P.incidents = r.incidents; P.penalties = t ? t.penalty : 0; P.integration = integ;
    P.subsidiary = f.subsidiaryIncome;
    P.ebitda = P.revenue - P.cogs - P.scrap - P.labor - P.selling - P.hr - P.marketing - P.rd - P.maintenance - P.quality
      - P.training - P.cert - P.study - P.overhead - P.warranty - P.holding - P.incidents - P.penalties - P.integration + P.subsidiary;
    P.dep = r.dep; P.saleLoss = r.saleLoss;
    P.ebit = P.ebitda - P.dep - P.saleLoss;
    P.interest = f.debt * f.rate / 400 + f.overdraft * (G.macro.baseRate + CFG.odSpread) / 400;
    P.ebt = P.ebit - P.interest;
    let tax = 0;
    if (P.ebt < 0) f.taxLoss += -P.ebt;
    else { const use = Math.min(f.taxLoss, P.ebt); f.taxLoss -= use; tax = CFG.taxRate * (P.ebt - use); }
    P.tax = tax; P.ni = P.ebt - tax;
    // flux de trésorerie (les achats de kits, capex, énergie, financement ont déjà été passés)
    const recvNew = revenue * CFG.recvShare;
    const collections = f.receivables + revenue - recvNew;
    f.receivables = recvNew;
    const cashOpex = P.labor + P.selling + P.hr + P.marketing + P.rd + P.maintenance + P.quality + P.training + P.cert + P.study
      + P.overhead + P.warranty + P.holding + P.incidents + P.penalties + P.integration - P.subsidiary;
    f.cash += collections - cashOpex - P.interest - tax;
    // dividendes
    let div = 0;
    if (d.dividend > 0) {
      if (f.surveillance > 0) r.notes.push('Dividende bloqué : entreprise sous surveillance bancaire.');
      else {
        div = Math.max(0, Math.min(d.dividend, f.cash, f.retained + P.ni));
        if (div < d.dividend) r.notes.push(`Dividende limité à ${r0(div)} k€ (trésorerie ou réserves insuffisantes).`);
      }
    }
    f.cash -= div;
    f.retained += P.ni - div;
    if (div > 0) { f.cumDivPS += div / f.shares; f.divTotal += div; }
    // découvert et crédit d'urgence
    if (f.cash < 0) { f.overdraft += -f.cash; f.cash = 0; }
    else if (f.overdraft > 0) { const rep = Math.min(f.cash, f.overdraft); f.overdraft -= rep; f.cash -= rep; }
    const odLim = Math.max(1500, 0.35 * revenue);
    let emergency = 0;
    if (f.overdraft > odLim) {
      emergency = f.overdraft - odLim;
      f.overdraft = odLim; f.debt += emergency;
      f.surveillance = 4; f.reputation = clamp(f.reputation - 3, 0, 100);
      r.events.push({ kind: 'urgence', text: `Crédit d'urgence de ${r0(emergency)} k€ imposé par la banque : surveillance 4 trimestres (dividendes bloqués, prime de risque majorée).` });
      news.push({ t: q, kind: 'finance', text: `${f.name} obtient un crédit d'urgence et passe sous surveillance bancaire.` });
    } else if (f.surveillance > 0) f.surveillance -= 1;
    if (f.surveillance > 0) f.rate = Math.max(f.rate, G.macro.baseRate + CFG.emergencySpread);
    r.cf = { start: r.cashStart, collections, kitsPaid: r.kitsPaid, energy: r.ops.energyCost, opex: cashOpex, interest: P.interest, tax,
      capex: r.capex, saleProceeds: r.saleProceeds, acquisition: r.acqPaid || 0, loan: r.fin.loan, repay: r.fin.repay, equity: r.fin.equity,
      dividend: div, end: f.cash, overdraft: f.overdraft, emergency };
    // historiques & valorisation
    f.ebitdaHist.push(P.ebitda); if (f.ebitdaHist.length > 8) f.ebitdaHist.shift();
    f.rdHist.push(P.rd); if (f.rdHist.length > 8) f.rdHist.shift();
    f.revHist.push(revenue); if (f.revHist.length > 12) f.revHist.shift();
    f.cum.rd += P.rd; f.cum.capex += r.capex; f.cum.mkt += P.marketing; f.cum.training += P.training;
    f.cum.maint += P.maintenance; f.cum.quality += P.quality;
    f.lastDec = dec[f.id];
  }
  for (const f of G.firms) valuate(G, f);

  // 11. Bilans, indicateurs, rapports
  const revAll = sum(G.firms.map((f) => f.revHist[f.revHist.length - 1])) + sum(G.npcs.filter((n) => !n.acquiredBy).map((n) => n.revHist[n.revHist.length - 1]));
  for (const f of G.firms) {
    const r = R[f.id]; const P = r.pnl;
    const bs = balanceSheet(f);
    r.bs = bs;
    const capEmployed = bookEquity(f) + f.debt + f.overdraft - f.cash;
    const e = ttm(f.ebitdaHist);
    const shareOf = (s) => mkt.seg[s].rows.find((x) => x.id === f.id)?.share ?? 0;
    const h = {
      q, revenue: P.revenue, ebitda: P.ebitda, ebit: P.ebit, ni: P.ni, cash: f.cash, debt: f.debt, overdraft: f.overdraft,
      equity: bookEquity(f), vps: f.vps, tsr: f.tsr, marketCap: f.marketCap, shareS: shareOf('S'), shareP: shareOf('P'),
      revShare: revAll > 0 ? P.revenue / revAll : 0, rep: f.reputation, climate: f.climate, trs: r.ops.trs, util: r.ops.util,
      fill: r.sales.fillAvg, techS: f.tech.S, techP: f.tech.P, priceS: dec[f.id].price.S, priceP: dec[f.id].price.P,
      capEq: r.ops.capEq, prodEq: r.ops.prodEq, salesS: f.lastSales.S, salesP: f.lastSales.P, demandS: f.lastDemand.S, demandP: f.lastDemand.P,
      escRate: r.ops.escRate, dRate: r.ops.dRate, roce: capEmployed > 0 ? (4 * P.ebit) / capEmployed : 0,
      margin: P.revenue > 0 ? P.ebit / P.revenue : 0, leverage: e > 0 ? netDebt(f) / e : null, rating: f.rating,
      lines: f.lines.length, operators: f.operators, invS: f.inv.S, invP: f.inv.P, kits: f.kits, cumDivPS: f.cumDivPS,
      wc: f.receivables + fgValue(f) + f.kits * f.kitCost - f.payables,
    };
    f.history.push(h);
    r.q = q; r.kpi = h;
    r.balanceCheck = Math.abs(bs.assets - bs.liabilities - bs.equity);
    f.report = r;
  }
  for (const f of G.firms) {
    const r = R[f.id];
    r.market = publicMarketView(G, mkt, f, dec[f.id].study);
    r.diag = diagnose(G, f, r, mkt, dec[f.id]);
  }

  // 12. Cibles de croissance externe, actualités
  if (G.settings.ma) {
    for (const tg of G.targets) {
      if (tg.status === 'hidden' && q + 1 >= tg.from) {
        tg.status = 'open';
        news.push({ t: q, kind: 'ma', text: `${tg.name} est à vendre (prix plancher ${r0(targetAsk(G, tg))} k€). Offres sous pli scellé au prochain trimestre.` });
      }
    }
  }
  G.market.history.push({ q, total: { S: mkt.seg.S.total, P: mkt.seg.P.total }, avgP: { S: mkt.seg.S.avgP, P: mkt.seg.P.avgP },
    kitIndex: G.macro.kitIndex, energyIndex: energyIdx, baseRate: G.macro.baseRate, refP: { ...refP } });
  G.lastMarket = { q, seg: { S: stripRows(mkt.seg.S), P: stripRows(mkt.seg.P) } };
  G.news.push(...news);
  G.decisions = {};
  G.t = q;
  if (G.t >= G.settings.nQuarters) {
    G.phase = 'finished';
    G.news.push({ t: q, kind: 'info', text: 'Fin de la partie : débriefing final disponible.' });
  }
  return G;
}

function stripRows(seg) {
  return { total: seg.total, avgP: seg.avgP, techAvg: seg.techAvg, unmet: seg.unmet, rows: seg.rows.map((x) => ({ ...x })) };
}

function applyGlobalEvent(G, id, q, news) {
  const ev = GLOBAL_EVENTS[id];
  if (!ev) return;
  const M = G.macro;
  switch (id) {
    case 'mp': M.kitIndex = clamp(M.kitIndex * 1.2, 60, 200); break;
    case 'energie': M.effects.push({ id, until: q + 2, energy: 1.45 }); break;
    case 'recession':
      if (M.effects.some((e) => e.id === 'reprise' || e.id === 'recession')) return;
      M.effects.push({ id, until: q + 3, demand: 0.88 }); break;
    case 'reprise':
      if (M.effects.some((e) => e.id === 'reprise' || e.id === 'recession')) return;
      M.effects.push({ id, until: q + 3, demand: 1.08 }); break;
    case 'penurie': M.effects.push({ id, until: q + 1, relDrop: { A: 0.25, B: 0.10, C: 0.02 } }); break;
    case 'taux': M.baseRate = Math.min(8, M.baseRate + 1.25); break;
    case 'detente': if (M.baseRate <= 1.5) return; M.baseRate = Math.max(1, M.baseRate - 1); break;
    case 'salaires': M.salaryBase *= 1.04; break;
    case 'norme':
      if (G.norm.status !== 'none') return;
      G.norm = { status: 'announced', at: q }; break;
    default: return;
  }
  news.push({ t: q, kind: 'event', text: `${ev.label} — ${ev.text}` });
}

function npcPlan(G, n, refP, base, q) {
  const capEq = n.lines.length * n.shifts * CFG.lineCap * 0.82;
  const growth = { S: 1 + CFG.growth.S, P: 1 + CFG.growth.P };
  const season = CFG.season[(q - 1) % 4] / CFG.season[(q + 2) % 4];
  const want = {};
  for (const s of SEGS) want[s] = n.segs.includes(s) ? Math.max(0, n.lastDemand[s] * growth[s] * season * 1.05 - n.inv[s]) : 0;
  const wantEq = eqOf(want);
  const sc = wantEq > capEq ? capEq / wantEq : 1;
  for (const s of SEGS) n.inv[s] += want[s] * sc;
  for (const s of n.segs) {
    let f = n.price[s] / refP[s];
    if (n.fill[s] < 0.95) f *= 1.02; else if (n.inv[s] > 0.6 * Math.max(1, n.lastDemand[s])) f *= 0.98;
    f += 0.15 * (n.priceF[s] - f);
    n.price[s] = refP[s] * clamp(f, 0.85, 1.15);
  }
}

function resolveAcquisitions(G, dec, R, q, news) {
  for (const tg of G.targets) {
    if (tg.status !== 'open') continue;
    const ask = targetAsk(G, tg);
    const bids = [];
    for (const f of G.firms) {
      const b = dec[f.id].acqBid;
      if (!b || b.targetId !== tg.id) continue;
      if (b.price < ask) { R[f.id].notes.push(`Offre sur ${tg.name} rejetée : inférieure au prix plancher (${r0(ask)} k€).`); continue; }
      const funds = f.cash + Math.max(0, overdraftLimit(f) - f.overdraft);
      if (funds < b.price) { R[f.id].notes.push(`Offre sur ${tg.name} rejetée : financement insuffisant (${r0(funds)} k€ mobilisables). Levez d'abord de la dette ou des fonds propres.`); continue; }
      bids.push({ f, price: b.price, tie: rand(G) });
    }
    if (!bids.length) continue;
    bids.sort((a, b) => b.price - a.price || b.tie - a.tie);
    const win = bids[0];
    for (const l of bids.slice(1)) R[l.f.id].notes.push(`${tg.name} : surenchérie par une autre équipe.`);
    executeAcquisition(G, win.f, tg, win.price, R[win.f.id], q);
    news.push({ t: q, kind: 'ma', text: `${win.f.name} rachète ${tg.name} pour ${r0(win.price)} k€ (${bids.length} offre${bids.length > 1 ? 's' : ''} recevable${bids.length > 1 ? 's' : ''}).` });
  }
}

function executeAcquisition(G, f, tg, price, r, q) {
  f.cash -= price;
  if (f.cash < 0) { f.overdraft += -f.cash; f.cash = 0; }
  r.acqPaid = price;
  tg.status = 'sold'; tg.owner = f.id; tg.price = price; tg.q = q;
  f.acquisitions.push({ id: tg.id, name: tg.name, price, q });
  f.cum.acquisitions += price;
  f.integration.push({ left: 2, cost: 0.05 * price });
  if (tg.type === 'competitor') {
    const n = G.npcs.find((x) => x.id === tg.id);
    n.acquiredBy = f.id;
    const linesNbv = sum(n.lines.map(lineNbv));
    const invVal = sum(SEGS.map((s) => n.inv[s] * CFG.refPrice[s] * 0.4));
    const nl = f.lines.length;
    f.lines.push(...n.lines.map((l) => ({ ...l })));
    f.condition = (f.condition * nl + 62 * n.lines.length) / f.lines.length;
    if (f.operators + n.operators > 0) f.skill = (f.skill * f.operators + 45 * n.operators) / (f.operators + n.operators);
    f.operators += n.operators;
    const retention = uni(G, 0.55, 0.85);
    for (const s of n.segs) {
      f.presence[s] += n.presence[s] * retention;
      f.brand[s] += 0.5 * n.brand[s];
      f.tech[s] = Math.max(f.tech[s], n.tech[s]);
      const add = n.inv[s];
      if (add > 0) { const unit = CFG.refPrice[s] * 0.4; f.invCost[s] = (f.inv[s] * f.invCost[s] + add * unit) / (f.inv[s] + add); f.inv[s] += add; }
    }
    f.goodwill += Math.max(0, price - linesNbv - invVal);
    if (price < linesNbv + invVal) f.retained += linesNbv + invVal - price; // badwill (cas théorique)
    f.climate = clamp(f.climate - 6, 0, 100);
    r.events.push({ kind: 'ma', text: `Acquisition de ${tg.name} : +${n.lines.length} lignes, +${n.operators} opérateurs, rétention clients ${Math.round(retention * 100)} %. Coûts d'intégration : ${r0(0.05 * price)} k€/trim. pendant 2 trimestres.` });
  } else if (tg.type === 'supplier') {
    f.captive = true; f.hedge = null;
    f.participation += price;
    f.subsidiaryIncome += 0.025 * price;
    r.events.push({ kind: 'ma', text: `Acquisition de ${tg.name} : approvisionnement intégré (kits −18 %, fiabilité 99,5 %, qualité supérieure).` });
  } else if (tg.type === 'startup') {
    f.tech.S += 6; f.tech.P += 6; f.process += 3000;
    f.intangibles.push({ label: 'Technologie acquise', value: price, amort: price / 12 });
    r.events.push({ kind: 'ma', text: `Acquisition de ${tg.name} : +6 points de technologie, +3 000 k€ de R&D procédé. Actif incorporel amorti sur 12 trimestres.` });
  }
}

function awardTender(G, dec, R, q, news) {
  const T = G.tender;
  const bids = [];
  for (const f of G.firms) {
    const p = dec[f.id].tenderBid;
    if (p == null) continue;
    if (p > T.maxPrice) { R[f.id].notes.push(`Offre ${T.id} irrecevable : au-dessus du prix plafond.`); continue; }
    const score = p / T.maxPrice - 0.004 * (f.reputation - 60) - (certOk(f) ? 0.03 : 0);
    bids.push({ f, p, score, tie: rand(G) });
    T.bids[f.id] = p;
  }
  T.status = 'closed';
  if (!bids.length) { news.push({ t: q, kind: 'tender', text: `${T.id} attribué à un concurrent hors panel (aucune offre recevable).` }); G.tender = null; return; }
  bids.sort((a, b) => a.score - b.score || a.tie - b.tie);
  const w = bids[0];
  w.f.tenderCommit = { id: T.id, seg: T.seg, units: T.units, price: w.p };
  R[w.f.id].events.push({ kind: 'tender', text: `${T.id} remporté : ${T.units} u. ${SEG_LABEL[T.seg]} à ${w.p.toFixed(2)} k€, à livrer au prochain trimestre (pénalité 30 % sur le non-livré).` });
  news.push({ t: q, kind: 'tender', text: `${T.id} remporté par ${w.f.name} à ${w.p.toFixed(2)} k€/u. (${bids.length} offre${bids.length > 1 ? 's' : ''}).` });
  G.tender = null;
}

export function balanceSheet(f) {
  const lines = sum(f.lines.map(lineNbv));
  const pending = sum(f.pending.map((p) => p.cost));
  const intangibles = sum(f.intangibles.map((i) => i.value));
  const fg = fgValue(f); const kits = f.kits * f.kitCost;
  const assets = lines + pending + f.goodwill + f.participation + intangibles + fg + kits + f.receivables + f.cash;
  const equity = bookEquity(f);
  return {
    lines, pending, goodwill: f.goodwill, participation: f.participation, intangibles, fg, kits, receivables: f.receivables, cash: f.cash,
    assets, equity, shareCapital: f.shareCapital, retained: f.retained, debt: f.debt, overdraft: f.overdraft, payables: f.payables,
    liabilities: f.debt + f.overdraft + f.payables,
  };
}

function publicMarketView(G, mkt, f, study) {
  const rows = [];
  for (const e of activeEntities(G)) {
    const row = { id: e.id, name: e.name, kind: e.kind, color: e.color || '#888', price: {}, share: {}, sales: {} };
    for (const s of SEGS) {
      const x = mkt.seg[s].rows.find((y) => y.id === e.id);
      row.price[s] = x ? x.price : null; row.share[s] = x ? x.share : 0; row.sales[s] = x ? x.sales : 0;
    }
    if (e.kind === 'team') { row.revenue = e.revHist[e.revHist.length - 1]; row.vps = e.vps; row.ni = e.report?.pnl?.ni; }
    if (study || e.id === f.id) {
      row.detail = { tech: { ...e.tech }, reputation: e.reputation, brand: { ...e.brand }, lines: e.lines.length,
        capacityEq: e.lines.length * (e.shifts || 1) * CFG.lineCap, cert: certOk(e) };
    }
    rows.push(row);
  }
  return { rows, total: { S: mkt.seg.S.total, P: mkt.seg.P.total }, avgP: { S: mkt.seg.S.avgP, P: mkt.seg.P.avgP },
    techAvg: { S: mkt.seg.S.techAvg, P: mkt.seg.P.techAvg }, study };
}

// ---------- diagnostics pédagogiques ----------
const fmt = (x) => Math.round(x).toLocaleString('fr-FR');
const pct = (x, k = 0) => `${(x * 100).toFixed(k).replace('.', ',')} %`;

function diagnose(G, f, r, mkt, d) {
  const out = [];
  const o = r.ops; const P = r.pnl;
  const add = (level, text, w = 1) => out.push({ level, text, w });
  for (const s of SEGS) {
    const row = mkt.seg[s].rows.find((x) => x.id === f.id);
    if (!row || row.demand <= 0) continue;
    const lostShare = row.lost / row.demand;
    if (lostShare > 0.03) {
      const cause = o.bottleneck !== 'aucun' ? `goulot : ${o.bottleneck}` : (o.plan[s] < row.demand ? 'plan de production inférieur à la demande' : 'stock insuffisant');
      add('alerte', `Ruptures en ${SEG_LABEL[s]} : ${fmt(row.lost)} u. de demande non servie, soit ≈ ${fmt(row.lost * row.price)} k€ de chiffre d'affaires manqué (${cause}). Les ruptures dégradent aussi la réputation et l'attractivité du trimestre suivant.`, 3 + lostShare * 10);
    }
    const inv = f.inv[s];
    if (row.sales > 0 && inv > 0.6 * row.sales) add('alerte', `Surstock ${SEG_LABEL[s]} : ${fmt(inv)} u. en fin de trimestre (${(inv / row.sales).toFixed(1).replace('.', ',')} trimestre de ventes). Coût de possession 2,5 %/trimestre et capital immobilisé.`, 2);
    const avg = mkt.seg[s].avgP;
    const gap = row.price / avg - 1;
    if (Math.abs(gap) > 0.08) add('info', `Prix ${SEG_LABEL[s]} ${gap > 0 ? 'supérieur' : 'inférieur'} de ${pct(Math.abs(gap))} à la moyenne du marché (${avg.toFixed(2).replace('.', ',')} k€). Part de marché ${pct(row.share, 1)}.`, 1);
  }
  if (o.bottleneck === 'kits') add('alerte', `Production bridée par les composants : stock de kits insuffisant (taux de livraison fournisseurs ${pct(r.purchase.rate)}). Prévoyez un stock de sécurité ou un fournisseur plus fiable.`, 4);
  if (o.bottleneck === "main-d'œuvre") add('alerte', `Production bridée par la main-d'œuvre : ${fmt(o.operators)} opérateurs pour ${fmt(o.needed)} requis (${o.lines} lignes × ${o.shifts} équipes × 15).`, 4);
  if (o.bottleneck === 'machines') add('alerte', `Capacité machines saturée : ${fmt(o.capEq)} éq. produits au maximum. Options : équipe supplémentaire, investissement (délai d'un trimestre), amélioration du TRS.`, 3);
  if (o.util < 0.65 && o.machineCapEq > 0) add('info', `Taux de charge faible (${pct(o.util)}) : les coûts fixes (amortissements, frais de structure, salaires) sont mal absorbés.`, 2);
  if (o.avail < 0.86) add('alerte', `Disponibilité machines ${pct(o.avail)} : état du parc à ${fmt(o.condition)}/100. La maintenance est un investissement différé, pas une économie.`, 2);
  if (o.dRate > 0.055) add('alerte', `Taux de défauts à la source ${pct(o.dRate, 1)} : leviers = qualité des composants, formation, état des machines, certification.`, 2);
  if (o.escRate > 0.02) add('alerte', `Défauts livrés aux clients ${pct(o.escRate, 1)} : garantie ${fmt(P.warranty)} k€ et réputation en baisse. Le contrôle qualité intercepte ${pct(o.insp)} des défauts.`, 3);
  if (f.climate < 40) add('alerte', `Climat social dégradé (${fmt(f.climate)}/100) : risque de grève et de départs. Leviers : salaires, formation, éviter les licenciements et la 3e équipe.`, 3);
  if (f.overdraft > 0) add('alerte', `Découvert de ${fmt(f.overdraft)} k€ au taux de ${(G.macro.baseRate + CFG.odSpread).toFixed(1).replace('.', ',')} % : préférez un financement long terme pour les investissements.`, 3);
  const lev = ttm(f.ebitdaHist) > 0 ? netDebt(f) / ttm(f.ebitdaHist) : null;
  if (lev != null && lev > 3) add('alerte', `Levier élevé : dette nette = ${lev.toFixed(1).replace('.', ',')} × EBITDA annuel (notation ${f.rating}). Capacité d'emprunt quasi épuisée.`, 2);
  const margin = P.revenue > 0 ? P.ebit / P.revenue : 0;
  if (margin < 0) add('alerte', `Résultat d'exploitation négatif (${fmt(P.ebit)} k€). Point mort non atteint.`, 4);
  else if (margin > 0.14) add('bon', `Marge opérationnelle de ${pct(margin, 1)} : supérieure à la cible sectorielle (10 %).`, 1);
  const techGap = f.tech.P - mkt.seg.P.techAvg;
  if (techGap < -4) add('alerte', `Retard technologique en Premium (${techGap.toFixed(1).replace('.', ',')} points sous la moyenne) : l'attractivité Premium en pâtit fortement.`, 2);
  if (G.norm.status !== 'none' && f.cert.status !== 'ok') add('alerte', `Norme Premium ${G.norm.status === 'active' ? 'en vigueur' : 'annoncée'} : sans certification, l'attractivité Premium est réduite de 20 %.`, 3);
  if (r.purchase.rate < 0.9 && r.purchase.ordered > 0) add('info', `Seuls ${pct(r.purchase.rate)} des kits commandés ont été livrés.`, 1);
  if (out.filter((x) => x.level === 'alerte').length === 0) add('bon', 'Aucun dysfonctionnement majeur détecté ce trimestre.', 0.5);
  return out.sort((a, b) => b.w - a.w).slice(0, 7);
}

// ---------- classement et débriefing ----------
export function ranking(G) {
  return [...G.firms].sort((a, b) => b.tsr - a.tsr).map((f, i) => ({ rank: i + 1, id: f.id, name: f.name, color: f.color, ai: f.ai || null, tsr: f.tsr, vps: f.vps,
    revenue: f.revHist[f.revHist.length - 1], ni: f.report?.pnl?.ni ?? null, cumDivPS: f.cumDivPS, rating: f.rating }));
}

export function finalDebrief(G) {
  const teams = G.firms.map((f) => {
    const H = f.history;
    const n = H.length || 1;
    const avg = (k) => sum(H.map((h) => h[k] ?? 0)) / n;
    const last = H[H.length - 1] || {};
    return {
      id: f.id, name: f.name, color: f.color, ai: f.ai || null, tsr: f.tsr, vps: f.vps, vps0: f.vps0, cumDivPS: f.cumDivPS,
      revenueTot: sum(H.map((h) => h.revenue)), niTot: sum(H.map((h) => h.ni)), ebitTot: sum(H.map((h) => h.ebit)),
      avgMargin: avg('margin'), avgRoce: avg('roce'), avgTrs: avg('trs'), avgUtil: avg('util'), avgFill: avg('fill'), avgEsc: avg('escRate'),
      lastRep: last.rep, lastClimate: last.climate, lastTechP: last.techP, lastTechS: last.techS, lastShareS: last.shareS, lastShareP: last.shareP,
      lastLev: last.leverage, rating: f.rating, cum: { ...f.cum }, acquisitions: f.acquisitions.map((a) => a.name), lines: f.lines.length,
      certified: certOk(f),
    };
  });
  teams.sort((a, b) => b.tsr - a.tsr);
  const best = (k, dir = 1) => teams.reduce((b, t) => ((t[k] ?? -Infinity) * dir > (b[k] ?? -Infinity) * dir ? t : b), teams[0]);
  const lessons = [];
  const corr = (xs, ys) => {
    const mx = sum(xs) / xs.length, my = sum(ys) / ys.length;
    const num = sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
    const den = Math.sqrt(sum(xs.map((x) => (x - mx) ** 2)) * sum(ys.map((y) => (y - my) ** 2)));
    return den > 0 ? num / den : 0;
  };
  if (teams.length >= 3) {
    const pairs = [
      ['avgTrs', 'TRS moyen', "l'excellence opérationnelle (TRS)"],
      ['avgFill', 'taux de service', 'le taux de service (absence de ruptures)'],
      ['avgMargin', 'marge', 'la marge opérationnelle'],
    ];
    for (const [k, , label] of pairs) {
      const c = corr(teams.map((t) => t[k]), teams.map((t) => t.tsr));
      if (Math.abs(c) > 0.5) lessons.push(`Dans cette partie, ${label} est ${c > 0 ? 'positivement' : 'négativement'} corrélé(e) à la création de valeur (r = ${c.toFixed(2).replace('.', ',')}).`);
    }
    const cR = corr(teams.map((t) => t.cum.rd), teams.map((t) => t.lastShareP));
    if (Math.abs(cR) > 0.5) lessons.push(`L'effort de R&D cumulé explique une part notable des positions finales en Premium (r = ${cR.toFixed(2).replace('.', ',')}).`);
  }
  const lev = best('lastLev');
  if (lev && lev.lastLev != null && lev.lastLev > 3) lessons.push(`${lev.name} termine avec un levier de ${lev.lastLev.toFixed(1).replace('.', ',')} × EBITDA : la croissance financée par dette accroît la valeur tant que la rentabilité dépasse le coût de la dette, et l'expose fortement aux chocs.`);
  const acq = teams.filter((t) => t.acquisitions.length);
  if (acq.length) lessons.push(`Croissance externe : ${acq.map((t) => `${t.name} (${t.acquisitions.join(', ')})`).join(' ; ')}. À confronter au prix payé et au goodwill inscrit au bilan.`);
  return {
    teams, lessons,
    awards: [
      { label: 'Création de valeur (TSR)', team: teams[0]?.name },
      { label: 'Excellence opérationnelle (TRS moyen)', team: best('avgTrs')?.name },
      { label: 'Meilleur taux de service', team: best('avgFill')?.name },
      { label: 'Rentabilité (ROCE moyen)', team: best('avgRoce')?.name },
      { label: 'Qualité (défauts livrés les plus faibles)', team: best('avgEsc', -1)?.name },
      { label: 'Climat social', team: best('lastClimate')?.name },
    ],
  };
}

// ---------- outils animateur ----------
export function injectEvent(G, id) {
  if (!GLOBAL_EVENTS[id]) return G;
  const N = deepClone(G);
  N.injected = [...(N.injected || []), id];
  return N;
}

export function exportSave(G) { return JSON.stringify({ app: 'forge', version: VERSION, savedAt: new Date().toISOString(), game: G }); }
export function importSave(text) {
  const o = JSON.parse(text);
  const G = o && o.app === 'forge' ? o.game : o;
  if (!G || !Array.isArray(G.firms) || !G.settings || typeof G.t !== 'number') throw new Error('Fichier de sauvegarde invalide.');
  if (G.version !== VERSION) throw new Error(`Version de sauvegarde incompatible (${G.version}).`);
  for (const f of G.firms) if (f.ai != null && !aiOk(f.ai)) f.ai = null;
  return G;
}
