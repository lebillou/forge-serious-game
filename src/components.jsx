// Forge — composants d'interface partagés (React 18, global)
import * as E from './engine.js';

export const { useState, useEffect, useMemo, useRef, useCallback, Fragment } = React;
export const { SEGS, SEG_LABEL, CFG } = E;

// ---------- formats ----------
export const NF = (d) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const nf0 = NF(0), nf1 = NF(1), nf2 = NF(2);
export const ok = (x) => typeof x === 'number' && Number.isFinite(x);
export const n0 = (x) => (ok(x) ? nf0.format(Math.round(x)) : '—');
export const ke = (x) => (ok(x) ? `${nf0.format(Math.round(x))} k€` : '—');
export const eu = (kx) => (ok(kx) ? `${nf0.format(Math.round(kx * 1000))} €` : '—');
export const pc = (x, d = 1) => (ok(x) ? `${NF(d).format(x * 100)} %` : '—');
export const sg = (x, f) => (ok(x) ? (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x)) : '—');
export const vpsF = (x) => (ok(x) ? `${nf2.format(x)} €` : '—');
export const shiftLabel = (s) => `${s}×8`;
export const QL = (q) => E.quarterLabel(q);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- petits composants ----------
export function Num({ id, value, onChange, step = 1, min = 0, max = 1e9, unit, scale = 1, decimals = 0, wide }) {
  const disp = (v) => (ok(v) ? NF(decimals).format(Math.round(v * scale * 10 ** decimals) / 10 ** decimals).replace(/ | /g, ' ') : '');
  const [txt, setTxt] = useState(disp(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(disp(value)); }, [value]);
  const commit = (n) => onChange(clamp(n, min, max) / scale);
  const parse = (s) => parseFloat(String(s).replace(/[\s  ]/g, '').replace(',', '.'));
  return (
    <span className={'num' + (wide ? ' wide' : '')}>
      <input id={id} inputMode="decimal" value={txt}
        onFocus={(e) => { focused.current = true; e.target.select(); }}
        onBlur={() => { focused.current = false; setTxt(disp(value)); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const cur = ok(value) ? value * scale : 0;
            const nv = clamp(cur + (e.key === 'ArrowUp' ? step : -step), min, max);
            setTxt(disp(nv / scale)); commit(nv);
          }
        }}
        onChange={(e) => { setTxt(e.target.value); const n = parse(e.target.value); if (Number.isFinite(n)) commit(n); }} />
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      <div className="field-ctl">{children}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Toggle({ id, checked, onChange, children }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function Modal({ title, children, onClose, actions }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Chip({ kind = 'neutral', children }) { return <span className={'chip chip-' + kind}>{children}</span>; }
export function Dot({ color }) { return <span className="dot" style={{ background: color }} />; }

export function niceTicks(lo, hi, count = 4) {
  const span = hi - lo; const raw = span / count;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || 10 * p;
  const start = Math.floor(lo / step) * step; const end = Math.ceil(hi / step) * step;
  const out = []; for (let v = start; v <= end + step / 2; v += step) out.push(Math.round(v / step) * step);
  return out;
}

export function LineChart({ series, xLabels, yFmt = n0, height = 200, includeZero = false }) {
  const W = 640, H = height, L = 64, R = 14, T = 12, B = 26;
  const vals = series.flatMap((s) => s.data.filter(ok));
  if (!vals.length) return <div className="empty">Pas encore de données : les courbes apparaissent après le premier trimestre.</div>;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (includeZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (hi - lo < 1e-9) { hi += Math.abs(hi) * 0.1 || 1; lo -= Math.abs(lo) * 0.1 || 1; }
  const ticks = niceTicks(lo, hi, 4); lo = ticks[0]; hi = ticks[ticks.length - 1];
  const n = Math.max(...series.map((s) => s.data.length));
  const x = (i) => (n <= 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const every = Math.ceil(n / 8);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 && lo < 0 ? 'axis0' : 'grid'} />
            <text x={L - 8} y={y(t)} className="tick" textAnchor="end" dominantBaseline="middle">{yFmt(t)}</text>
          </g>
        ))}
        {xLabels.map((lab, i) => ((i % every === 0 || i === n - 1) ? <text key={i} x={x(i)} y={H - 7} className="tick" textAnchor="middle">{lab}</text> : null))}
        {series.map((s) => {
          const pts = s.data.map((v, i) => (ok(v) ? [x(i), y(v)] : null)).filter(Boolean);
          if (!pts.length) return null;
          const d = 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L');
          const last = pts[pts.length - 1];
          return (
            <g key={s.label}>
              <path d={d} style={{ fill: 'none', stroke: s.color }} strokeWidth={s.thin ? 1.4 : 2.2} strokeDasharray={s.dash ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={last[0]} cy={last[1]} r="3.4" style={{ fill: s.color }} />
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <div className="legend">{series.map((s) => <span key={s.label}><Dot color={s.color} />{s.label}</span>)}</div>
      )}
    </div>
  );
}

export function Table({ head, rows, className = '', foot }) {
  return (
    <div className="table-wrap">
      <table className={'tbl ' + className}>
        <thead><tr>{head.map((h, i) => <th key={i} className={i ? 'r' : ''}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className={r.cls || ''}>{r.cells.map((c, j) => <td key={j} className={j ? 'r' : ''}>{c}</td>)}</tr>)}</tbody>
        {foot && <tfoot><tr>{foot.map((c, j) => <td key={j} className={j ? 'r' : ''}>{c}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}

export function Kpi({ label, value, sub, tone }) {
  return (
    <div className={'kpi' + (tone ? ' kpi-' + tone : '')}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// ---------- paramétrage ----------
export function Setup({ onStart, onCancel }) {
  const [n, setN] = useState(4);
  const [names, setNames] = useState(['Aubisque', 'Tourmalet', 'Soulor', 'Peyresourde', 'Aspin', 'Marie-Blanque']);
  const [nQ, setNQ] = useState(20);
  const [scenario, setScenario] = useState('standard');
  const [events, setEvents] = useState(true);
  const [tenders, setTenders] = useState(true);
  const [ma, setMa] = useState(true);
  const [seed, setSeed] = useState('');
  return (
    <div className="page narrow">
      <div className="page-head"><h1>Nouvelle partie</h1>{onCancel && <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>}</div>
      <div className="panel">
        <h2>Équipes</h2>
        <Field label="Nombre d'équipes" htmlFor="nteams">
          <div className="seg-ctl">{[2, 3, 4, 5, 6].map((k) => <button key={k} id={k === 2 ? 'nteams' : undefined} className={'seg-btn' + (k === n ? ' on' : '')} onClick={() => setN(k)}>{k}</button>)}</div>
        </Field>
        <div className="team-names">
          {names.slice(0, n).map((nm, i) => (
            <div key={i} className="team-name-row">
              <Dot color={E.TEAM_COLORS[i]} />
              <input id={`team-${i}`} value={nm} maxLength={24} onChange={(e) => { const c = [...names]; c[i] = e.target.value; setNames(c); }} />
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Format</h2>
        <Field label="Durée" htmlFor="nq" hint="Un trimestre prend 15 à 25 minutes en classe : 8 trimestres pour une demi-journée, 16 à 24 pour un module sur plusieurs séances.">
          <div className="seg-ctl">{[8, 12, 16, 20, 24].map((k) => <button key={k} id={k === 8 ? 'nq' : undefined} className={'seg-btn' + (k === nQ ? ' on' : '')} onClick={() => setNQ(k)}>{k} trim.</button>)}</div>
        </Field>
        <Field label="Environnement" htmlFor="scen" hint="Volatilité des coûts des composants et de l'énergie, amplitude du cycle, fréquence des chocs.">
          <div className="seg-ctl">{Object.entries(E.SCENARIOS).map(([k, s]) => <button key={k} id={k === 'stable' ? 'scen' : undefined} className={'seg-btn' + (k === scenario ? ' on' : '')} onClick={() => setScenario(k)}>{s.label}</button>)}</div>
        </Field>
        <div className="toggles">
          <Toggle id="opt-events" checked={events} onChange={setEvents}>Aléas (chocs économiques, pannes, grèves, rappels)</Toggle>
          <Toggle id="opt-tenders" checked={tenders} onChange={setTenders}>Appels d'offres</Toggle>
          <Toggle id="opt-ma" checked={ma} onChange={setMa}>Croissance externe (rachat de concurrents, fournisseur, start-up)</Toggle>
        </div>
        <Field label="Graine aléatoire (facultatif)" htmlFor="seed" hint="Deux parties lancées avec la même graine et les mêmes décisions donnent les mêmes résultats.">
          <input id="seed" className="txt" inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))} placeholder="aléatoire" />
        </Field>
      </div>
      <div className="row-end">
        <button className="btn btn-primary" onClick={() => onStart({ teams: names.slice(0, n), nQuarters: nQ, scenario, events, tenders, ma, seed: seed ? Number(seed) : undefined })}>Lancer la partie</button>
      </div>
    </div>
  );
}

// ---------- barre supérieure ----------
export function TopBar({ G, onHome, onRules, onSave, children }) {
  const q = G ? Math.min(G.t + 1, G.settings.nQuarters) : null;
  return (
    <header className="topbar">
      <div className="topbar-in">
        <button className="brand" onClick={onHome} title="Accueil">Forge</button>
        {G && (
          <div className="qbadge">
            <span className="qbadge-q">{G.phase === 'finished' ? 'Partie terminée' : QL(q)}</span>
            <span className="qbadge-sub">{G.phase === 'finished' ? `${G.settings.nQuarters} trimestres` : `trimestre ${q} / ${G.settings.nQuarters}`}</span>
          </div>
        )}
        <div className="topbar-actions">
          {children}
          {onSave && <button className="btn btn-sm" onClick={onSave}>Sauvegarder</button>}
          <button className="btn btn-sm btn-ghost" onClick={onRules}>Règles</button>
        </div>
      </div>
    </header>
  );
}


// ---------- panneaux du tableau de bord ----------
export function MarketPanel({ G, hideTargets }) {
  const mh = G.market.history;
  return (
    <div className="panel">
      <div className="panel-head"><h2>Marché</h2><span className="muted">données publiques</span></div>
      <div className="kpis kpis-4">
        <Kpi label="Indice composants" value={nf1.format(G.macro.kitIndex)} sub="base 100" />
        <Kpi label="Indice énergie" value={nf1.format(mh.length ? mh[mh.length - 1].energyIndex : G.macro.energyIndex)} sub="base 100" />
        <Kpi label="Taux directeur" value={`${nf2.format(G.macro.baseRate)} %`} sub="annuel" />
        <Kpi label="Norme Premium" value={G.norm.status === 'none' ? 'Aucune' : G.norm.status === 'announced' ? 'Annoncée' : 'En vigueur'} tone={G.norm.status === 'none' ? null : 'warn'} />
      </div>
      {mh.length > 0 && (
        <div className="grid2">
          <div>
            <h4>Demande totale (unités)</h4>
            <LineChart xLabels={mh.map((h) => QL(h.q))} series={[
              { label: 'Standard', color: 'var(--seg-s)', data: mh.map((h) => h.total.S) },
              { label: 'Premium', color: 'var(--seg-p)', data: mh.map((h) => h.total.P) },
            ]} height={170} />
          </div>
          <div>
            <h4>Prix moyen constaté (€)</h4>
            <LineChart xLabels={mh.map((h) => QL(h.q))} yFmt={(v) => nf0.format(v * 1000)} series={[
              { label: 'Standard', color: 'var(--seg-s)', data: mh.map((h) => h.avgP.S) },
              { label: 'Premium', color: 'var(--seg-p)', data: mh.map((h) => h.avgP.P) },
            ]} height={170} />
          </div>
        </div>
      )}
      {G.tender && G.tender.status === 'open' && (
        <div className="callout">
          <b>Appel d'offres {G.tender.id} ouvert</b> : {n0(G.tender.units)} unités {SEG_LABEL[G.tender.seg]}, prix plafond {eu(G.tender.maxPrice)} par unité. Offres à déposer dans la console de chaque équipe, rubrique Opportunités.
        </div>
      )}
      {!hideTargets && G.settings.ma && G.targets.some((t) => t.status === 'open') && (
        <div className="callout">
          <b>Entreprises à vendre</b> : {G.targets.filter((t) => t.status === 'open').map((t) => `${t.name} (plancher ${ke(E.targetAsk(G, t))})`).join(' · ')}
        </div>
      )}
    </div>
  );
}

export function RankingPanel({ G }) {
  const rank = E.ranking(G);
  return (
    <div className="panel">
      <div className="panel-head"><h2>Classement</h2><span className="muted">rentabilité pour l'actionnaire</span></div>
      <Table head={['Équipe', 'Cours', 'TSR', 'CA trim.', 'Notation']} rows={rank.map((r) => ({
        cells: [<span className="team-cell"><b className="rank">{r.rank}</b><Dot color={r.color} />{r.name}</span>, vpsF(r.vps), <span className={r.tsr >= 0 ? 'pos' : 'neg'}>{sg(r.tsr, (x) => pc(x, 0))}</span>, ke(r.revenue), r.rating],
      }))} />
      <div className="hint">TSR : variation du cours depuis le départ, dividendes cumulés inclus.</div>
    </div>
  );
}

export function NewsPanel({ G }) {
  const lastQ = G.t;
  const recentNews = [...G.news].filter((x) => x.t >= Math.max(0, lastQ - 1)).reverse();
  const olderNews = [...G.news].filter((x) => x.t < Math.max(0, lastQ - 1)).reverse().slice(0, 12);
  return (
    <div className="panel">
      <div className="panel-head"><h2>Actualités</h2></div>
      <ul className="news">
        {recentNews.map((x, i) => <li key={'r' + i} className={'news-' + x.kind}><span className="news-q">{x.t ? QL(x.t) : 'Départ'}</span><span>{x.text}</span></li>)}
        {olderNews.map((x, i) => <li key={'o' + i} className={'old news-' + x.kind}><span className="news-q">{x.t ? QL(x.t) : 'Départ'}</span><span>{x.text}</span></li>)}
      </ul>
    </div>
  );
}

export function TeacherTools({ G, onInject, onRename, onFinish, children }) {
  const [showTeacher, setShowTeacher] = useState(false);
  const [ev, setEv] = useState('mp');
  const [finishAsk, setFinishAsk] = useState(false);
  const finished = G.phase === 'finished';
  return (
    <details className="panel teacher">
      <summary><h2>Outils de l'animateur</h2></summary>
      <div className="teacher-body">
        {children}
        {!finished && (
          <div className="teacher-row">
            <label htmlFor="inject">Déclencher un événement au prochain trimestre</label>
            <div className="row">
              <select id="inject" value={ev} onChange={(e) => setEv(e.target.value)}>
                {Object.entries(E.GLOBAL_EVENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="btn btn-sm" onClick={() => onInject(ev)}>Programmer</button>
            </div>
            {G.injected && G.injected.length > 0 && <div className="hint">Programmé : {G.injected.map((k) => E.GLOBAL_EVENTS[k].label).join(', ')}. Il remplace le tirage aléatoire du trimestre.</div>}
          </div>
        )}
        <div className="teacher-row">
          <label>Renommer une équipe</label>
          <div className="rename-grid">
            {G.firms.map((f) => <input key={f.id + f.name} id={`rename-${f.id}`} defaultValue={f.name} maxLength={24} onBlur={(e) => { if (e.target.value.trim() && e.target.value.trim() !== f.name) onRename(f.id, e.target.value); }} />)}
          </div>
        </div>
        <div className="teacher-row">
          <Toggle id="teacher-view" checked={showTeacher} onChange={setShowTeacher}>Afficher la vue confidentielle des équipes (à ne pas projeter)</Toggle>
          {showTeacher && <TeacherTable G={G} />}
        </div>
        {!finished && (
          <div className="teacher-row">
            <button className="btn btn-sm btn-danger" onClick={() => setFinishAsk(true)}>Clore la partie maintenant</button>
          </div>
        )}
        <div className="hint">Graine de la partie : {G.seed} · scénario {E.SCENARIOS[G.settings.scenario].label} · aléas {G.settings.events ? 'actifs' : 'désactivés'} · appels d'offres {G.settings.tenders ? 'actifs' : 'désactivés'} · croissance externe {G.settings.ma ? 'active' : 'désactivée'}</div>
      </div>
      {finishAsk && (
        <Modal title="Clore la partie ?" onClose={() => setFinishAsk(false)} actions={<>
          <button className="btn btn-ghost" onClick={() => setFinishAsk(false)}>Revenir</button>
          <button className="btn btn-danger" onClick={() => { setFinishAsk(false); onFinish(); }}>Clore et débriefer</button>
        </>}>
          <p>La partie s'arrête après {G.t} trimestre{G.t > 1 ? 's' : ''} joué{G.t > 1 ? 's' : ''}. Le classement et le débriefing portent sur cette période.</p>
        </Modal>
      )}
    </details>
  );
}

export function ResolveConfirm({ pending, onCancel, onConfirm }) {
  return (
    <Modal title="Résoudre sans toutes les décisions ?" onClose={onCancel} actions={<>
      <button className="btn btn-ghost" onClick={onCancel}>Revenir</button>
      <button className="btn btn-primary" onClick={onConfirm}>Résoudre quand même</button>
    </>}>
      <p>Équipes sans décision validée : <b>{pending.map((f) => f.name).join(', ')}</b>.</p>
      <p>Leur brouillon en cours sera utilisé s'il existe ; sinon, les décisions du trimestre précédent sont reconduites, avec une production recalée sur la demande estimée.</p>
    </Modal>
  );
}

export function TeacherTable({ G }) {
  return (
    <Table head={['Équipe', 'Trésorerie', 'Dette', 'EBIT trim.', 'TRS', 'Service', 'Réputation', 'Climat', 'Tech. S/P', 'Lignes']} rows={G.firms.map((f) => {
      const h = f.history[f.history.length - 1];
      return { cells: [<span className="team-cell"><Dot color={f.color} />{f.name}</span>, ke(f.cash - f.overdraft), ke(f.debt), h ? ke(h.ebit) : '—', h ? pc(h.trs) : '—', h ? pc(h.fill) : '—', n0(f.reputation), n0(f.climate), `${n0(f.tech.S)} / ${n0(f.tech.P)}`, `${f.lines.length} · ${shiftLabel(f.shifts)}`] };
    })} />
  );
}

// ---------- console d'équipe ----------
export const TABS = [
  ['synthese', 'Synthèse'], ['decisions', 'Décisions'], ['production', 'Production'], ['marche', 'Marché'], ['finances', 'Finances'], ['historique', 'Historique'],
];


export function TeamConsole({ G, firmId, draft, onDraft, submitted, actions, subtitle, extraTabs = [], resetKey }) {
  const f = G.firms.find((x) => x.id === firmId);
  const finished = G.phase === 'finished';
  const [tab, setTab] = useState('synthese');
  useEffect(() => { setTab('synthese'); }, [resetKey]);
  const canDecide = !finished && !!onDraft;
  const tabs = [...TABS.filter(([k]) => k !== 'decisions' || canDecide), ...extraTabs.map((t) => [t.key, t.label])];
  const d = draft || E.defaultDecisions(G, f);
  const extra = extraTabs.find((t) => t.key === tab);
  return (
    <div className="console" style={{ '--team': f.color }}>
      <div className="console-head">
        <div className="console-title">
          <span className="console-swatch" />
          <div>
            <div className="console-name">{f.name}</div>
            <div className="muted">{subtitle || (finished ? 'Partie terminée' : `Décisions pour ${QL(G.t + 1)}`)} · cours {vpsF(f.vps)} · TSR {sg(f.tsr, (x) => pc(x, 0))}</div>
          </div>
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
      <nav className="tabs" role="tablist">
        {tabs.map(([k, lab]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{lab}</button>
        ))}
      </nav>
      <div className="console-body">
        {tab === 'synthese' && <Synthese G={G} f={f} onGo={canDecide ? setTab : null} />}
        {tab === 'decisions' && canDecide && <Decisions G={G} f={f} d={d} onChange={onDraft} submitted={submitted} />}
        {tab === 'production' && <Production G={G} f={f} />}
        {tab === 'marche' && <Marche G={G} f={f} />}
        {tab === 'finances' && <Finances G={G} f={f} />}
        {tab === 'historique' && <Historique G={G} f={f} />}
        {extra && extra.render()}
      </div>
    </div>
  );
}

export function diagTone(x) { return x.level === 'bon' ? 'ok' : x.level === 'info' ? 'info' : (x.w >= 3 ? 'bad' : 'warn'); }

export function Synthese({ G, f, onGo }) {
  const r = f.report;
  if (!r) {
    const bs = E.balanceSheet(f);
    return (
      <div className="stack-lg">
        <div className="panel brief">
          <h3>Votre situation de départ</h3>
          <p>Vous prenez la direction d'une usine de biens d'équipement qui fabrique deux gammes : <b>Standard</b>, un marché de volume sensible au prix, et <b>Premium</b>, plus petit mais en croissance de 2,5 % par trimestre, sensible à la technologie et à la réputation. Toutes les équipes partent d'une situation identique.</p>
          <ul className="facts">
            <li><b>{f.lines.length} lignes</b> de production en {shiftLabel(f.shifts)}, âge moyen {n0(f.lines.reduce((s, l) => s + l.age, 0) / f.lines.length)} trimestres ; une ligne neuve coûte {ke(CFG.lineCost)} et entre en service le trimestre suivant.</li>
            <li><b>{f.operators} opérateurs</b> ({CFG.opsPerLineShift} par ligne et par équipe), salaire de marché {ke(G.macro.salaryBase)} par trimestre.</li>
            <li>Un Premium mobilise {nf1.format(CFG.capEq.P)} fois plus de temps machine et {nf1.format(CFG.kits.P)} fois plus de composants qu'un Standard.</li>
            <li>Stocks : {n0(f.inv.S)} Standard, {n0(f.inv.P)} Premium et {n0(f.kits)} kits de composants.</li>
            <li>Dette financière {ke(f.debt)}, trésorerie {ke(f.cash)}, notation {f.rating}.</li>
          </ul>
          <p>Trois concurrents régionaux non joueurs occupent environ 20 % du marché. Certains pourront être rachetés en cours de partie.</p>
          {onGo && <button className="btn btn-primary" onClick={() => onGo('decisions')}>Préparer les décisions du premier trimestre</button>}
        </div>
        <div className="kpis kpis-4">
          <Kpi label="Cours de l'action" value={vpsF(f.vps)} sub={`capitalisation ${ke(f.marketCap)}`} />
          <Kpi label="Capitaux propres" value={ke(bs.equity)} />
          <Kpi label="Dette nette" value={ke(f.debt + f.overdraft - f.cash)} />
          <Kpi label="Capacité théorique" value={`${n0(f.lines.length * f.shifts * CFG.lineCap)} éq.`} sub="éq. Standard par trimestre" />
        </div>
      </div>
    );
  }
  const P = r.pnl; const k = r.kpi;
  const prev = f.history.length > 1 ? f.history[f.history.length - 2] : null;
  const d = (cur, p) => (p != null && ok(p) && Math.abs(p) > 1e-9 ? (cur - p) / Math.abs(p) : null);
  return (
    <div className="stack-lg">
      <div className="kpis kpis-6">
        <Kpi label="Chiffre d'affaires" value={ke(P.revenue)} sub={prev ? sg(d(P.revenue, prev.revenue), (x) => pc(x, 1)) + ' vs trim. préc.' : null} />
        <Kpi label="Résultat d'exploitation" value={ke(P.ebit)} sub={`marge ${pc(k.margin)}`} tone={P.ebit < 0 ? 'bad' : null} />
        <Kpi label="Résultat net" value={ke(P.ni)} tone={P.ni < 0 ? 'bad' : null} />
        <Kpi label="Trésorerie nette" value={ke(f.cash - f.overdraft)} sub={f.overdraft > 0 ? `découvert ${ke(f.overdraft)}` : `dette ${ke(f.debt)}`} tone={f.overdraft > 0 ? 'warn' : null} />
        <Kpi label="TRS" value={pc(k.trs)} sub={`taux de service ${pc(k.fill, 0)}`} />
        <Kpi label="Cours" value={vpsF(f.vps)} sub={`TSR ${sg(f.tsr, (x) => pc(x, 0))}`} />
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Diagnostic du trimestre {QL(r.q)}</h3>
          <ul className="diag">
            {r.diag.map((x, i) => <li key={i} className={'diag-' + diagTone(x)}><Chip kind={diagTone(x)}>{x.level === 'bon' ? 'Point fort' : x.level === 'info' ? 'Repère' : (x.w >= 3 ? 'Critique' : 'À surveiller')}</Chip><span>{x.text}</span></li>)}
          </ul>
        </div>
        <div className="panel">
          <h3>Faits marquants</h3>
          {r.events.length === 0 && r.notes.length === 0 && <p className="muted">Aucun incident ni opération particulière ce trimestre.</p>}
          <ul className="events">
            {r.events.map((x, i) => <li key={'e' + i} className={'ev-' + x.kind}>{x.text}</li>)}
            {r.notes.map((x, i) => <li key={'n' + i} className="ev-note">{x}</li>)}
          </ul>
          <h4>Positions de marché</h4>
          <Table head={['Segment', 'Prix', 'Demande', 'Ventes', 'Part']} rows={SEGS.map((s) => {
            const row = r.market.rows.find((x) => x.id === f.id);
            return { cells: [SEG_LABEL[s], row && row.price[s] != null ? eu(row.price[s]) : 'non offert', n0(f.lastDemand[s]), n0(f.lastSales[s]), pc(row ? row.share[s] : 0)] };
          })} />
        </div>
      </div>
    </div>
  );
}

// ---------- décisions ----------
export function Decisions({ G, f, d, onChange, submitted }) {
  const set = (path, v) => {
    const nd = JSON.parse(JSON.stringify(d));
    const keys = path.split('.'); let o = nd;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = v;
    onChange(nd);
  };
  const pv = useMemo(() => E.preview(G, f, d), [G, f, d]);
  const s = pv.d; // décisions assainies
  const fc = pv.forecast;
  const tender = G.tender && G.tender.status === 'open' ? G.tender : null;
  const targets = G.settings.ma ? G.targets.filter((t) => t.status === 'open') : [];
  const supTotal = (d.supplier.A || 0) + (d.supplier.B || 0) + (d.supplier.C || 0);
  const est = estimateCash(G, f, s, pv);
  const warns = [];
  if (pv.planEq > pv.capEq * 1.001) warns.push(['bad', `Le plan (${n0(pv.planEq)} éq.) dépasse la capacité estimée (${n0(pv.capEq)} éq.) : la production sera réduite d'environ ${pc(1 - pv.capEq / pv.planEq, 0)}.`]);
  if (pv.ops < pv.needed) warns.push(['warn', `Effectif prévu ${n0(pv.ops)} pour ${n0(pv.needed)} requis : heures supplémentaires (+10 % maximum, majorées de 50 %), puis perte de capacité.`]);
  if (pv.ops > pv.needed + 8) warns.push(['info', `${n0(pv.ops - pv.needed)} opérateurs de plus que le besoin des lignes : coût fixe sans production.`]);
  if (pv.kitsAvail < pv.kitsNeeded) warns.push(['bad', `Kits disponibles estimés ${n0(pv.kitsAvail)} pour ${n0(pv.kitsNeeded)} nécessaires.`]);
  if ((d.hire || 0) > pv.maxHires) warns.push(['warn', `Recrutements plafonnés à ${pv.maxHires} par trimestre (marché du travail).`]);
  if ((d.loan || 0) > pv.loanCap + 1) warns.push(['warn', `Prêt plafonné à ${ke(pv.loanCap)} (dette ≤ ${nf1.format(CFG.maxLeverage)} × EBITDA annuel).`]);
  if (s.shifts === 3) warns.push(['info', 'Équipe de nuit : prime salariale, usure accrue des machines, défauts et climat social dégradés.']);
  if (est.end < 0) warns.push([est.end < -pv.overdraftLimit ? 'bad' : 'warn', `Trésorerie de fin estimée négative (${ke(est.end)}). Découvert autorisé ${ke(pv.overdraftLimit)} ; au-delà, crédit d'urgence et mise sous surveillance.`]);
  if (supTotal <= 0 && !f.captive) warns.push(['warn', 'Aucun fournisseur choisi : le fournisseur B sera retenu par défaut.']);
  return (
    <div className="dec-layout">
      <div className="dec-form">
        {submitted && <div className="msg msg-ok">Décisions validées. Toute modification annule la validation : validez de nouveau avant de masquer.</div>}
        <section className="panel dsec">
          <h3>Commercial</h3>
          <div className="seg-grid">
            {SEGS.map((sg_) => (
              <div key={sg_} className={'seg-card seg-' + sg_.toLowerCase()}>
                <div className="seg-card-head"><b>{SEG_LABEL[sg_]}</b><Toggle id={`offer-${sg_}`} checked={d.offer[sg_]} onChange={(v) => set(`offer.${sg_}`, v)}>Commercialiser</Toggle></div>
                <Field label="Prix unitaire" htmlFor={`price-${sg_}`} hint={`Prix moyen du marché au dernier trimestre : ${eu(G.lastMarket ? G.lastMarket.seg[sg_].avgP : CFG.refPrice[sg_])}`}>
                  <Num id={`price-${sg_}`} value={d.price[sg_]} scale={1000} step={10} min={sg_ === 'S' ? 500 : 1300} max={sg_ === 'S' ? 2200 : 5500} unit="€" onChange={(v) => set(`price.${sg_}`, v)} />
                </Field>
                <Field label="Marketing" htmlFor={`mkt-${sg_}`} hint="Budget du trimestre. La notoriété s'accumule et s'érode de 35 % par trimestre.">
                  <Num id={`mkt-${sg_}`} value={d.marketing[sg_]} step={10} max={3000} unit="k€" onChange={(v) => set(`marketing.${sg_}`, v)} />
                </Field>
                <div className="forecast">Demande estimée : <b>{n0(fc[sg_])} u.</b> <span className="muted">(extrapolation naïve du dernier trimestre et de la saisonnalité)</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel dsec">
          <h3>Production et capacité</h3>
          <div className="fgrid">
            <Field label="Production Standard" htmlFor="prod-S" hint={`Stock actuel ${n0(f.inv.S)} u.`}>
              <Num id="prod-S" value={d.production.S} step={100} max={80000} unit="u." onChange={(v) => set('production.S', Math.round(v))} />
            </Field>
            <Field label="Production Premium" htmlFor="prod-P" hint={`Stock actuel ${n0(f.inv.P)} u. · ${nf1.format(CFG.capEq.P)} éq. par unité`}>
              <Num id="prod-P" value={d.production.P} step={50} max={40000} unit="u." onChange={(v) => set('production.P', Math.round(v))} />
            </Field>
            <Field label="Organisation" htmlFor="shifts" hint={`${CFG.opsPerLineShift} opérateurs par ligne et par équipe`}>
              <div className="seg-ctl">{[1, 2, 3].map((k) => <button key={k} id={k === 1 ? 'shifts' : undefined} className={'seg-btn' + (d.shifts === k ? ' on' : '')} onClick={() => set('shifts', k)}>{shiftLabel(k)}</button>)}</div>
            </Field>
            <Field label="Acheter des lignes" htmlFor="lines-buy" hint={`${ke(CFG.lineCost)} l'unité, en service au trimestre suivant`}>
              <Num id="lines-buy" value={d.linesBuy} step={1} max={4} unit="lignes" onChange={(v) => set('linesBuy', Math.round(v))} />
            </Field>
            <Field label="Céder des lignes" htmlFor="lines-sell" hint="Les plus anciennes, à 60 % de leur valeur nette comptable">
              <Num id="lines-sell" value={d.linesSell} step={1} max={Math.max(0, f.lines.length - 1)} unit="lignes" onChange={(v) => set('linesSell', Math.round(v))} />
            </Field>
            <Field label="Maintenance" htmlFor="maint" hint={`État du parc ${n0(f.condition)}/100 · ${f.lines.length + f.pending.length} lignes`}>
              <Num id="maint" value={d.maintenance} step={10} max={4000} unit="k€" onChange={(v) => set('maintenance', v)} />
            </Field>
          </div>
        </section>

        <section className="panel dsec">
          <h3>Ressources humaines</h3>
          <div className="fgrid">
            <Field label="Recrutements" htmlFor="hire" hint={`Maximum ${pv.maxHires} · ${ke(CFG.hireCost)} par recrue · départs volontaires estimés ${pv.quitsEst}`}>
              <Num id="hire" value={d.hire} step={1} max={pv.maxHires} unit="pers." onChange={(v) => set('hire', Math.round(v))} />
            </Field>
            <Field label="Licenciements" htmlFor="fire" hint={`${ke(CFG.fireCost)} par personne · dégrade fortement le climat social`}>
              <Num id="fire" value={d.fire} step={1} max={f.operators} unit="pers." onChange={(v) => set('fire', Math.round(v))} />
            </Field>
            <Field label="Niveau de salaire" htmlFor="salary" hint={`Indice 100 = marché (${ke(G.macro.salaryBase)} par trimestre) · climat ${n0(f.climate)}/100`}>
              <Num id="salary" value={d.salaryIndex} scale={100} step={1} min={85} max={125} unit="indice" onChange={(v) => set('salaryIndex', v)} />
            </Field>
            <Field label="Formation" htmlFor="training" hint={`Compétence actuelle ${n0(f.skill)}/100`}>
              <Num id="training" value={d.training} step={10} max={3000} unit="k€" onChange={(v) => set('training', v)} />
            </Field>
          </div>
        </section>

        <section className="panel dsec">
          <h3>Achats de composants</h3>
          {f.captive ? (
            <p className="muted">Approvisionnement intégré via votre filiale : prix −18 %, fiabilité 99,5 %, meilleure qualité.</p>
          ) : (
            <div className="sup-grid">
              {['A', 'B', 'C'].map((k) => {
                const sp = CFG.suppliers[k];
                return (
                  <div key={k} className="sup">
                    <div className="sup-head"><b>Fournisseur {sp.label}</b></div>
                    <div className="sup-meta">prix ×{nf2.format(sp.priceF)} · livré ≈{pc(sp.rel, 0)} · défauts ×{nf2.format(sp.q)}</div>
                    <Num id={`sup-${k}`} value={d.supplier[k]} step={10} max={100} unit="%" onChange={(v) => set(`supplier.${k}`, v)} />
                  </div>
                );
              })}
            </div>
          )}
          <div className="fgrid">
            <Field label="Commande de kits" htmlFor="kits" hint={`Stock ${n0(f.kits)} kits · besoin du plan ${n0(pv.kitsNeeded)} · prix estimé ${eu(pv.kitPrice)} le kit`}>
              <Num id="kits" value={d.kitsOrder} step={100} max={150000} unit="kits" onChange={(v) => set('kitsOrder', Math.round(v))} />
            </Field>
            {!f.captive && (
              <Field label="Couverture du prix" htmlFor="hedge" hint={f.hedge ? `Indice figé à ${nf1.format(f.hedge.index)} encore ${f.hedge.left} trimestre(s)` : 'Fige l’indice actuel +3 % pendant 4 trimestres'}>
                <Toggle id="hedge" checked={d.hedge} onChange={(v) => set('hedge', v)}>{f.hedge ? 'Couverture en cours' : 'Couvrir les achats'}</Toggle>
              </Field>
            )}
          </div>
          {!f.captive && supTotal > 0 && Math.abs(supTotal - 100) > 0.5 && <div className="hint">Les parts seront ramenées à 100 % au prorata (total saisi : {n0(supTotal)} %).</div>}
        </section>

        <section className="panel dsec">
          <h3>Qualité, R&D et certification</h3>
          <div className="fgrid">
            <Field label="Contrôle qualité" htmlFor="quality" hint="Intercepte les défauts avant livraison (rebuts) plutôt que chez le client (garantie, réputation)">
              <Num id="quality" value={d.quality} step={10} max={3000} unit="k€" onChange={(v) => set('quality', v)} />
            </Field>
            <Field label="R&D Standard" htmlFor="rd-S" hint={`Technologie ${nf1.format(f.tech.S)} · moyenne du marché ${nf1.format(techAvg(G, 'S'))}`}>
              <Num id="rd-S" value={d.rd.S} step={10} max={5000} unit="k€" onChange={(v) => set('rd.S', v)} />
            </Field>
            <Field label="R&D Premium" htmlFor="rd-P" hint={`Technologie ${nf1.format(f.tech.P)} · moyenne du marché ${nf1.format(techAvg(G, 'P'))}`}>
              <Num id="rd-P" value={d.rd.P} step={10} max={5000} unit="k€" onChange={(v) => set('rd.P', v)} />
            </Field>
            <Field label="R&D procédé" htmlFor="rd-proc" hint={`Économie actuelle sur composants et énergie : ${pc(1 - E.procFactor(f.process))} (plafond 25 %)`}>
              <Num id="rd-proc" value={d.rd.process} step={10} max={5000} unit="k€" onChange={(v) => set('rd.process', v)} />
            </Field>
            <Field label="Certification qualité" htmlFor="cert" hint={certHint(f)}>
              {f.cert.status === 'none' ? <Toggle id="cert" checked={d.cert} onChange={(v) => set('cert', v)}>Lancer le projet ({ke(CFG.certCost)} × 2 trimestres)</Toggle> : <Chip kind={f.cert.status === 'ok' ? 'ok' : f.cert.status === 'suspended' ? 'bad' : 'info'}>{certLabel(f)}</Chip>}
            </Field>
          </div>
        </section>

        <section className="panel dsec">
          <h3>Finance</h3>
          <div className="fgrid">
            <Field label="Nouvel emprunt" htmlFor="loan" hint={`Capacité d'emprunt ${ke(pv.loanCap)} · taux actuel ${nf2.format(f.rate)} % (notation ${f.rating}), variable`}>
              <Num id="loan" value={d.loan} step={500} max={100000} unit="k€" onChange={(v) => set('loan', v)} />
            </Field>
            <Field label="Remboursement" htmlFor="repay" hint={`Dette actuelle ${ke(f.debt)}`}>
              <Num id="repay" value={d.repay} step={500} max={f.debt} unit="k€" onChange={(v) => set('repay', v)} />
            </Field>
            <Field label="Augmentation de capital" htmlFor="equity" hint={`Émission à ${vpsF(f.vps * (f.surveillance > 0 ? 0.7 : 0.9))} par action (décote ${f.surveillance > 0 ? '30' : '10'} %), plafond ${ke((f.surveillance > 0 ? 0.6 : 0.3) * f.marketCap)}`}>
              <Num id="equity" value={d.equity} step={500} max={100000} unit="k€" onChange={(v) => set('equity', v)} />
            </Field>
            <Field label="Dividende" htmlFor="dividend" hint={f.surveillance > 0 ? 'Bloqué : entreprise sous surveillance bancaire' : `Limité à la trésorerie et aux réserves (${ke(f.retained)})`}>
              <Num id="dividend" value={d.dividend} step={100} max={100000} unit="k€" onChange={(v) => set('dividend', v)} />
            </Field>
          </div>
        </section>

        <section className="panel dsec">
          <h3>Opportunités</h3>
          <div className="stack">
            <Toggle id="study" checked={d.study} onChange={(v) => set('study', v)}>Commander une étude de marché ({ke(CFG.studyCost)}) : technologie, réputation, notoriété et capacité de chaque concurrent dans le prochain rapport</Toggle>
            {tender ? (
              <div className="opp">
                <div><b>Appel d'offres {tender.id}</b> : {n0(tender.units)} u. {SEG_LABEL[tender.seg]}, plafond {eu(tender.maxPrice)} par unité. L'offre la moins chère gagne, à réputation et certification près. Livraison au trimestre suivant, pénalité de 30 % sur le non-livré.</div>
                <div className="row">
                  <Toggle id="tender-on" checked={d.tenderBid != null} onChange={(v) => set('tenderBid', v ? Math.round(tender.maxPrice * 0.95 * 100) / 100 : null)}>Déposer une offre</Toggle>
                  {d.tenderBid != null && <Num id="tender-bid" value={d.tenderBid} scale={1000} step={10} min={100} max={10000} unit="€ / u." onChange={(v) => set('tenderBid', v)} />}
                </div>
              </div>
            ) : <p className="muted">Aucun appel d'offres ouvert ce trimestre.</p>}
            {targets.length > 0 ? targets.map((t) => <TargetCard key={t.id} G={G} t={t} d={d} set={set} />) : (G.settings.ma && <p className="muted">Aucune entreprise à vendre pour le moment.</p>)}
          </div>
        </section>
      </div>

      <aside className="dec-check">
        <div className="panel check">
          <h3>Contrôle de cohérence</h3>
          <div className="gauge">
            <div className="gauge-label"><span>Charge prévue</span><b>{pc(pv.loadPct, 0)}</b></div>
            <div className="gauge-bar"><span style={{ width: `${clamp(pv.loadPct, 0, 1.3) / 1.3 * 100}%` }} className={pv.loadPct > 1 ? 'over' : pv.loadPct > 0.92 ? 'high' : ''} /><i style={{ left: `${100 / 1.3}%` }} /></div>
            <div className="hint">{n0(pv.planEq)} éq. planifiés pour {n0(pv.capEq)} éq. de capacité estimée ({pv.linesActive} lignes en {shiftLabel(s.shifts)}, disponibilité {pc(pv.avail, 0)}, performance {pc(pv.perf, 0)})</div>
          </div>
          <dl className="checklist">
            <dt>Opérateurs</dt><dd className={pv.ops < pv.needed ? 'neg' : ''}>{n0(pv.ops)} / {n0(pv.needed)}</dd>
            <dt>Kits</dt><dd className={pv.kitsAvail < pv.kitsNeeded ? 'neg' : ''}>{n0(pv.kitsAvail)} / {n0(pv.kitsNeeded)}</dd>
            <dt>Dépenses du trimestre</dt><dd>{ke(pv.opex)}</dd>
            <dt>Achats de kits</dt><dd>{ke(pv.kitsCost)}</dd>
            <dt>Investissements</dt><dd>{ke(pv.capex + (s.acqBid ? s.acqBid.price : 0))}</dd>
            <dt>Trésorerie de fin estimée</dt><dd className={est.end < 0 ? 'neg' : ''}>{ke(est.end)}</dd>
          </dl>
          <div className="hint">Estimation indicative : ventes égales à la demande estimée, hors aléas et hors impôt.</div>
          {warns.length > 0 && <ul className="warns">{warns.map(([k, t], i) => <li key={i} className={'w-' + k}>{t}</li>)}</ul>}
        </div>
      </aside>
    </div>
  );
}

export const techAvg = (G, s) => (G.viewTechAvg ? G.viewTechAvg[s] : E.marketTechAvg(G, s));
export function certLabel(f) { return f.cert.status === 'ok' ? 'Certifié' : f.cert.status === 'suspended' ? 'Certification suspendue' : 'Certification en cours'; }
export function certHint(f) {
  if (f.cert.status === 'none') return 'Défauts −20 %, réputation, appels d’offres, et protection en cas de norme Premium. Audit 30 k€ par trimestre une fois obtenue.';
  if (f.cert.status === 'ok') return 'Suspendue si plus de 4 % de défauts livrés sur un trimestre.';
  if (f.cert.status === 'suspended') return 'Réactivée après 2 trimestres sous 4 % de défauts livrés.';
  return 'Obtention à la fin du second trimestre du projet.';
}

export function TargetCard({ G, t, d, set }) {
  const ask = E.targetAsk(G, t);
  const on = d.acqBid && d.acqBid.targetId === t.id;
  const npc = t.type === 'competitor' ? G.npcs.find((n) => n.id === t.id) : null;
  return (
    <div className="opp">
      <div className="opp-head"><b>{t.name}</b><Chip kind="info">{t.type === 'competitor' ? 'Concurrent' : t.type === 'supplier' ? 'Fournisseur' : 'Start-up'}</Chip><span className="muted">prix plancher {ke(ask)}</span></div>
      {npc ? (
        <div className="opp-desc">{npc.desc} {npc.lines.length} lignes en {shiftLabel(npc.shifts)}, {npc.operators} opérateurs, segments : {npc.segs.map((s) => SEG_LABEL[s]).join(' et ')}. Chiffre d'affaires annuel ≈ {ke(npc.revHist.slice(-4).reduce((a, b) => a + b, 0))}. Ses clients vous suivent à 55–85 % ; coûts d'intégration de 5 % du prix pendant 2 trimestres.</div>
      ) : <div className="opp-desc">{t.desc}</div>}
      <div className="row">
        <Toggle id={`bid-${t.id}`} checked={!!on} onChange={(v) => set('acqBid', v ? { targetId: t.id, price: ask } : null)}>Faire une offre sous pli scellé</Toggle>
        {on && <Num id={`bid-price-${t.id}`} value={d.acqBid.price} step={100} min={0} max={200000} unit="k€" onChange={(v) => set('acqBid', { targetId: t.id, price: v })} />}
      </div>
      {on && <div className="hint">Paiement comptant à la résolution : prévoyez l'emprunt ou l'augmentation de capital dans ce même trimestre. L'offre la plus haute au-dessus du plancher l'emporte.</div>}
    </div>
  );
}

export function estimateCash(G, f, s, pv) {
  const fc = pv.forecast;
  let revenue = 0;
  for (const sg_ of SEGS) {
    if (!s.offer[sg_]) continue;
    const avail = f.inv[sg_] + s.production[sg_] * Math.min(1, pv.capEq / Math.max(1, pv.planEq)) * 0.97;
    revenue += Math.min(fc[sg_], avail) * s.price[sg_];
  }
  if (f.tenderCommit) revenue += f.tenderCommit.units * f.tenderCommit.price;
  const loan = Math.min(s.loan, pv.loanCap);
  const collections = f.receivables + revenue * (1 - CFG.recvShare);
  const kitsPaid = f.payables + pv.kitsCost * (1 - CFG.payShare);
  const energy = Math.min(pv.planEq, pv.capEq) * CFG.energyPerEq * (G.macro.energyIndex / 100);
  const interest = (f.debt + loan) * f.rate / 400;
  const end = f.cash - f.overdraft + loan - s.repay + s.equity - pv.capex - (s.acqBid ? s.acqBid.price : 0)
    + collections - kitsPaid - energy - pv.opex - revenue * CFG.sellingVar - interest - s.dividend;
  return { revenue, end };
}

// ---------- production ----------
export function Production({ G, f }) {
  const r = f.report;
  if (!r) return <div className="panel"><p className="muted">Le rapport de production apparaît après la résolution du premier trimestre.</p><FactoryState f={f} /></div>;
  const o = r.ops;
  const stages = [
    ['Capacité machine', 1, `${n0(o.machineCapEq)} éq.`],
    ['Après disponibilité', o.avail, `pannes, usure, grèves : −${pc(1 - o.avail, 0)}`],
    ['Après performance', o.avail * o.perf, `cadence liée aux compétences et au climat`],
    ['Après qualité (TRS)', o.trs, `défauts ${pc(o.dRate, 1)}`],
  ];
  return (
    <div className="stack-lg">
      <div className="kpis kpis-4">
        <Kpi label="TRS" value={pc(o.trs)} sub="disponibilité × performance × qualité" />
        <Kpi label="Taux de charge" value={pc(o.util)} sub="production / capacité machine" />
        <Kpi label="Goulot" value={o.bottleneck === 'aucun' ? 'Aucun' : o.bottleneck} tone={o.bottleneck === 'aucun' ? null : 'warn'} />
        <Kpi label="Défauts livrés" value={pc(o.escRate, 2)} sub={`contrôle : ${pc(o.insp, 0)} interceptés`} tone={o.escRate > 0.02 ? 'bad' : null} />
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Cascade du TRS</h3>
          <div className="cascade">
            {stages.map(([lab, v, sub]) => (
              <div key={lab} className="casc-row">
                <div className="casc-label"><span>{lab}</span><b>{pc(v, 1)}</b></div>
                <div className="casc-bar"><span style={{ width: `${v * 100}%` }} /></div>
                <div className="hint">{sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Plan et réalisation</h3>
          <Table head={['', 'Standard', 'Premium']} rows={[
            { cells: ['Plan', n0(o.plan.S), n0(o.plan.P)] },
            { cells: ['Produit (bon)', n0(o.prod.S), n0(o.prod.P)] },
            { cells: ['Vendu', n0(r.sales.S), n0(r.sales.P)] },
            { cells: ['Stock final', n0(f.inv.S), n0(f.inv.P)] },
            { cells: ['Coût variable unitaire', eu(f.invCost.S), eu(f.invCost.P)] },
          ]} />
          <dl className="checklist">
            <dt>Opérateurs</dt><dd>{n0(o.operators)} pour {n0(o.needed)} requis{o.overtimeOps > 0 ? ` · heures sup. ≈ ${n0(o.overtimeOps)} ETP` : ''}</dd>
            <dt>Kits</dt><dd>{n0(r.purchase.delivered)} livrés sur {n0(r.purchase.ordered)} ({pc(r.purchase.rate, 0)}) à {eu(r.purchase.price)} · stock {n0(f.kits)}</dd>
            <dt>Rebuts</dt><dd>{pc(o.scrapRate, 2)} · {ke(o.scrapCost)}</dd>
            <dt>Garantie</dt><dd>{ke(r.pnl.warranty)}</dd>
          </dl>
        </div>
      </div>
      <div className="panel"><FactoryState f={f} /></div>
    </div>
  );
}

export function FactoryState({ f }) {
  const bar = (v) => <span className="mini-bar"><span style={{ width: `${clamp(v, 0, 100)}%` }} className={v < 40 ? 'low' : v < 60 ? 'mid' : ''} /></span>;
  return (
    <div className="factory">
      <h3>État de l'usine</h3>
      <div className="fstate">
        <div><span>État du parc</span>{bar(f.condition)}<b>{n0(f.condition)}</b></div>
        <div><span>Compétences</span>{bar(f.skill)}<b>{n0(f.skill)}</b></div>
        <div><span>Climat social</span>{bar(f.climate)}<b>{n0(f.climate)}</b></div>
        <div><span>Réputation</span>{bar(f.reputation)}<b>{n0(f.reputation)}</b></div>
      </div>
      <div className="lines">
        {f.lines.map((l, i) => <span key={i} className="line-tag" title={`Âge ${l.age} trimestres`}>L{i + 1}<small>{l.age} tr.</small></span>)}
        {f.pending.map((_, i) => <span key={'p' + i} className="line-tag pending">neuve<small>T+1</small></span>)}
      </div>
      <div className="hint">{f.lines.length} lignes actives en {shiftLabel(f.shifts)} · âge moyen {n0(f.lines.reduce((s, l) => s + l.age, 0) / Math.max(1, f.lines.length))} trimestres · {f.operators} opérateurs · certification : {f.cert.status === 'none' ? 'aucune' : certLabel(f).toLowerCase()}{f.captive ? ' · approvisionnement intégré' : ''}</div>
    </div>
  );
}

// ---------- marché ----------
export function Marche({ G, f }) {
  const r = f.report;
  if (!r) return <div className="panel"><p className="muted">Les données de marché apparaissent après le premier trimestre.</p></div>;
  const m = r.market;
  return (
    <div className="stack-lg">
      {SEGS.map((s) => (
        <div key={s} className="panel">
          <div className="panel-head"><h3>{SEG_LABEL[s]}</h3><span className="muted">demande {n0(m.total[s])} u. · prix moyen {eu(m.avgP[s])} · technologie moyenne {nf1.format(m.techAvg[s])}</span></div>
          <Table head={['Entreprise', 'Prix', 'Ventes', 'Part', ...(m.study ? ['Tech.', 'Réput.', 'Notoriété', 'Capacité', 'Certif.'] : [])]}
            rows={m.rows.filter((x) => x.price[s] != null).sort((a, b) => b.share[s] - a.share[s]).map((x) => ({
              cls: x.id === f.id ? 'me' : '',
              cells: [<span className="team-cell"><Dot color={x.kind === 'npc' ? 'var(--steel)' : x.color} />{x.name}</span>, eu(x.price[s]), n0(x.sales[s]), pc(x.share[s]),
                ...(m.study ? (x.detail ? [nf1.format(x.detail.tech[s]), n0(x.detail.reputation), n0(x.detail.brand[s]), `${n0(x.detail.capacityEq)} éq.`, x.detail.cert ? 'oui' : 'non'] : ['—', '—', '—', '—', '—']) : [])],
            }))} />
        </div>
      ))}
      {!m.study && <div className="hint">Commandez une étude de marché dans les décisions pour connaître la technologie, la réputation, la notoriété et la capacité de vos concurrents.</div>}
      <div className="panel">
        <h3>Comptes publiés des équipes</h3>
        <Table head={['Équipe', 'CA trim.', 'Résultat net', 'Cours']} rows={m.rows.filter((x) => x.kind === 'team').map((x) => ({ cls: x.id === f.id ? 'me' : '', cells: [<span className="team-cell"><Dot color={x.color} />{x.name}</span>, ke(x.revenue), ke(x.ni), vpsF(x.vps)] }))} />
      </div>
    </div>
  );
}

// ---------- finances ----------
export const PNL_ROWS = [
  ['revenue', "Chiffre d'affaires", 1], ['cogs', 'Coût des ventes (composants, énergie)', -1], ['scrap', 'Rebuts', -1], ['labor', 'Main-d’œuvre directe', -1],
  ['selling', 'Frais commerciaux variables', -1], ['hr', 'Recrutements et licenciements', -1], ['marketing', 'Marketing', -1], ['rd', 'R&D', -1],
  ['maintenance', 'Maintenance', -1], ['quality', 'Contrôle qualité', -1], ['training', 'Formation', -1], ['cert', 'Certification', -1], ['study', 'Étude de marché', -1],
  ['overhead', 'Frais de structure', -1], ['warranty', 'Garantie', -1], ['holding', 'Coût de possession des stocks', -1], ['incidents', 'Incidents', -1],
  ['penalties', 'Pénalités', -1], ['integration', "Coûts d'intégration", -1], ['subsidiary', 'Résultat de filiale', 1],
  ['ebitda', 'EBITDA', 0, 'sub'], ['dep', 'Dotations aux amortissements', -1], ['saleLoss', 'Moins-value de cession', -1],
  ['ebit', "Résultat d'exploitation", 0, 'sub'], ['interest', 'Frais financiers', -1], ['ebt', 'Résultat avant impôt', 0, 'sub'], ['tax', 'Impôt sur les sociétés (25 %)', -1], ['ni', 'Résultat net', 0, 'total'],
];

export function Finances({ G, f }) {
  const r = f.report;
  const bs = E.balanceSheet(f);
  const h = f.history[f.history.length - 1];
  const P = r ? r.pnl : null;
  const cf = r ? r.cf : null;
  return (
    <div className="stack-lg">
      <div className="kpis kpis-6">
        <Kpi label="ROCE annualisé" value={h ? pc(h.roce) : '—'} sub="EBIT × 4 / capitaux employés" />
        <Kpi label="Levier" value={h && h.leverage != null ? `${nf1.format(h.leverage)} ×` : '—'} sub="dette nette / EBITDA annuel" />
        <Kpi label="Notation" value={f.rating} sub={`taux ${nf2.format(f.rate)} %`} />
        <Kpi label="BFR" value={h ? ke(h.wc) : ke(f.receivables + f.inv.S * f.invCost.S + f.inv.P * f.invCost.P + f.kits * f.kitCost - f.payables)} sub="clients + stocks − fournisseurs" />
        <Kpi label="Capitalisation" value={ke(f.marketCap)} sub={`multiple ${nf1.format(f.multiple || 0)} × EBITDA`} />
        <Kpi label="Surveillance" value={f.surveillance > 0 ? `${f.surveillance} trim.` : 'Non'} tone={f.surveillance > 0 ? 'bad' : null} />
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Compte de résultat {r ? QL(r.q) : ''}</h3>
          {P ? (
            <Table className="fin" head={['', 'k€']} rows={PNL_ROWS.filter(([k, , sgn, cls]) => cls || Math.abs(P[k] || 0) > 0.5).map(([k, lab, sgn, cls]) => ({ cls: cls || '', cells: [lab, n0(sgn < 0 ? -(P[k] || 0) : (P[k] || 0))] }))} />
          ) : <p className="muted">Disponible après le premier trimestre.</p>}
        </div>
        <div className="panel">
          <h3>Bilan</h3>
          <Table className="fin" head={['Actif', 'k€']} rows={[
            ['Lignes de production (valeur nette)', bs.lines], ['Lignes commandées', bs.pending], ['Goodwill', bs.goodwill], ['Participations', bs.participation], ['Incorporels', bs.intangibles],
            ['Stocks de produits finis', bs.fg], ['Stocks de composants', bs.kits], ['Créances clients', bs.receivables], ['Trésorerie', bs.cash],
          ].filter(([, v]) => Math.abs(v) > 0.5 || true).filter(([lab, v]) => !(['Lignes commandées', 'Goodwill', 'Participations', 'Incorporels'].includes(lab) && Math.abs(v) < 0.5)).map(([lab, v]) => ({ cells: [lab, n0(v)] }))}
            foot={['Total actif', n0(bs.assets)]} />
          <Table className="fin" head={['Passif', 'k€']} rows={[
            ['Capital et primes', bs.shareCapital], ['Réserves et résultat', bs.retained], ['Dettes financières', bs.debt], ['Découvert bancaire', bs.overdraft], ['Dettes fournisseurs', bs.payables],
          ].map(([lab, v]) => ({ cells: [lab, n0(v)] }))} foot={['Total passif', n0(bs.equity + bs.liabilities)]} />
        </div>
      </div>
      {cf && (
        <div className="panel">
          <h3>Tableau de flux de trésorerie {QL(r.q)}</h3>
          <Table className="fin" head={['', 'k€']} rows={[
            ['Trésorerie d’ouverture', cf.start, 'sub'], ['Encaissements clients', cf.collections], ['Paiements fournisseurs (kits)', -cf.kitsPaid], ['Énergie', -cf.energy],
            ['Charges décaissées', -cf.opex], ['Frais financiers', -cf.interest], ['Impôt', -cf.tax], ['Investissements', -cf.capex], ['Cessions de lignes', cf.saleProceeds],
            ['Acquisitions', -cf.acquisition], ['Emprunts', cf.loan], ['Remboursements', -cf.repay], ['Augmentation de capital', cf.equity], ['Dividendes', -cf.dividend],
            ['Trésorerie de clôture', cf.end, 'total'], ['Découvert en fin de trimestre', cf.overdraft],
          ].filter(([, v, c]) => c || Math.abs(v) > 0.5).map(([lab, v, c]) => ({ cls: c || '', cells: [lab, n0(v)] }))} />
          {cf.emergency > 0 && <div className="msg msg-bad">Crédit d'urgence de {ke(cf.emergency)} : la banque a converti le découvert excédentaire en dette à taux majoré.</div>}
        </div>
      )}
    </div>
  );
}

// ---------- historique ----------
export function Historique({ G, f }) {
  const H = f.history;
  if (!H.length) return <div className="panel"><p className="muted">L'historique se construit au fil des trimestres.</p></div>;
  const xl = H.map((h) => QL(h.q));
  return (
    <div className="grid2">
      <div className="panel"><h3>Chiffre d'affaires et résultat d'exploitation (k€)</h3>
        <LineChart xLabels={xl} includeZero series={[{ label: "Chiffre d'affaires", color: 'var(--team)', data: H.map((h) => h.revenue) }, { label: 'EBIT', color: 'var(--ink-2)', data: H.map((h) => h.ebit), dash: true }]} />
      </div>
      <div className="panel"><h3>Cours de l'action (€) face aux concurrents</h3>
        <LineChart xLabels={xl} yFmt={(v) => nf0.format(v)} series={G.firms.map((g) => ({ label: g.name, color: g.color, data: g.history.map((h) => h.vps), thin: g.id !== f.id }))} />
      </div>
      <div className="panel"><h3>Parts de marché</h3>
        <LineChart xLabels={xl} yFmt={(v) => `${nf0.format(v * 100)} %`} includeZero series={[{ label: 'Standard', color: 'var(--seg-s)', data: H.map((h) => h.shareS) }, { label: 'Premium', color: 'var(--seg-p)', data: H.map((h) => h.shareP) }]} />
      </div>
      <div className="panel"><h3>TRS et taux de service</h3>
        <LineChart xLabels={xl} yFmt={(v) => `${nf0.format(v * 100)} %`} series={[{ label: 'TRS', color: 'var(--team)', data: H.map((h) => h.trs) }, { label: 'Taux de service', color: 'var(--ink-2)', data: H.map((h) => h.fill), dash: true }]} />
      </div>
      <div className="panel"><h3>Trésorerie et dette (k€)</h3>
        <LineChart xLabels={xl} includeZero series={[{ label: 'Trésorerie nette', color: 'var(--team)', data: H.map((h) => h.cash - h.overdraft) }, { label: 'Dette financière', color: 'var(--ink-2)', data: H.map((h) => h.debt), dash: true }]} />
      </div>
      <div className="panel"><h3>Technologie face à la moyenne</h3>
        <LineChart xLabels={xl} series={[{ label: 'Standard', color: 'var(--seg-s)', data: H.map((h) => h.techS) }, { label: 'Premium', color: 'var(--seg-p)', data: H.map((h) => h.techP) }]} />
      </div>
    </div>
  );
}

// ---------- débriefing ----------
export function Debrief({ G, onBack, onOpenTeam }) {
  const D = useMemo(() => E.finalDebrief(G), [G]);
  const xl = (G.firms[0].history || []).map((h) => QL(h.q));
  return (
    <div className="page">
      <div className="page-head"><h1>Débriefing</h1>{onBack && <button className="btn btn-ghost" onClick={onBack}>Retour au tableau de bord</button>}</div>
      <div className="podium">
        {D.teams.map((t, i) => (
          <div key={t.id} className={'podium-card' + (i === 0 ? ' first' : '')} style={{ '--team': t.color }}>
            <div className="podium-rank">{i + 1}</div>
            <div className="podium-name">{t.name}</div>
            <div className="podium-tsr">{sg(t.tsr, (x) => pc(x, 0))}</div>
            <div className="muted">cours {vpsF(t.vps0)} → {vpsF(t.vps)}{t.cumDivPS > 0 ? ` · dividendes ${vpsF(t.cumDivPS)}` : ''}</div>
            {onOpenTeam && <button className="btn btn-sm" onClick={() => onOpenTeam(t.id)}>Comptes détaillés</button>}
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Distinctions</h2>
        <div className="awards">{D.awards.map((a) => <div key={a.label} className="award"><span className="muted">{a.label}</span><b>{a.team}</b></div>)}</div>
      </div>
      <div className="grid2">
        <div className="panel"><h3>Cours de l'action (€)</h3><LineChart xLabels={xl} series={G.firms.map((f) => ({ label: f.name, color: f.color, data: f.history.map((h) => h.vps) }))} /></div>
        <div className="panel"><h3>Part du chiffre d'affaires du secteur</h3><LineChart xLabels={xl} yFmt={(v) => `${nf0.format(v * 100)} %`} series={G.firms.map((f) => ({ label: f.name, color: f.color, data: f.history.map((h) => h.revShare) }))} /></div>
        <div className="panel"><h3>TRS</h3><LineChart xLabels={xl} yFmt={(v) => `${nf0.format(v * 100)} %`} series={G.firms.map((f) => ({ label: f.name, color: f.color, data: f.history.map((h) => h.trs) }))} /></div>
        <div className="panel"><h3>Marge opérationnelle</h3><LineChart xLabels={xl} includeZero yFmt={(v) => `${nf0.format(v * 100)} %`} series={G.firms.map((f) => ({ label: f.name, color: f.color, data: f.history.map((h) => h.margin) }))} /></div>
      </div>
      <div className="panel">
        <h2>Tableau comparatif</h2>
        <Table head={['Équipe', 'TSR', 'CA cumulé', 'Résultat net cumulé', 'Marge moy.', 'ROCE moy.', 'TRS moy.', 'Service moy.', 'Défauts livrés', 'Réput.', 'Climat', 'Levier final', 'R&D cumulée', 'Invest. cumulés', 'Acquisitions']}
          rows={D.teams.map((t) => ({ cells: [<span className="team-cell"><Dot color={t.color} />{t.name}</span>, sg(t.tsr, (x) => pc(x, 0)), ke(t.revenueTot), ke(t.niTot), pc(t.avgMargin), pc(t.avgRoce), pc(t.avgTrs), pc(t.avgFill), pc(t.avgEsc, 2), n0(t.lastRep), n0(t.lastClimate), t.lastLev != null ? `${nf1.format(t.lastLev)} ×` : '—', ke(t.cum.rd), ke(t.cum.capex + t.cum.acquisitions), t.acquisitions.join(', ') || '—'] }))} />
      </div>
      <div className="panel">
        <h2>Enseignements de la partie</h2>
        {D.lessons.length ? <ul className="lessons">{D.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul> : <p className="muted">Pas de régularité statistique nette sur cette partie : les écarts tiennent davantage à des choix ponctuels qu'à un levier dominant.</p>}
        <h4>Questions pour le débat</h4>
        <ul className="lessons">
          <li>Quelle part de votre résultat tient à vos décisions, et quelle part aux aléas ? Comparez vos trimestres de choc avec ceux des autres équipes.</li>
          <li>Où se trouvait votre goulot d'étranglement, trimestre après trimestre ? L'avez-vous déplacé délibérément ?</li>
          <li>Vos investissements (lignes, R&D, acquisitions) ont-ils rapporté plus que leur coût de financement ?</li>
          <li>Qu'auriez-vous fait différemment en connaissant la courbe de demande finale ? Ce regret est-il raisonnable au regard de l'information dont vous disposiez ?</li>
        </ul>
      </div>
    </div>
  );
}

// ---------- règles ----------
export function Rules({ onBack, net }) {
  return (
    <div className="page narrow rules">
      <div className="page-head"><h1>Règles et modèle</h1>{onBack && <button className="btn btn-ghost" onClick={onBack}>Retour</button>}</div>
      <div className="panel">
        <h2>Déroulement</h2>
        <p>Chaque tour représente un trimestre. {net ? "Chaque équipe saisit ses décisions sur son propre poste, connectée avec son code d'accès ; l'animateur suit en direct qui a validé." : "Les équipes saisissent leurs décisions l'une après l'autre sur le même poste, derrière un écran de confidentialité."} L'animateur résout ensuite le trimestre : toutes les décisions sont appliquées simultanément sur un marché commun. Chaque équipe consulte alors son rapport (synthèse et diagnostic, production, marché, finances, historique) avant de préparer le trimestre suivant.</p>
        <p>Le classement porte sur le <b>rendement total pour l'actionnaire (TSR)</b> : variation du cours de l'action depuis le départ, dividendes cumulés inclus. Les montants sont en k€, sauf les prix unitaires en €.</p>
      </div>
      <div className="panel">
        <h2>Marché</h2>
        <p>Deux segments. Le <b>Standard</b> (≈ 6 200 unités par équipe et par trimestre au départ, +0,8 % par trimestre) est sensible au prix. Le <b>Premium</b> (≈ 1 700 unités, +2,5 % par trimestre) est sensible à la technologie et à la réputation. La demande suit une saisonnalité (T1 0,96 ; T2 1,04 ; T3 0,92 ; T4 1,08) et un cycle conjoncturel.</p>
        <p>La part de marché de chaque offre est proportionnelle à son attractivité :</p>
        <pre className="formula">attractivité = présence × (prix / prix de référence)^−ε × (1 + notoriété / 600)^α × (réputation / 60)^β × e^(γ · avance technologique saturée) × (0,85 + 0,15 × taux de service précédent)</pre>
        <Table head={['Paramètre', 'Standard', 'Premium']} rows={[
          { cells: ['Élasticité-prix ε', '2,2', '1,7'] }, { cells: ['Effet notoriété α', '0,25', '0,30'] }, { cells: ['Effet réputation β', '0,4', '1,0'] }, { cells: ['Effet technologie γ (saturé à ±8 points)', '0,025', '0,05'] },
        ]} />
        <p>La notoriété s'accumule : notoriété = 0,65 × notoriété précédente + budget marketing. La technologie progresse avec la R&D à rendements décroissants (≈ 2 × √(budget / 150) points par trimestre) ; les retardataires rattrapent 8 % de leur écart par imitation. Une offre en rupture perd ses ventes : la moitié de la demande non servie se reporte sur les concurrents qui ont du stock. Les concurrents non joueurs ajustent leurs prix à leurs stocks.</p>
      </div>
      <div className="panel">
        <h2>Production</h2>
        <p>Une ligne produit 1 600 équivalents Standard par équipe et par trimestre à pleine efficacité ; un Premium consomme 2,4 éq. de temps machine et 2,2 kits de composants. Chaque ligne demande 15 opérateurs par équipe (1×8, 2×8 ou 3×8).</p>
        <pre className="formula">TRS = disponibilité × performance × qualité
disponibilité = 0,70 + 0,28 × état du parc / 100   (pannes, grèves en sus)
performance = (0,80 + 0,20 × compétences / 100) × (0,9 + 0,2 × climat / 100)</pre>
        <p>La production réelle est le plan, réduit par le plus contraignant de trois goulots : capacité machine, main-d'œuvre (heures supplémentaires jusqu'à +10 %), kits disponibles. L'état du parc s'use avec le nombre d'équipes et l'âge des lignes ; la maintenance le restaure. Les nouvelles lignes entrent en service au trimestre suivant leur achat.</p>
      </div>
      <div className="panel">
        <h2>Qualité, achats, ressources humaines</h2>
        <p>Le taux de défauts dépend de la qualité des composants (fournisseurs A, B, C), des compétences, de l'état du parc, de l'équipe de nuit et de la certification. Le contrôle qualité intercepte une part des défauts (rebuts) ; les défauts non interceptés partent chez le client et coûtent en garantie, en réputation et en risque de rappel. Les fournisseurs diffèrent par le prix, la fiabilité de livraison et la qualité ; la couverture fige l'indice des composants pendant 4 trimestres.</p>
        <p>Le climat social dépend du salaire relatif, des compétences, de l'équipe de nuit et des licenciements. Il pèse sur la productivité, les départs volontaires et le risque de grève. La formation entretient les compétences ; les recrues arrivent moins qualifiées.</p>
      </div>
      <div className="panel">
        <h2>Finance et valorisation</h2>
        <p>Les clients paient un tiers du chiffre d'affaires au trimestre suivant, et l'entreprise paie un tiers de ses achats de composants au trimestre suivant. La dette est à taux variable : taux directeur + prime selon le levier (dette nette / EBITDA annuel). L'emprunt est plafonné à 3,5 × l'EBITDA annuel. Un découvert est toléré jusqu'à 35 % du chiffre d'affaires trimestriel ; au-delà, la banque impose un crédit d'urgence et une surveillance de 4 trimestres (dividendes bloqués, prime majorée). L'impôt est de 25 % avec report des déficits.</p>
        <pre className="formula">valeur des fonds propres = multiple × (EBITDA annuel + 0,4 × R&D annuelle) − dette nette
multiple = 6 + 10 × croissance du CA sur un an (bornée) + effets réputation et technologie, borné entre 3 et 11</pre>
        <p>La R&D est partiellement réintégrée : les investisseurs la traitent en partie comme un investissement.</p>
      </div>
      <div className="panel">
        <h2>Événements et opportunités</h2>
        <p>Chocs macroéconomiques possibles : flambée des matières premières, crise de l'énergie, récession ou reprise, pénurie de composants, mouvement des taux, tension salariale, nouvelle norme Premium (les offres non certifiées perdent 20 % d'attractivité). Incidents propres à chaque entreprise, dont la probabilité dépend de ses décisions : panne (état du parc), grève (climat), accident (compétences, nuit), rappel produit (défauts livrés), départ d'un ingénieur clé (climat).</p>
        <p><b>Appels d'offres</b> : un volume à livrer au trimestre suivant ; l'offre la moins chère sous le plafond l'emporte, avec un avantage pour la réputation et la certification. <b>Croissance externe</b> : trois concurrents, un fournisseur et une start-up sont mis en vente au fil de la partie, par enchères sous pli scellé au-dessus d'un prix plancher. Le rachat entre équipes n'est pas possible.</p>
      </div>
    </div>
  );
}

export function ResultDialog({ r, G, onClose, onDebrief }) {
  const pos = Object.fromEntries(r.before.map((x) => [x.id, x.rank]));
  const finished = G.phase === 'finished';
  return (
    <Modal title={`Trimestre ${QL(r.q)} résolu`} onClose={onClose} actions={finished
      ? <><button className="btn btn-ghost" onClick={onClose}>Tableau de bord</button><button className="btn btn-primary" onClick={onDebrief}>Débriefing final</button></>
      : <button className="btn btn-primary" onClick={onClose}>Continuer</button>}>
      <Table head={['Équipe', 'Cours', 'TSR', 'Évolution']} rows={r.after.map((x) => {
        const mv = pos[x.id] - x.rank;
        return { cells: [<span className="team-cell"><b className="rank">{x.rank}</b><Dot color={x.color} />{x.name}</span>, vpsF(x.vps), sg(x.tsr, (v) => pc(v, 0)), mv > 0 ? <span className="pos">▲ {mv}</span> : mv < 0 ? <span className="neg">▼ {-mv}</span> : <span className="muted">=</span>] };
      })} />
      {r.news.length > 0 && <ul className="news compact">{r.news.map((x, i) => <li key={i} className={'news-' + x.kind}><span>{x.text}</span></li>)}</ul>}
      <p className="muted">Chaque équipe peut maintenant ouvrir sa console pour lire son rapport.</p>
    </Modal>
  );
}
