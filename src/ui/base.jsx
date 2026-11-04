// Forge — composants de base : formats, champs, graphiques, tableaux
import * as E from '../engine.js';

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
export function AiTag({ ai }) {
  const p = ai && E.AI_PROFILES[ai];
  return p ? <span className="ai-tag" title={`Pilotée par l'IA · profil ${p.label} (${p.level.toLowerCase()})`}>IA</span> : null;
}
export const aiLabel = (ai) => { const p = ai && E.AI_PROFILES[ai]; return p ? `IA · ${p.label}` : ''; };
export function AiSelect({ id, value, onChange }) {
  return (
    <select id={id} className="ai-select" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Équipe humaine</option>
      {Object.entries(E.AI_PROFILES).map(([k, p]) => <option key={k} value={k}>IA · {p.label} ({p.level.toLowerCase()})</option>)}
    </select>
  );
}

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
