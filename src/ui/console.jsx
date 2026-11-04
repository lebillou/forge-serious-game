// Forge — console d'équipe : synthèse, décisions, production, marché, finances, historique, journal
import * as E from '../engine.js';
import { CFG, Chip, Dot, Field, Kpi, LineChart, Num, QL, SEGS, SEG_LABEL, Table, Toggle, clamp, eu, ke, n0, nf0, nf1, nf2, ok, pc, sg, shiftLabel, useMemo, useState, vpsF } from './base.jsx';

// ---------- console d'équipe ----------
export const TABS = [
  ['synthese', 'Synthèse'], ['decisions', 'Décisions'], ['production', 'Production'], ['marche', 'Marché'], ['finances', 'Finances'], ['historique', 'Historique'],
];


export function TeamConsole({ G, firmId, draft, onDraft, submitted, actions, subtitle, extraTabs = [], editable = null, noteRole = null, banner = null }) {
  const f = G.firms.find((x) => x.id === firmId);
  const finished = G.phase === 'finished';
  const [tab, setTab] = useState('synthese');
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
        {tab === 'decisions' && canDecide && <>{banner}<Decisions G={G} f={f} d={d} onChange={onDraft} submitted={submitted} editable={editable} noteRole={noteRole} /></>}
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
          <p>Vous prenez la direction d'une usine de biens d'équipement qui fabrique deux gammes : <b>Standard</b>, un marché de volume sensible au prix, et <b>Premium</b>, plus petit mais en croissance de {pc(CFG.growth.P)} par trimestre, sensible à la technologie et à la réputation. Toutes les équipes partent d'une situation identique.</p>
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
// Premier trimestre : repères pour prendre en main le formulaire (masquable, mémorisé par équipe et par partie)
const GUIDE_STEPS = [
  ['Commercial', 'sec-commercial', "Comparez vos prix au prix moyen du marché, rappelé sous chaque champ. Le Standard est très sensible au prix : une baisse gagne des parts mais rogne la marge. Le Premium l'est moins ; il dépend surtout de la technologie et de la réputation."],
  ['Production', 'sec-production', 'Alignez la production sur la demande estimée (sous les prix), en tenant compte du stock. La jauge « Charge prévue », à droite, doit rester sous 100 %.'],
  ['Ressources humaines', 'sec-rh', `Chaque ligne demande ${CFG.opsPerLineShift} opérateurs par équipe de travail. Le contrôle de cohérence compare l'effectif prévu au besoin, départs volontaires compris.`],
  ['Achats', 'sec-achats', 'Commandez au moins les kits nécessaires au plan, rappelés sous le champ. Le fournisseur A est moins cher, mais livre moins sûrement et apporte plus de défauts.'],
  ['Qualité et R&D', 'sec-qualite', "La R&D est le levier le plus puissant à long terme. Maintenance et contrôle qualité évitent pannes et rappels : les couper améliore le trimestre et dégrade les suivants."],
  ['Finance', 'sec-check', "Vérifiez la trésorerie de fin estimée, à droite. Au-delà du découvert autorisé, la banque impose un crédit d'urgence et une surveillance de 4 trimestres."],
  ['Journal', 'sec-journal', "Notez en deux lignes votre hypothèse principale, puis validez. Le débriefing la confrontera aux résultats."],
];
function FirstQuarterGuide({ storeKey }) {
  const [off, setOff] = useState(() => { try { return localStorage.getItem(storeKey) === '1'; } catch { return false; } });
  if (off) return null;
  const go = (id) => { const el = document.getElementById(id); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return (
    <section className="panel guide">
      <h3>Premier trimestre : par où commencer</h3>
      <p className="muted">Les valeurs proposées reconduisent la situation de départ : une équipe qui ne change rien reste à l'équilibre. Parcourez les sections dans cet ordre.</p>
      <ol className="guide-steps">
        {GUIDE_STEPS.map(([t, id, txt]) => (
          <li key={id}><div><b>{t}</b> · {txt}</div><button className="btn btn-sm btn-ghost" onClick={() => go(id)}>Voir</button></li>
        ))}
      </ol>
      <div className="row"><button className="btn btn-sm" onClick={() => { setOff(true); try { localStorage.setItem(storeKey, '1'); } catch { /* stockage indisponible */ } }}>Masquer ce guide</button></div>
    </section>
  );
}

const SECTION_ROLE = Object.fromEntries(Object.entries(E.ROLES).flatMap(([k, r]) => r.sections.map((sec) => [sec, r.label])));

export function Decisions({ G, f, d, onChange, submitted, journal = true, guide = true, editable = null, noteRole = null }) {
  const lock = (sec) => !!editable && !editable.includes(sec);
  const Lock = ({ sec }) => (lock(sec) ? <span className="role-lock">{SECTION_ROLE[sec]} · lecture seule</span> : null);
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
        {guide && G.t === 0 && <FirstQuarterGuide key={`${G.seed}-${f.id}`} storeKey={`forge.guide.off.${G.seed}.${f.id}`} />}
        {journal && (
          <section id="sec-journal" className="panel dsec">
            <h3>Journal de l'équipe</h3>
            {noteRole && E.ROLE_KEYS.filter((r) => r !== noteRole && d.notes && d.notes[r]).map((r) => (
              <p key={r} className="note-other"><b>{E.ROLES[r].label}</b> : {d.notes[r]}</p>
            ))}
            {(() => {
              const val = noteRole ? (d.notes && d.notes[noteRole]) || '' : d.note || '';
              const put = (v) => (noteRole ? onChange({ ...JSON.parse(JSON.stringify(d)), notes: { ...(d.notes || {}), [noteRole]: v } }) : set('note', v));
              return (
                <Field label={noteRole ? `Hypothèses et intentions du trimestre · votre paragraphe (${E.ROLES[noteRole].label})` : 'Hypothèses et intentions du trimestre'} htmlFor="dec-note"
                  hint={`Ce que vous anticipez, ce que vous cherchez à obtenir, l'arbitrage que vous assumez. Relu au débriefing face aux résultats. ${val.length} / ${E.NOTE_MAX} caractères.`}>
                  <textarea id="dec-note" className="note-input" rows="3" maxLength={E.NOTE_MAX} value={val} placeholder="Ex. : la demande Premium va accélérer ; on accepte une trésorerie tendue pour acheter une ligne avant les concurrents." onChange={(e) => put(e.target.value)} />
                </Field>
              );
            })()}
          </section>
        )}
        <section id="sec-commercial" className={'panel dsec' + (lock('commercial') ? ' locked' : '')}>
          <h3>Commercial<Lock sec="commercial" /></h3>
          <fieldset className="fs" disabled={lock('commercial')}>
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
          </fieldset>
        </section>

        <section id="sec-production" className={'panel dsec' + (lock('production') ? ' locked' : '')}>
          <h3>Production et capacité<Lock sec="production" /></h3>
          <fieldset className="fs" disabled={lock('production')}>
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
          </fieldset>
        </section>

        <section id="sec-rh" className={'panel dsec' + (lock('rh') ? ' locked' : '')}>
          <h3>Ressources humaines<Lock sec="rh" /></h3>
          <fieldset className="fs" disabled={lock('rh')}>
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
          </fieldset>
        </section>

        <section id="sec-achats" className={'panel dsec' + (lock('achats') ? ' locked' : '')}>
          <h3>Achats de composants<Lock sec="achats" /></h3>
          <fieldset className="fs" disabled={lock('achats')}>
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
          </fieldset>
        </section>

        <section id="sec-qualite" className={'panel dsec' + (lock('qualite') ? ' locked' : '')}>
          <h3>Qualité, R&D et certification<Lock sec="qualite" /></h3>
          <fieldset className="fs" disabled={lock('qualite')}>
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
          </fieldset>
        </section>

        <section id="sec-finance" className={'panel dsec' + (lock('finance') ? ' locked' : '')}>
          <h3>Finance<Lock sec="finance" /></h3>
          <fieldset className="fs" disabled={lock('finance')}>
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
          </fieldset>
        </section>

        <section className="panel dsec">
          <h3>Opportunités</h3>
          <div className="stack">
            <fieldset className="fs stack" disabled={lock('opp-commercial')}>
            <Lock sec="opp-commercial" />
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
            </fieldset>
            <fieldset className="fs stack" disabled={lock('opp-finance')}>
            {G.settings.ma && <Lock sec="opp-finance" />}
            {targets.length > 0 ? targets.map((t) => <TargetCard key={t.id} G={G} t={t} d={d} set={set} />) : (G.settings.ma && <p className="muted">Aucune entreprise à vendre pour le moment.</p>)}
            </fieldset>
          </div>
        </section>
      </div>

      <aside id="sec-check" className="dec-check">
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
      <JournalPanel f={f} />
    </div>
  );
}

// ---------- journal et contrefactuel ----------
export function JournalPanel({ f, title = 'Journal de l’équipe' }) {
  const H = f.history.filter((h) => h.note);
  if (!H.length) return null;
  return (
    <div className="panel journal">
      <h3>{title}</h3>
      <ol className="journal-list">
        {H.map((h) => (
          <li key={h.q}>
            <span className="news-q">{QL(h.q)}</span>
            <div><p>{h.note}</p><div className="muted">Résultat : CA {ke(h.revenue)} · résultat net {ke(h.ni)} · cours {vpsF(h.vps)} · TSR {sg(h.tsr, (x) => pc(x, 0))}</div></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
