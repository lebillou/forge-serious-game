// Forge — débriefing et « Et si… ? »
import * as E from '../engine.js';
import { AiTag, Dot, LineChart, QL, Table, eu, ke, n0, nf0, nf1, pc, sg, shiftLabel, useMemo, useState, vpsF } from './base.jsx';
import { Decisions, JournalPanel } from './console.jsx';

const WHATIF_FIELDS = [
  ['price.S', 'Prix Standard', (x) => eu(x)], ['price.P', 'Prix Premium', (x) => eu(x)], ['marketing.S', 'Marketing Standard', ke], ['marketing.P', 'Marketing Premium', ke],
  ['production.S', 'Production Standard', (x) => `${n0(x)} u.`], ['production.P', 'Production Premium', (x) => `${n0(x)} u.`], ['shifts', 'Organisation', shiftLabel],
  ['linesBuy', 'Lignes achetées', n0], ['linesSell', 'Lignes cédées', n0], ['hire', 'Recrutements', n0], ['fire', 'Licenciements', n0],
  ['salaryIndex', 'Indice de salaire', (x) => n0(x * 100)], ['training', 'Formation', ke], ['maintenance', 'Maintenance', ke], ['quality', 'Contrôle qualité', ke],
  ['rd.S', 'R&D Standard', ke], ['rd.P', 'R&D Premium', ke], ['rd.process', 'R&D procédé', ke], ['kitsOrder', 'Commande de kits', n0],
  ['loan', 'Emprunt', ke], ['repay', 'Remboursement', ke], ['equity', 'Augmentation de capital', ke], ['dividend', 'Dividende', ke],
  ['cert', 'Certification', (x) => (x ? 'oui' : 'non')], ['hedge', 'Couverture', (x) => (x ? 'oui' : 'non')], ['study', 'Étude de marché', (x) => (x ? 'oui' : 'non')],
  ['tenderBid', "Offre à l'appel d'offres", (x) => (x == null ? 'aucune' : eu(x))], ['acqBid', 'Offre de rachat', (x) => (x ? `${x.targetId} · ${ke(x.price)}` : 'aucune')],
];
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

