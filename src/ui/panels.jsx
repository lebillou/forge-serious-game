// Forge — panneaux du tableau de bord, outils de l’animateur, résultat du trimestre
import * as E from '../engine.js';
import { AiSelect, AiTag, Dot, Kpi, LineChart, Modal, QL, SEG_LABEL, Table, Toggle, eu, ke, n0, nf0, nf1, nf2, pc, sg, shiftLabel, useState, vpsF } from './base.jsx';

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
  const pure = E.isPureTsr(G);
  return (
    <div className="panel">
      <div className="panel-head"><h2>Classement</h2><span className="muted">{pure ? "rentabilité pour l'actionnaire" : 'score pondéré'}</span></div>
      <Table head={[...['Équipe'], ...(pure ? [] : ['Score']), 'Cours', 'TSR', 'CA trim.', 'Notation']} rows={rank.map((r) => ({
        cells: [<span className="team-cell"><b className="rank">{r.rank}</b><Dot color={r.color} />{r.name}<AiTag ai={r.ai} /></span>, ...(pure ? [] : [<b>{n0(r.score)}</b>]), vpsF(r.vps), <span className={r.tsr >= 0 ? 'pos' : 'neg'}>{sg(r.tsr, (x) => pc(x, 0))}</span>, ke(r.revenue), r.rating],
      }))} />
      <div className="hint">{pure ? 'TSR : variation du cours depuis le départ, dividendes cumulés inclus.' : `Score sur 100 : ${E.scoreLabel(G)}. Chaque critère est ramené entre la moins bonne équipe (0) et la meilleure (100). TSR : variation du cours, dividendes inclus.`}</div>
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

export function TeacherTools({ G, onInject, onRename, onFinish, onSetAi, onSchedule, children }) {
  const [showTeacher, setShowTeacher] = useState(false);
  const [ev, setEv] = useState('mp');
  const [finishAsk, setFinishAsk] = useState(false);
  const [schQ, setSchQ] = useState(Math.min(G.t + 2, G.settings.nQuarters));
  const [schEv, setSchEv] = useState('recession');
  const [schTxt, setSchTxt] = useState('');
  const finished = G.phase === 'finished';
  const sched = G.schedule || [];
  const future = sched.filter((x) => x.q > G.t);
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
        {!finished && onSetAi && (
          <div className="teacher-row">
            <label>Pilotage des entreprises</label>
            <div className="ai-grid">
              {G.firms.map((f) => (
                <div key={f.id} className="team-name-row">
                  <Dot color={f.color} /><span className="ai-name">{f.name}</span>
                  <AiSelect id={`pilot-${f.id}`} value={f.ai} onChange={(v) => onSetAi(f.id, v)} />
                </div>
              ))}
            </div>
            <div className="hint">Confier une entreprise à l'IA (équipe absente, effectif insuffisant, difficulté accrue) ou la rendre à son équipe. Le changement s'applique à la prochaine résolution ; le brouillon de l'équipe est abandonné.</div>
          </div>
        )}
        {!finished && onSchedule && (
          <div className="teacher-row">
            <label htmlFor="sch-q">Chronologie des événements</label>
            {sched.length > 0 ? (
              <ul className="sched">{sched.map((x) => (
                <li key={`${x.q}${x.id}`} className={x.q <= G.t ? 'done' : ''}><span className="news-q">{QL(x.q)}</span><span>{E.GLOBAL_EVENTS[x.id].label}</span>
                  {x.q <= G.t ? <span className="muted">joué</span> : <button className="btn btn-sm btn-ghost" onClick={() => onSchedule(future.filter((y) => y !== x))}>Retirer</button>}</li>
              ))}</ul>
            ) : <div className="hint">Aucun événement programmé.</div>}
            <div className="row">
              <select id="sch-q" value={schQ} onChange={(e) => setSchQ(Number(e.target.value))}>
                {Array.from({ length: G.settings.nQuarters - G.t }, (_, i) => G.t + 1 + i).map((q) => <option key={q} value={q}>{QL(q)}</option>)}
              </select>
              <select id="sch-ev" value={schEv} onChange={(e) => setSchEv(e.target.value)}>
                {Object.entries(E.GLOBAL_EVENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="btn btn-sm" onClick={() => onSchedule([...future, { q: schQ, id: schEv }])}>Ajouter</button>
            </div>
            <div className="row">
              <input id="sch-txt" className="txt" value={schTxt} onChange={(e) => setSchTxt(e.target.value)} placeholder="remplacer les événements à venir, ex. 6:recession 10:norme" />
              <button className="btn btn-sm btn-ghost" onClick={() => { try { onSchedule(E.parseSchedule(schTxt)); setSchTxt(''); } catch (e) { setSchTxt(e.message); } }}>Remplacer</button>
            </div>
            <div className="hint">Un trimestre programmé remplace le tirage aléatoire des chocs. Pour imposer la même séquence à un autre groupe, copiez le code {sched.length ? <code>{E.scheduleText(G)}</code> : 'de la chronologie'} dans le champ « Chronologie » de sa nouvelle partie. Les équipes ne voient pas la chronologie.</div>
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
        <div className="hint">Graine de la partie : {G.seed} · scénario {E.SCENARIOS[G.settings.scenario].label} · aléas {G.settings.events ? 'actifs' : 'désactivés'} · appels d'offres {G.settings.tenders ? 'actifs' : 'désactivés'} · croissance externe {G.settings.ma ? 'active' : 'désactivée'} · classement {E.isPureTsr(G) ? 'TSR' : E.scoreLabel(G)}</div>
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
      return { cells: [<span className="team-cell"><Dot color={f.color} />{f.name}<AiTag ai={f.ai} /></span>, ke(f.cash - f.overdraft), ke(f.debt), h ? ke(h.ebit) : '—', h ? pc(h.trs) : '—', h ? pc(h.fill) : '—', n0(f.reputation), n0(f.climate), `${n0(f.tech.S)} / ${n0(f.tech.P)}`, `${f.lines.length} · ${shiftLabel(f.shifts)}`] };
    })} />
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
        return { cells: [<span className="team-cell"><b className="rank">{x.rank}</b><Dot color={x.color} />{x.name}<AiTag ai={x.ai} /></span>, vpsF(x.vps), sg(x.tsr, (v) => pc(v, 0)), mv > 0 ? <span className="pos">▲ {mv}</span> : mv < 0 ? <span className="neg">▼ {-mv}</span> : <span className="muted">=</span>] };
      })} />
      {r.news.length > 0 && <ul className="news compact">{r.news.map((x, i) => <li key={i} className={'news-' + x.kind}><span>{x.text}</span></li>)}</ul>}
      <p className="muted">Chaque équipe peut maintenant ouvrir sa console pour lire son rapport.</p>
    </Modal>
  );
}
