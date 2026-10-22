import { newGame, resolveQuarter } from '../src/engine.js';
import { STRATEGIES } from './bots.js';

export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function deepFinite(o, path = '') {
  if (typeof o === 'number') { if (!Number.isFinite(o)) throw new Error(`Non fini : ${path} = ${o}`); return; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) deepFinite(v, `${path}.${k}`);
}

export function play(strats, opts = {}) {
  const rnd = mulberry(opts.seed ?? 1);
  let G = newGame({ teams: strats.map((s, i) => `${s}-${i}`), nQuarters: opts.nQuarters ?? 20, seed: opts.seed ?? 1, scenario: opts.scenario ?? 'standard', ...opts });
  while (G.phase !== 'finished') {
    const dec = {};
    G.firms.forEach((f, i) => { dec[f.id] = STRATEGIES[strats[i]](G, f, rnd); });
    G = resolveQuarter(G, dec);
    if (opts.check) opts.check(G);
  }
  return G;
}