export function WhatIf({ G }) {
  const [fid, setFid] = useState(G.firms[0].id);
  const [q, setQ] = useState(1);
  const [draft, setDraft] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const S0 = useMemo(() => E.replayTo(G, q), [G, q]);
  if (!E.canReplay(G)) return <div className="panel"><h2>Et si… ?</h2><p className="muted">{G.t === 0 ? 'Aucun trimestre joué pour le moment.' : "Indisponible pour cette partie : elle a été créée avant l'enregistrement du journal des décisions."}</p></div>;
  const played = G.log[q - 1].dec[fid];
  const f0 = S0.firms.find((x) => x.id === fid);
  const d = draft || played;
  const chosen = E.sanitize(S0, f0, d);
  const changes = WHATIF_FIELDS.filter(([p]) => JSON.stringify(getPath(chosen, p)) !== JSON.stringify(getPath(played, p)));
  const reset = (nf, nq) => { setFid(nf); setQ(nq); setDraft(null); setRes(null); };
  const simulate = () => { setBusy(true); setTimeout(() => { try { setRes(E.counterfactual(G, fid, q, d)); } finally { setBusy(false); } }, 0); };
  const K = res && [
    ["Chiffre d'affaires", (r) => ke(r.quarter.kpi.revenue)], ['EBITDA', (r) => ke(r.quarter.kpi.ebitda)], ['Résultat net', (r) => ke(r.quarter.kpi.ni)],
    ['Part de marché Standard', (r) => pc(r.quarter.kpi.shareS)], ['Part de marché Premium', (r) => pc(r.quarter.kpi.shareP)],
    ['TRS', (r) => pc(r.quarter.kpi.trs)], ['Taux de service', (r) => pc(r.quarter.kpi.fill)], ['Défauts livrés', (r) => pc(r.quarter.kpi.escRate, 2)],
    ['Climat social', (r) => n0(r.quarter.kpi.climate)], ['Trésorerie nette', (r) => ke(r.quarter.kpi.cash - r.quarter.kpi.overdraft)], ['Cours', (r) => vpsF(r.quarter.kpi.vps)],
    ['Événements', (r) => (r.quarter.report.events.map((e) => e.text).join(' · ') || '—')],
  ];
  const F = res && [
    ['TSR final', (r) => sg(r.final.tsr, (x) => pc(x, 0))], ['Rang final', (r) => `${r.final.rank}e`], ['Résultat net cumulé', (r) => ke(r.final.niTot)], ['Notation finale', (r) => r.final.rating],
  ];
  return (
    <div className="panel whatif">
      <h2>Et si… ?</h2>
      <p className="muted">Rejouez un trimestre en changeant les décisions d'une équipe, toutes les autres décisions restant celles de la partie. La conjoncture est la même ; les incidents propres à l'entreprise peuvent changer, puisque leur probabilité dépend des décisions. La suite de la partie est rejouée avec les décisions effectivement prises ensuite par l'équipe, qui n'avaient pas été pensées pour ce scénario : la lecture la plus fiable est celle du trimestre modifié.</p>
      <div className="row whatif-pick">
        <select id="whatif-team" value={fid} onChange={(e) => reset(e.target.value, q)}>{G.firms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select id="whatif-q" value={q} onChange={(e) => reset(fid, Number(e.target.value))}>{G.log.map((_, i) => <option key={i} value={i + 1}>{QL(i + 1)}</option>)}</select>
        {draft && <button className="btn btn-sm btn-ghost" onClick={() => { setDraft(null); setRes(null); }}>Revenir aux décisions jouées</button>}
      </div>
      {played.note && <p className="whatif-note">Journal de l'équipe pour ce trimestre : « {played.note} »</p>}
      <details className="whatif-form">
        <summary>Modifier les décisions de {QL(q)} ({changes.length ? `${changes.length} modification${changes.length > 1 ? 's' : ''}` : 'identiques à la partie'})</summary>
        <Decisions G={S0} f={f0} d={d} onChange={(nd) => { setDraft(nd); setRes(null); }} journal={false} guide={false} />
      </details>
      {changes.length > 0 && (
        <Table head={['Décision', 'Jouée', 'Testée']} rows={changes.map(([p, label, fmt]) => ({ cells: [label, fmt(getPath(played, p)), <b>{fmt(getPath(chosen, p))}</b>] }))} />
      )}
      <div className="row"><button className="btn btn-primary" disabled={busy || !changes.length} onClick={simulate}>{busy ? 'Simulation…' : 'Simuler'}</button>{!changes.length && <span className="muted">Modifiez au moins une décision.</span>}</div>
      {res && (
        <div className="grid2 whatif-res">
          <div><h4>{QL(q)}</h4><Table head={['', 'Joué', 'Testé']} rows={K.map(([l, fn]) => ({ cells: [l, fn(res.base), <b>{fn(res.alt)}</b>] }))} /></div>
          <div><h4>Fin de partie</h4><Table head={['', 'Joué', 'Testé']} rows={F.map(([l, fn]) => ({ cells: [l, fn(res.base), <b>{fn(res.alt)}</b>] }))} /></div>
        </div>
      )}
    </div>
  );
}

// ---------- débriefing ----------
export function Debrief({ G, onBack, onOpenTeam }) {
  const D = useMemo(() => E.finalDebrief(G), [G]);
  const xl = (G.firms[0].history || []).map((h) => QL(h.q));
  return (
    <div className="page">
      <div className="page-head"><h1>Débriefing</h1>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => { try { window.print(); } catch { /* impression indisponible */ } }}>Imprimer ou enregistrer en PDF</button>
          {onBack && <button className="btn btn-ghost" onClick={onBack}>Retour au tableau de bord</button>}
        </div>
      </div>
      <p className="print-only muted">Forge · {G.firms.length} équipes · {G.t} trimestre{G.t > 1 ? 's' : ''} joué{G.t > 1 ? 's' : ''} · scénario {E.SCENARIOS[G.settings.scenario].label} · classement {E.isPureTsr(G) ? 'TSR' : E.scoreLabel(G)} · graine {G.seed} · imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      <div className="podium">
        {D.teams.map((t, i) => (
          <div key={t.id} className={'podium-card' + (i === 0 ? ' first' : '')} style={{ '--team': t.color }}>
            <div className="podium-rank">{i + 1}</div>
            <div className="podium-name">{t.name}<AiTag ai={t.ai} /></div>
            <div className="podium-tsr">{t.score != null ? `${n0(t.score)} / 100` : sg(t.tsr, (x) => pc(x, 0))}</div>
            {t.score != null && <div className="muted">TSR {sg(t.tsr, (x) => pc(x, 0))}</div>}
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
        {!E.isPureTsr(G) && <p className="muted">Classement sur un score pondéré : {E.scoreLabel(G)}.</p>}
        <Table head={['Équipe', ...(E.isPureTsr(G) ? [] : ['Score']), 'TSR', 'CA cumulé', 'Résultat net cumulé', 'Marge moy.', 'ROCE moy.', 'TRS moy.', 'Service moy.', 'Défauts livrés', 'Réput.', 'Climat', 'Levier final', 'R&D cumulée', 'Invest. cumulés', 'Acquisitions']}
          rows={D.teams.map((t) => ({ cells: [<span className="team-cell"><Dot color={t.color} />{t.name}<AiTag ai={t.ai} /></span>, ...(t.score != null ? [<b>{n0(t.score)}</b>] : []), sg(t.tsr, (x) => pc(x, 0)), ke(t.revenueTot), ke(t.niTot), pc(t.avgMargin), pc(t.avgRoce), pc(t.avgTrs), pc(t.avgFill), pc(t.avgEsc, 2), n0(t.lastRep), n0(t.lastClimate), t.lastLev != null ? `${nf1.format(t.lastLev)} ×` : '—', ke(t.cum.rd), ke(t.cum.capex + t.cum.acquisitions), t.acquisitions.join(', ') || '—'] }))} />
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
      {G.firms.some((f) => f.history.some((h) => h.note)) && (
        <div className="grid2">{G.firms.filter((f) => f.history.some((h) => h.note)).map((f) => <JournalPanel key={f.id} f={f} title={`Journal — ${f.name}`} />)}</div>
      )}
      <WhatIf G={G} />
    </div>
  );
}
