// Forge — création de partie et barre supérieure
import * as E from '../engine.js';
import { AiSelect, Dot, Field, Num, QL, Toggle, useState } from './base.jsx';

// ---------- paramétrage ----------
const aiProfiles = (list) => [...new Set(list.filter(Boolean))].map((k) => [k, E.AI_PROFILES[k]]);

export function Setup({ onStart, onCancel, net = false }) {
  const [n, setN] = useState(4);
  const [names, setNames] = useState(['Aubisque', 'Tourmalet', 'Soulor', 'Peyresourde', 'Aspin', 'Marie-Blanque']);
  const [ai, setAi] = useState([null, null, null, null, null, null]);
  const [nQ, setNQ] = useState(20);
  const [scenario, setScenario] = useState('standard');
  const [events, setEvents] = useState(true);
  const [tenders, setTenders] = useState(true);
  const [ma, setMa] = useState(true);
  const [roles, setRoles] = useState(false);
  const [preset, setPreset] = useState('tsr');
  const [weights, setWeights] = useState({ ...E.SCORE_PRESETS.tsr.weights });
  const [sched, setSched] = useState('');
  const schedErr = (() => { try { E.parseSchedule(sched); return ''; } catch (e) { return e.message; } })();
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
              <AiSelect id={`team-ai-${i}`} value={ai[i]} onChange={(v) => { const c = [...ai]; c[i] = v; setAi(c); }} />
            </div>
          ))}
        </div>
        <div className="hint">Une entreprise confiée à l'IA décide seule à chaque trimestre et concourt au classement comme les autres. Profils : {Object.values(E.AI_PROFILES).map((p) => `${p.label} (${p.level.toLowerCase()})`).join(', ')}. L'animateur peut changer de pilote en cours de partie.</div>
        {aiProfiles(ai.slice(0, n)).map(([k, p]) => <div key={k} className="hint"><b>{p.label}</b> : {p.desc}</div>)}
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
          {net && <Toggle id="opt-roles" checked={roles} onChange={setRoles}>Rôles dans chaque équipe : {E.ROLE_KEYS.map((r) => E.ROLES[r].label.toLowerCase()).join(', ')}. Chacun saisit sa partie sur son poste ; l'équipe est validée quand les trois rôles ont validé.</Toggle>}
        </div>
        <Field label="Classement" htmlFor="score-tsr" hint="Chaque critère est ramené entre 0 (moins bonne équipe) et 100 (meilleure), puis pondéré. Le TSR seul classe sur la valeur créée pour l'actionnaire.">
          <div className="seg-ctl">
            {Object.entries(E.SCORE_PRESETS).map(([k, p]) => <button key={k} id={`score-${k}`} className={'seg-btn' + (preset === k ? ' on' : '')} onClick={() => { setPreset(k); setWeights({ ...p.weights }); }}>{p.label}</button>)}
            <button id="score-custom" className={'seg-btn' + (preset === 'custom' ? ' on' : '')} onClick={() => setPreset('custom')}>Personnalisé</button>
          </div>
        </Field>
        {preset !== 'tsr' && (
          <div className="fgrid score-grid">
            {Object.entries(E.SCORE_CRITERIA).map(([k, c]) => (
              <Field key={k} label={c.label} htmlFor={`w-${k}`}>
                {preset === 'custom'
                  ? <Num id={`w-${k}`} value={weights[k] || 0} step={5} max={100} unit="pts" onChange={(v) => setWeights({ ...weights, [k]: Math.round(v) })} />
                  : <span className="num-ro">{weights[k] || 0} pts</span>}
              </Field>
            ))}
          </div>
        )}
        <Field label="Chronologie d'événements (facultatif)" htmlFor="sched" hint={schedErr || "Pour imposer la même séquence de chocs à plusieurs groupes : collez la chronologie copiée dans les outils de l'animateur d'une autre partie, par exemple 6:recession 10:norme."}>
          <input id="sched" className="txt" value={sched} onChange={(e) => setSched(e.target.value)} placeholder="aucune" />
        </Field>
        <Field label="Graine aléatoire (facultatif)" htmlFor="seed" hint="Deux parties lancées avec la même graine et les mêmes décisions donnent les mêmes résultats.">
          <input id="seed" className="txt" inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))} placeholder="aléatoire" />
        </Field>
      </div>
      <div className="row-end">
        <button className="btn btn-primary" onClick={() => !schedErr && onStart({ teams: names.slice(0, n), ai: ai.slice(0, n), roles: net && roles, score: E.scoreWeights(weights), schedule: sched, nQuarters: nQ, scenario, events, tenders, ma, seed: seed ? Number(seed) : undefined })}>Lancer la partie</button>
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
