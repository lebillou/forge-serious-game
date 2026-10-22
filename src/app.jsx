// Forge — version hot-seat (plusieurs équipes sur un même poste)
import * as E from './engine.js';
import * as C from './components.jsx';
const { useState, useEffect, useMemo, useRef, useCallback, Fragment, SEGS, SEG_LABEL, CFG,
  NF, nf0, nf1, nf2, ok, n0, ke, eu, pc, sg, vpsF, shiftLabel, QL, clamp,
  Num, Field, Toggle, Modal, Chip, Dot, LineChart, Table, Kpi, Setup, TopBar, MarketPanel, RankingPanel, NewsPanel, TeacherTools, ResolveConfirm,
  TeamConsole, Debrief, Rules, ResultDialog } = C;

// ---------- persistance ----------
const LS_KEY = 'forge.autosave.v1';
const lsGet = () => { try { return localStorage.getItem(LS_KEY); } catch { return null; } };
const lsSet = (v) => { try { localStorage.setItem(LS_KEY, v); } catch { /* stockage indisponible */ } };
const lsDel = () => { try { localStorage.removeItem(LS_KEY); } catch { /* idem */ } };

const capUse = (name) => (window.claude && typeof window.claude.use === 'function' ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
const inClaude = () => !!(window.claude && typeof window.claude.use === 'function');
// Hors claude.ai (GitHub Pages, fichier local) : téléchargement classique par lien.
function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const CHUNK = 120000;
async function cloudCol() {
  const db = await capUse('db'); const user = await capUse('user');
  if (!db || !user) return null;
  const id = await user.id();
  if (!id) return null;
  return db.collection('data/users/' + id);
}
async function cloudList() {
  const col = await cloudCol(); if (!col) return null;
  const out = [];
  for (const slot of [1, 2, 3]) {
    const s = await col.doc(`slot${slot}_meta`).get();
    out.push(s.exists ? { slot, ...s.data() } : { slot, empty: true });
  }
  return out;
}
async function cloudSave(slot, G) {
  const col = await cloudCol(); if (!col) throw new Error('Sauvegarde en ligne indisponible ici.');
  const str = E.exportSave(G);
  const parts = Math.ceil(str.length / CHUNK);
  for (let i = 0; i < parts; i++) await col.doc(`slot${slot}_c${i}`).set({ d: str.slice(i * CHUNK, (i + 1) * CHUNK) });
  await col.doc(`slot${slot}_meta`).set({
    parts, t: G.t, nQ: G.settings.nQuarters, teams: G.firms.map((f) => f.name).join(', '), savedAt: new Date().toISOString(), phase: G.phase,
  });
}
async function cloudLoad(slot) {
  const col = await cloudCol(); if (!col) throw new Error('Sauvegarde en ligne indisponible ici.');
  const m = await col.doc(`slot${slot}_meta`).get();
  if (!m.exists) throw new Error('Emplacement vide.');
  const { parts } = m.data();
  let str = '';
  for (let i = 0; i < parts; i++) { const c = await col.doc(`slot${slot}_c${i}`).get(); if (!c.exists) throw new Error('Sauvegarde incomplète.'); str += c.data().d; }
  return E.importSave(str);
}

// ---------- écran d'accueil ----------
function Home({ hasAutosave, autosaveInfo, onNew, onResume, onLoad, onRules }) {
  const [msg, setMsg] = useState('');
  const [slots, setSlots] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [paste, setPaste] = useState('');
  const showCloud = async () => { setLoading(true); try { setSlots(await cloudList()); } catch { setSlots(null); } setLoading(false); };
  const fromText = (txt) => { try { onLoad(E.importSave(txt)); } catch (e) { setMsg(e.message || 'Fichier illisible.'); } };
  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-mark">Forge</div>
        <p className="home-lede">Simulation de gestion industrielle en équipes. Chaque équipe dirige une usine de biens d'équipement face aux autres et à trois concurrents régionaux : prix, capacité, effectifs, achats, qualité, R&D, financement et croissance externe, trimestre après trimestre.</p>
        <div className="home-facts">
          <span><b>2 à 6</b> équipes sur un même poste</span>
          <span><b>8 à 24</b> trimestres</span>
          <span><b>2</b> segments, Standard et Premium</span>
          <span>Débriefing automatique</span>
        </div>
      </section>
      <section className="home-actions">
        <div className="panel">
          <h2>Commencer</h2>
          <div className="stack">
            <button className="btn btn-primary" onClick={onNew}>Nouvelle partie</button>
            {hasAutosave && <button className="btn" onClick={onResume}>Reprendre la partie en cours{autosaveInfo ? ` · ${autosaveInfo}` : ''}</button>}
            <button className="btn btn-ghost" onClick={onRules}>Règles et modèle</button>
          </div>
        </div>
        <div className="panel">
          <h2>Charger une sauvegarde</h2>
          <div className="stack">
            <label className="btn file-btn" htmlFor="load-file">Ouvrir un fichier .json
              <input id="load-file" type="file" accept=".json,application/json" onChange={(e) => {
                const file = e.target.files && e.target.files[0]; if (!file) return;
                const rd = new FileReader(); rd.onload = () => fromText(String(rd.result)); rd.onerror = () => setMsg('Lecture du fichier impossible.'); rd.readAsText(file);
                e.target.value = '';
              }} />
            </label>
            {inClaude() && slots === undefined && <button className="btn" disabled={loading} onClick={showCloud}>{loading ? 'Recherche…' : 'Sauvegardes en ligne'}</button>}
            {slots === null && <div className="hint">Sauvegarde en ligne indisponible dans cette vue (connexion à claude.ai requise).</div>}
            {slots && !slots.some((s) => !s.empty) && <div className="hint">Aucune sauvegarde en ligne pour le moment.</div>}
            {slots && slots.some((s) => !s.empty) && (
              <div className="slots">
                {slots.filter((s) => !s.empty).map((s) => (
                  <button key={s.slot} className="btn slot" onClick={async () => { try { onLoad(await cloudLoad(s.slot)); } catch (e) { setMsg(e.message); } }}>
                    <b>En ligne · emplacement {s.slot}</b>
                    <span>{s.teams} — {s.phase === 'finished' ? 'terminée' : `${s.t}/${s.nQ} trimestres joués`} — {new Date(s.savedAt).toLocaleString('fr-FR')}</span>
                  </button>
                ))}
              </div>
            )}
            <details>
              <summary>Coller un code de sauvegarde</summary>
              <textarea id="paste-save" rows="3" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Collez ici le contenu d'une sauvegarde" />
              <button className="btn" disabled={!paste.trim()} onClick={() => fromText(paste)}>Charger</button>
            </details>
            {msg && <div className="msg msg-bad">{msg}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}


// ---------- hub (écran projeté) ----------
function Hub({ G, prevG, onOpenTeam, onResolve, onUndo, onInject, onFinish, onDebrief, onRename }) {
  const [confirm, setConfirm] = useState(false);
  const submitted = G.submitted || {};
  const pending = G.firms.filter((f) => !submitted[f.id]);
  const finished = G.phase === 'finished';
  return (
    <div className="hub">
      <section className="hub-main">
        {!finished ? (
          <div className="panel">
            <div className="panel-head">
              <h2>Décisions — {QL(G.t + 1)}</h2>
              <span className="muted">{G.firms.length - pending.length} / {G.firms.length} validées</span>
            </div>
            <div className="andon">
              {G.firms.map((f) => (
                <div key={f.id} className={'andon-row' + (submitted[f.id] ? ' done' : '')}>
                  <span className="andon-lamp" style={{ '--team': f.color }} />
                  <span className="andon-name">{f.name}</span>
                  <span className="andon-state">{submitted[f.id] ? 'Validé' : (G.decisions?.[f.id] ? 'Brouillon' : 'En attente')}</span>
                  <button className="btn btn-sm" onClick={() => onOpenTeam(f.id)}>Ouvrir la console</button>
                </div>
              ))}
            </div>
            <div className="resolve-bar">
              <button className="btn btn-primary btn-lg" onClick={() => (pending.length ? setConfirm(true) : onResolve())}>Résoudre le trimestre</button>
              {prevG && <button className="btn btn-ghost" onClick={onUndo}>Annuler la dernière résolution</button>}
            </div>
          </div>
        ) : (
          <div className="panel finish-panel">
            <h2>Partie terminée</h2>
            <p>Les {G.settings.nQuarters} trimestres sont joués. Le débriefing compare la création de valeur, l'efficacité opérationnelle et les choix stratégiques des équipes.</p>
            <div className="row">
              <button className="btn btn-primary btn-lg" onClick={onDebrief}>Ouvrir le débriefing</button>
              {G.firms.map((f) => <button key={f.id} className="btn btn-sm" onClick={() => onOpenTeam(f.id)}><Dot color={f.color} />{f.name}</button>)}
            </div>
          </div>
        )}
        <MarketPanel G={G} />
        <TeacherTools G={G} onInject={onInject} onRename={onRename} onFinish={onFinish} />
      </section>
      <aside className="hub-side">
        <RankingPanel G={G} />
        <NewsPanel G={G} />
      </aside>
      {confirm && <ResolveConfirm pending={pending} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); onResolve(); }} />}
    </div>
  );
}

function Gate({ firm, onReveal, onBack, submitted }) {
  return (
    <div className="gate" style={{ '--team': firm.color }}>
      <div className="gate-card">
        <div className="gate-band" />
        <div className="gate-eyebrow">Console confidentielle</div>
        <div className="gate-name">{firm.name}</div>
        <p>Les données qui suivent ne concernent que cette équipe. Les autres équipes s'éloignent de l'écran.</p>
        {submitted && <p className="gate-ok">Décisions déjà validées pour ce trimestre. Vous pouvez les consulter ou les modifier.</p>}
        <div className="row">
          <button className="btn btn-primary btn-lg" onClick={onReveal}>Afficher la console</button>
          <button className="btn btn-ghost" onClick={onBack}>Retour</button>
        </div>
      </div>
    </div>
  );
}

// ---------- application ----------
function boot() {
  const hot = window.claude && window.claude.hot;
  const start = (data) => {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(<App initial={data || {}} />);
  };
  if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : {});
}

function App({ initial }) {
  const auto = useMemo(() => { const raw = lsGet(); if (!raw) return null; try { const o = JSON.parse(raw); return { game: E.importSave(JSON.stringify(o.game)), prev: o.prev ? E.importSave(JSON.stringify(o.prev)) : null }; } catch { return null; } }, []);
  const [G, setG] = useState(initial.G || null);
  const [prevG, setPrevG] = useState(initial.prevG || null);
  const [screen, setScreen] = useState(initial.screen || 'home');
  const [team, setTeam] = useState(initial.team || null);
  const [revealed, setRevealed] = useState(!!initial.revealed);
  const [saveOpen, setSaveOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [result, setResult] = useState(null);
  const [rulesFrom, setRulesFrom] = useState('home');
  const stateRef = useRef({});
  stateRef.current = { G, prevG, screen, team, revealed };

  useEffect(() => {
    const hot = window.claude && window.claude.hot;
    if (hot && hot.snapshot) hot.snapshot(() => stateRef.current);
  }, []);
  useEffect(() => {
    if (!G) return;
    const id = setTimeout(() => lsSet(JSON.stringify({ game: G, prev: prevG })), 300);
    return () => clearTimeout(id);
  }, [G, prevG]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { window.scrollTo(0, 0); }, [screen, team, revealed]);

  const startGame = (opts) => {
    const g = E.newGame(opts); g.submitted = {};
    setG(g); setPrevG(null); setScreen('hub');
  };
  const openTeam = (id) => { setTeam(id); setRevealed(false); setScreen('team'); };
  const draft = useCallback((fid, d) => setG((g) => ({ ...g, decisions: { ...(g.decisions || {}), [fid]: d }, submitted: { ...(g.submitted || {}), [fid]: false } })), []);
  const validate = (fid, d) => {
    setG((g) => ({ ...g, decisions: { ...(g.decisions || {}), [fid]: d }, submitted: { ...(g.submitted || {}), [fid]: true } }));
    setScreen('hub'); setTeam(null); setRevealed(false);
    setToast('Décisions validées');
  };
  const resolve = () => {
    try {
      const before = E.ranking(G);
      const ng = E.resolveQuarter(G, G.decisions || {});
      ng.submitted = {};
      setPrevG(G); setG(ng);
      setResult({ q: ng.t, before, after: E.ranking(ng), news: ng.news.filter((x) => x.t === ng.t) });
    } catch (e) { setToast('Résolution impossible : ' + (e.message || e)); }
  };
  const undo = () => { if (!prevG) return; setG(prevG); setPrevG(null); setToast('Dernière résolution annulée : les décisions saisies sont restaurées.'); };
  const inject = (id) => { setG((g) => E.injectEvent(g, id)); setToast(`${E.GLOBAL_EVENTS[id].label} programmé pour le prochain trimestre.`); };
  const finish = () => { setG((g) => ({ ...g, phase: 'finished' })); setScreen('debrief'); };
  const rename = (fid, name) => { const nm = String(name || '').trim(); if (!nm) return; setG((g) => ({ ...g, firms: g.firms.map((f) => (f.id === fid ? { ...f, name: nm.slice(0, 24) } : f)) })); };
  const loadGame = (g) => { if (!g.submitted) g.submitted = {}; setG(g); setPrevG(null); setScreen(g.phase === 'finished' ? 'debrief' : 'hub'); setToast('Partie chargée'); };
  const showRules = () => { setRulesFrom(screen === 'rules' ? rulesFrom : screen); setScreen('rules'); };
  const resumable = G ? { game: G, prev: prevG } : auto;
  const autosaveInfo = resumable ? `${resumable.game.firms.length} équipes, ${resumable.game.t}/${resumable.game.settings.nQuarters} trimestres` : '';

  let body = null;
  if (screen === 'home' || !G && !['setup', 'rules'].includes(screen)) {
    body = <Home hasAutosave={!!resumable} autosaveInfo={autosaveInfo} onNew={() => setScreen('setup')} onResume={() => { setG(resumable.game); setPrevG(resumable.prev); setScreen(resumable.game.phase === 'finished' ? 'debrief' : 'hub'); }} onLoad={loadGame} onRules={showRules} />;
  } else if (screen === 'setup') {
    body = <Setup onStart={startGame} onCancel={() => setScreen(G ? 'hub' : 'home')} />;
  } else if (screen === 'rules') {
    body = <Rules onBack={() => setScreen(rulesFrom === 'rules' ? (G ? 'hub' : 'home') : (rulesFrom === 'team' && !team ? 'hub' : rulesFrom))} />;
  } else if (screen === 'team' && team) {
    const f = G.firms.find((x) => x.id === team);
    body = revealed
      ? <TeamConsole G={G} firmId={team} draft={G.decisions?.[team]} submitted={!!(G.submitted || {})[team]} onDraft={(nd) => draft(team, nd)}
          actions={<>
            {G.phase !== 'finished' && <button className="btn btn-primary" onClick={() => validate(team, G.decisions?.[team] || E.defaultDecisions(G, f))}>{(G.submitted || {})[team] ? 'Décisions validées · masquer' : 'Valider et masquer'}</button>}
            <button className="btn btn-ghost" onClick={() => { setScreen(G.phase === 'finished' && rulesFrom === 'debrief' ? 'debrief' : 'hub'); setTeam(null); setRevealed(false); }}>{G.phase === 'finished' ? 'Fermer' : 'Masquer sans valider'}</button>
          </>} />
      : <Gate firm={f} submitted={!!(G.submitted || {})[team]} onReveal={() => setRevealed(true)} onBack={() => { setScreen('hub'); setTeam(null); }} />;
  } else if (screen === 'debrief') {
    body = <Debrief G={G} onBack={() => setScreen('hub')} onOpenTeam={(id) => { setRulesFrom('debrief'); openTeam(id); }} />;
  } else {
    body = <Hub G={G} prevG={prevG} onOpenTeam={openTeam} onResolve={resolve} onUndo={undo} onInject={inject} onFinish={finish} onDebrief={() => setScreen('debrief')} onRename={rename} />;
  }
  const teamOpen = screen === 'team' && revealed;
  return (
    <div className="app">
      <TopBar G={['home', 'setup'].includes(screen) ? null : G} onHome={() => setScreen(G ? 'hub' : 'home')} onRules={showRules} onSave={G && !teamOpen && !['home', 'setup'].includes(screen) ? () => setSaveOpen(true) : null}>
        {G && screen !== 'home' && <button className="btn btn-sm btn-ghost hide-sm" onClick={() => { setScreen('home'); setTeam(null); setRevealed(false); }}>Accueil</button>}
      </TopBar>
      <main className="main">{body}</main>
      {saveOpen && G && <SaveDialog G={G} onClose={() => setSaveOpen(false)} onToast={setToast} />}
      {result && <ResultDialog r={result} G={G} onClose={() => setResult(null)} onDebrief={() => { setResult(null); setScreen('debrief'); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function SaveDialog({ G, onClose, onToast }) {
  const [slots, setSlots] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useState(undefined);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    if (inClaude()) {
      cloudList().then((s) => live && setSlots(s)).catch(() => live && setSlots(null));
      capUse('downloads').then((d) => live && setDl(d));
    } else { setSlots(false); setDl(null); }
    return () => { live = false; };
  }, []);
  const fname = `forge-${G.firms.map((f) => f.name).join('-').normalize('NFD').replace(/[^\w-]+/g, '').slice(0, 40)}-T${G.t}.json`;
  return (
    <Modal title="Sauvegarder la partie" onClose={onClose} actions={<button className="btn" onClick={onClose}>Fermer</button>}>
      <p className="muted">La partie est aussi enregistrée automatiquement dans ce navigateur après chaque action.</p>
      {slots !== false && <h4>Sauvegarde en ligne</h4>}
      {slots === undefined && <p className="muted">Recherche des emplacements…</p>}
      {slots === null && <p className="muted">Indisponible dans cette vue (connexion à claude.ai requise).</p>}
      {slots && (
        <div className="slots">
          {slots.map((s) => (
            <button key={s.slot} className="btn slot" disabled={busy} onClick={async () => {
              setBusy(true); setErr('');
              try { await cloudSave(s.slot, G); setSlots(await cloudList()); onToast(`Partie enregistrée dans l'emplacement ${s.slot}`); } catch (e) { setErr(e.message || 'Échec de la sauvegarde en ligne.'); }
              setBusy(false);
            }}>
              <b>Emplacement {s.slot}</b>
              <span>{s.empty ? 'vide' : `${s.teams} — ${s.t}/${s.nQ} trim. — ${new Date(s.savedAt).toLocaleString('fr-FR')} (sera remplacé)`}</span>
            </button>
          ))}
        </div>
      )}
      <h4>Fichier</h4>
      <div className="row">
        {dl && <button className="btn" onClick={async () => { try { await dl.save({ filename: fname, data: E.exportSave(G) }); onToast('Fichier enregistré'); } catch (e) { if (e && e.code !== 'declined') setErr("L'enregistrement du fichier n'a pas abouti."); } }}>Télécharger le fichier .json</button>}
        {!inClaude() && <button className="btn" onClick={() => { downloadText(fname, E.exportSave(G)); onToast('Fichier téléchargé'); }}>Télécharger le fichier .json</button>}
        <button className="btn btn-ghost" onClick={async () => {
          const str = E.exportSave(G); setCode(str);
          try { await navigator.clipboard.writeText(str); onToast('Code de sauvegarde copié'); } catch { /* repli : sélection manuelle */ }
        }}>Copier le code de sauvegarde</button>
      </div>
      {code && <textarea id="save-code" className="code" rows="3" readOnly value={code} onFocus={(e) => e.target.select()} />}
      {err && <div className="msg msg-bad">{err}</div>}
    </Modal>
  );
}

boot();
