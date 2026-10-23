// Forge — client multi-poste (une équipe par poste, serveur Node)
import * as E from './engine.js';
import * as C from './components.jsx';
const { useState, useEffect, useRef, useCallback, QL, Dot, Modal, Toggle, Setup, TopBar, MarketPanel, RankingPanel, NewsPanel, TeacherTools,
  ResolveConfirm, TeamConsole, Debrief, Rules, ResultDialog, Chip, Table, AiTag, aiLabel } = C;

const KEY = 'forge.net.code';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* indisponible */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* indisponible */ } };

async function api(path, { method = 'GET', body, code } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (code) headers['X-Forge-Code'] = code;
  let res;
  try { res = await fetch(new URL(path, window.location.href).toString(), { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); } catch (e) {
    const x = new Error('Serveur injoignable.'); x.status = 0; throw x;
  }
  let data = null;
  try { data = await res.json(); } catch { /* corps vide */ }
  if (!res.ok) { const x = new Error((data && data.error) || `Erreur ${res.status}`); x.status = res.status; throw x; }
  return data;
}

function ago(ms) {
  if (ms == null) return 'jamais connectée';
  if (ms < 12000) return 'en ligne';
  const m = Math.round(ms / 60000);
  return m < 1 ? 'vue il y a moins d’une minute' : `vue il y a ${m} min`;
}

function Countdown({ deadline, skew }) {
  const [now, setNow] = useState(Date.now() + skew);
  useEffect(() => { const id = setInterval(() => setNow(Date.now() + skew), 1000); return () => clearInterval(id); }, [skew]);
  if (!deadline) return null;
  const left = Math.max(0, Math.round((deadline - now) / 1000));
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');
  return <span className={'countdown' + (left === 0 ? ' over' : left < 60 ? ' low' : '')} role="timer">{left === 0 ? 'Temps écoulé' : `${mm}:${ss}`}</span>;
}

// ---------- connexion ----------
function Login({ onLogin, error, busy }) {
  const [code, setCode] = useState('');
  return (
    <div className="login">
      <div className="home-mark">Forge</div>
      <form className="panel login-card" onSubmit={(e) => { e.preventDefault(); if (code.trim()) onLogin(code.trim().toUpperCase()); }}>
        <h2>Connexion</h2>
        <p className="muted">Saisissez le code d'équipe remis par l'animateur. L'animateur utilise le code affiché au lancement du serveur.</p>
        <input id="login-code" className="code-input" autoComplete="off" autoCapitalize="characters" spellCheck="false" maxLength={12} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" />
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy || !code.trim()}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        {error && <div className="msg msg-bad">{error}</div>}
      </form>
    </div>
  );
}

// ---------- application ----------
function NetApp() {
  const [code, setCode] = useState(() => lsGet(KEY));
  const [role, setRole] = useState(null);
  const [loginErr, setLoginErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [view, setView] = useState(null);
  const [conn, setConn] = useState(true);
  const [screen, setScreen] = useState('main');
  const [toast, setToast] = useState('');
  const [skew, setSkew] = useState(0);
  const revRef = useRef(0);

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 4000); return () => clearTimeout(id); }, [toast]);

  const logout = useCallback((msg) => { lsDel(KEY); setCode(null); setRole(null); setView(null); setStatus(null); revRef.current = 0; setScreen('main'); setLoginErr(msg || ''); }, []);

  const login = async (c) => {
    setBusy(true); setLoginErr('');
    try { const r = await api('/api/login', { method: 'POST', body: { code: c } }); lsSet(KEY, c); setCode(c); setRole(r); }
    catch (e) { setLoginErr(e.status === 0 ? 'Serveur injoignable : vérifiez l’adresse et le réseau.' : e.message); }
    setBusy(false);
  };

  useEffect(() => {
    if (!code || role) return;
    api('/api/login', { method: 'POST', body: { code } }).then(setRole).catch((e) => { if (e.status === 401) logout('Ce code n’est plus valable (nouvelle partie ?). Demandez votre code à l’animateur.'); else setConn(false); });
  }, [code, role, logout]);

  const loadView = useCallback(async () => {
    const v = await api('/api/view', { code });
    revRef.current = v.rev; setView(v);
  }, [code]);

  const refresh = useCallback(async () => {
    const st = await api('/api/status', { code });
    setStatus(st); setSkew(st.now - Date.now()); setConn(true);
    if (st.hasGame && st.rev !== revRef.current) await loadView();
    if (!st.hasGame) { setView(null); revRef.current = st.rev; }
    return st;
  }, [code, loadView]);

  useEffect(() => {
    if (!role) return undefined;
    let live = true, timer;
    const tick = async () => {
      try { await refresh(); } catch (e) {
        if (!live) return;
        if (e.status === 401) { logout('Votre code n’est plus valable : la partie a peut-être été relancée. Demandez votre nouveau code à l’animateur.'); return; }
        setConn(false);
      }
      if (live) timer = setTimeout(tick, 2500);
    };
    tick();
    return () => { live = false; clearTimeout(timer); };
  }, [role, refresh, logout]);

  const act = useCallback(async (path, body) => {
    try { const r = await api(path, { method: 'POST', body: body || {}, code }); await refresh(); return r; }
    catch (e) { setToast(e.message); throw e; }
  }, [code, refresh]);

  let body;
  if (!role) body = <Login onLogin={login} error={loginErr} busy={busy} />;
  else if (screen === 'rules') body = <Rules net onBack={() => setScreen('main')} />;
  else if (role.role === 'admin') body = <AdminScreen view={view} status={status} skew={skew} act={act} code={code} onToast={setToast} screen={screen} setScreen={setScreen} />;
  else body = <TeamScreen view={view} status={status} skew={skew} code={code} onToast={setToast} onLogout={() => logout('')} reload={loadView} />;

  const G = view && view.G;
  return (
    <div className="app">
      <TopBar G={G} onHome={() => setScreen('main')} onRules={() => setScreen('rules')}>
        {role && <span className="role-tag">{role.role === 'admin' ? 'Animateur' : (G ? (G.firms.find((f) => f.id === role.firmId) || {}).name : role.name)}</span>}
        {role && role.role === 'admin' && <button className="btn btn-sm btn-ghost" onClick={() => logout('')}>Déconnexion</button>}
      </TopBar>
      {!conn && <div className="conn-lost">Connexion au serveur perdue. Nouvelle tentative automatique… Vos saisies restent sur ce poste.</div>}
      <main className="main">{body}</main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

// ---------- animateur ----------
function AdminScreen({ view, status, skew, act, code, onToast, screen, setScreen }) {
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [peek, setPeek] = useState(null);
  const [reveal, setReveal] = useState({});
  const [closeAsk, setCloseAsk] = useState(false);
  const [timerMin, setTimerMin] = useState(15);

  if (!status) return <div className="panel"><p className="muted">Connexion au serveur…</p></div>;
  if (!status.hasGame || !view || !view.G) {
    return (
      <div className="stack-lg">
        <Setup onStart={(opts) => act('/api/admin/new', opts).catch(() => {})} onCancel={null} />
        <div className="panel narrow-panel">
          <h2>Reprendre une partie sauvegardée</h2>
          <ImportButton act={act} onToast={onToast} />
        </div>
      </div>
    );
  }
  const G = view.G;
  const submitted = status.submitted || G.submitted || {};
  const drafted = status.drafted || {};
  const pending = G.firms.filter((f) => !E.isAi(f) && !submitted[f.id]);
  const finished = G.phase === 'finished';
  const seen = status.lastSeen || {};

  const resolve = async () => {
    const before = E.ranking(G);
    try {
      const r = await act('/api/admin/resolve', { t: G.t });
      const v = await api('/api/view', { code });
      setResult({ q: r.q, before, after: E.ranking(v.G), news: v.G.news.filter((x) => x.t === r.q), G: v.G });
    } catch { /* message déjà affiché */ }
  };

  if (screen === 'debrief') return <Debrief G={G} onBack={() => setScreen('main')} onOpenTeam={(id) => { setPeek(id); setScreen('main'); }} />;
  if (peek) {
    return (
      <TeamConsole G={G} firmId={peek} subtitle="Vue animateur, lecture seule"
        actions={<button className="btn" onClick={() => setPeek(null)}>Retour au tableau de bord</button>} />
    );
  }

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
                <div key={f.id} className={'andon-row' + (submitted[f.id] || E.isAi(f) ? ' done' : '')}>
                  <span className="andon-lamp" style={{ '--team': f.color }} />
                  <span className="andon-name">{f.name}<AiTag ai={f.ai} />{!E.isAi(f) && <small className={'presence' + (seen[f.id] != null && seen[f.id] < 12000 ? ' on' : '')}>{ago(seen[f.id])}</small>}</span>
                  <span className="andon-state">{E.isAi(f) ? aiLabel(f.ai) : submitted[f.id] ? 'Validé' : drafted[f.id] ? 'Brouillon' : 'En attente'}</span>
                  <button className="btn btn-sm" onClick={() => setPeek(f.id)}>Voir</button>
                </div>
              ))}
            </div>
            <div className="timer-bar">
              <span className="timer-label">Minuteur</span>
              {status.deadline ? <Countdown deadline={status.deadline} skew={skew} /> : <span className="muted">arrêté</span>}
              <span className="num"><input id="timer-min" inputMode="numeric" value={timerMin} onChange={(e) => setTimerMin(e.target.value.replace(/\D/g, '').slice(0, 3))} /><span className="unit">min</span></span>
              <button className="btn btn-sm" onClick={() => act('/api/admin/timer', { minutes: Number(timerMin) || 15 }).catch(() => {})}>{status.deadline ? 'Relancer' : 'Lancer'}</button>
              {status.deadline && <button className="btn btn-sm btn-ghost" onClick={() => act('/api/admin/timer', { minutes: 0 }).catch(() => {})}>Arrêter</button>}
            </div>
            <div className="resolve-bar">
              <button className="btn btn-primary btn-lg" onClick={() => (pending.length ? setConfirm(true) : resolve())}>Résoudre le trimestre</button>
              {view.canUndo && <button className="btn btn-ghost" onClick={() => act('/api/admin/undo').then(() => onToast('Dernière résolution annulée : les décisions des équipes sont restaurées.')).catch(() => {})}>Annuler la dernière résolution</button>}
            </div>
          </div>
        ) : (
          <div className="panel finish-panel">
            <h2>Partie terminée</h2>
            <p>Le débriefing est aussi accessible à chaque équipe sur son poste, avec l'ensemble des données de la partie.</p>
            <div className="row"><button className="btn btn-primary btn-lg" onClick={() => setScreen('debrief')}>Ouvrir le débriefing</button></div>
          </div>
        )}

        <div className="panel">
          <div className="panel-head"><h2>Accès des équipes</h2><span className="muted">ne pas projeter les codes</span></div>
          {view.addresses && view.addresses.length > 0 && (
            <p>Adresse à communiquer aux équipes : {view.addresses.map((a) => <code key={a} className="addr">{a}</code>)}</p>
          )}
          <Table head={['Équipe', 'Code', '']} rows={G.firms.map((f) => ({
            cells: [<span className="team-cell"><Dot color={f.color} />{f.name}<AiTag ai={f.ai} /></span>,
              <code className="team-code">{reveal[f.id] ? view.codes[f.id] : '••••••'}</code>,
              <span className="row row-right">
                <button className="btn btn-sm btn-ghost" onClick={() => setReveal({ ...reveal, [f.id]: !reveal[f.id] })}>{reveal[f.id] ? 'Masquer' : 'Afficher'}</button>
                <button className="btn btn-sm btn-ghost" onClick={() => act('/api/admin/newcode', { id: f.id }).then(() => onToast(`Nouveau code pour ${f.name} : l'ancien ne fonctionne plus.`)).catch(() => {})}>Nouveau code</button>
              </span>],
          }))} />
        </div>

        <MarketPanel G={G} />
        <TeacherTools G={G} onInject={(id) => act('/api/admin/inject', { id }).then(() => onToast(`${E.GLOBAL_EVENTS[id].label} programmé pour le prochain trimestre.`)).catch(() => {})}
          onRename={(id, name) => act('/api/admin/rename', { id, name }).catch(() => {})}
          onSetAi={(id, profile) => { const f = G.firms.find((x) => x.id === id); act('/api/admin/ai', { id, profile }).then(() => onToast(profile ? `${f.name} est confiée à l'IA (profil ${E.AI_PROFILES[profile].label}).` : `${f.name} est rendue à son équipe : communiquez-lui son code si besoin.`)).catch(() => {}); }}
          onFinish={() => act('/api/admin/finish').then(() => setScreen('debrief')).catch(() => {})}>
          <div className="teacher-row">
            <label>Sauvegarde</label>
            <div className="row">
              <button className="btn btn-sm" onClick={() => exportFile(code, G).catch((e) => onToast(e.message))}>Télécharger la partie (.json)</button>
              <ImportButton act={act} onToast={onToast} small />
              <button className="btn btn-sm btn-danger" onClick={() => setCloseAsk(true)}>Fermer la partie</button>
            </div>
            <div className="hint">Le serveur enregistre la partie en continu et la reprend s'il redémarre. Le fichier sert d'archive ou à changer de serveur.</div>
          </div>
        </TeacherTools>
      </section>
      <aside className="hub-side">
        <RankingPanel G={G} />
        <NewsPanel G={G} />
      </aside>
      {confirm && <ResolveConfirm pending={pending} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); resolve(); }} />}
      {result && <ResultDialog r={result} G={result.G} onClose={() => setResult(null)} onDebrief={() => { setResult(null); setScreen('debrief'); }} />}
      {closeAsk && (
        <Modal title="Fermer la partie ?" onClose={() => setCloseAsk(false)} actions={<>
          <button className="btn btn-ghost" onClick={() => setCloseAsk(false)}>Revenir</button>
          <button className="btn btn-danger" onClick={() => { setCloseAsk(false); act('/api/admin/close').catch(() => {}); }}>Fermer définitivement</button>
        </>}>
          <p>La partie en cours est effacée du serveur et les codes d'équipe cessent de fonctionner. Téléchargez-la d'abord si vous voulez la conserver.</p>
        </Modal>
      )}
    </div>
  );
}

async function exportFile(code, G) {
  const res = await fetch(new URL('/api/admin/export', window.location.href).toString(), { headers: { 'X-Forge-Code': code } });
  if (!res.ok) throw new Error('Export impossible.');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `forge-${G.firms.map((f) => f.name).join('-').normalize('NFD').replace(/[^\w-]+/g, '').slice(0, 40)}-T${G.t}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function ImportButton({ act, onToast, small }) {
  const [ask, setAsk] = useState(null);
  return (
    <>
      <label className={'btn file-btn' + (small ? ' btn-sm' : '')} htmlFor={small ? 'import-file-sm' : 'import-file'}>Charger un fichier .json
        <input id={small ? 'import-file-sm' : 'import-file'} type="file" accept=".json,application/json" onChange={(e) => {
          const file = e.target.files && e.target.files[0]; if (!file) return;
          const rd = new FileReader();
          rd.onload = () => { try { const G = E.importSave(String(rd.result)); setAsk({ text: String(rd.result), G }); } catch (x) { onToast(x.message || 'Fichier illisible.'); } };
          rd.readAsText(file); e.target.value = '';
        }} />
      </label>
      {ask && (
        <Modal title="Charger cette partie ?" onClose={() => setAsk(null)} actions={<>
          <button className="btn btn-ghost" onClick={() => setAsk(null)}>Annuler</button>
          <button className="btn btn-primary" onClick={() => { const t = ask.text; setAsk(null); act('/api/admin/import', { save: t }).then(() => onToast('Partie chargée. De nouveaux codes d’équipe ont été générés.')).catch(() => {}); }}>Charger</button>
        </>}>
          <p>{ask.G.firms.map((f) => f.name).join(', ')} — {ask.G.t} / {ask.G.settings.nQuarters} trimestres joués.</p>
          <p>Elle remplace la partie en cours sur le serveur. De nouveaux codes d'équipe sont générés.</p>
        </Modal>
      )}
    </>
  );
}

// ---------- équipe ----------
function TeamScreen({ view, status, skew, code, onToast, onLogout, reload }) {
  const [draft, setDraft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [save, setSave] = useState('idle'); // idle | pending | saving | saved | error
  const quarterRef = useRef(null);
  const timerRef = useRef(null);
  const latest = useRef(null);
  const pushRef = useRef(null);

  const G = view && view.G;
  const fid = view && view.firmId;
  const q = G ? G.t + 1 : null;

  useEffect(() => {
    if (!G) return;
    const key = G.phase === 'finished' ? 'end' : q;
    if (quarterRef.current !== key) {
      const first = quarterRef.current === null;
      quarterRef.current = key;
      clearTimeout(timerRef.current);
      setDraft(view.draft); setSubmitted(view.submitted); setSave('idle');
      if (!first) { onToast(G.phase === 'finished' ? 'Partie terminée : le débriefing est disponible.' : `Trimestre ${QL(G.t)} résolu : votre rapport est disponible.`); }
    } else if (save === 'idle' || save === 'saved') {
      setSubmitted(view.submitted);
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const push = useCallback(async (d, submit) => {
    setSave('saving');
    try {
      await api('/api/decisions', { method: 'PUT', code, body: { q, decisions: d, submit } });
      if (latest.current === d) setSave('saved');
      if (submit) { setSubmitted(true); onToast('Décisions validées. Vous pouvez encore les modifier jusqu’à la résolution.'); }
    } catch (e) {
      if (e.status === 0) {
        // coupure réseau ou serveur redémarré : nouvel essai tant que la saisie n'a pas changé
        setSave('retry');
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { if (latest.current === d) pushRef.current(d, submit); }, 3000);
        return;
      }
      setSave('error');
      onToast(e.message);
      if (e.status === 409) reload().catch(() => {});
    }
  }, [code, q, onToast, reload]);
  pushRef.current = push;

  if (!status) return <div className="panel"><p className="muted">Connexion au serveur…</p></div>;
  if (!status.hasGame || !G) {
    return (
      <div className="wait panel">
        <h2>En attente du lancement</h2>
        <p>L'animateur n'a pas encore lancé la partie. Cette page se met à jour toute seule.</p>
        <button className="btn btn-ghost" onClick={onLogout}>Changer de code</button>
      </div>
    );
  }
  const f = G.firms.find((x) => x.id === fid);
  if (!f) return <div className="panel"><p>Équipe introuvable.</p><button className="btn" onClick={onLogout}>Changer de code</button></div>;
  const finished = G.phase === 'finished';
  const byAi = E.isAi(f);
  const subs = status.submitted || {};
  const nDone = G.firms.filter((x) => E.isAi(x) || subs[x.id]).length;

  const onDraft = (nd) => {
    latest.current = nd;
    setDraft(nd); setSubmitted(false); setSave('pending');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => push(nd, false), 700);
  };
  const validate = () => {
    clearTimeout(timerRef.current);
    const d = draft || E.defaultDecisions(G, f);
    latest.current = d;
    push(d, true);
  };
  const saveLabel = { idle: draft ? 'Brouillon enregistré' : 'Non validé', pending: 'Modifications en cours…', saving: 'Enregistrement…', saved: 'Brouillon enregistré', error: 'Non enregistré', retry: 'Non enregistré · nouvel essai automatique' }[save];

  const extraTabs = [
    { key: 'public', label: 'Classement', render: () => (
      <div className="hub">
        <section className="hub-main"><MarketPanel G={G} /></section>
        <aside className="hub-side"><RankingPanel G={G} /><NewsPanel G={G} /></aside>
      </div>
    ) },
  ];
  if (finished) extraTabs.unshift({ key: 'debrief', label: 'Débriefing', render: () => <Debrief G={G} /> });

  return (
    <TeamConsole key={finished ? 'fin' : `q${G.t}${byAi ? 'ia' : ''}`} G={G} firmId={fid} draft={draft} submitted={submitted} onDraft={finished || byAi ? null : onDraft} extraTabs={extraTabs}
      subtitle={finished ? 'Partie terminée' : byAi ? `Entreprise pilotée par l'IA (profil ${E.AI_PROFILES[f.ai].label}) sur décision de l'animateur · consultation seule` : `Décisions pour ${QL(q)} · ${nDone}/${G.firms.length} équipes ont validé`}
      actions={<>
        {!finished && status.deadline && <Countdown deadline={status.deadline} skew={skew} />}
        {!finished && !byAi && (submitted ? <Chip kind="ok">Validé</Chip> : <span className={'save-state s-' + save}>{saveLabel}</span>)}
        {!finished && byAi && <Chip kind="info">{aiLabel(f.ai)}</Chip>}
        {!finished && !byAi && <button className="btn btn-primary" onClick={validate} disabled={save === 'saving'}>{submitted ? 'Valider de nouveau' : 'Valider mes décisions'}</button>}
        <button className="btn btn-ghost" onClick={onLogout}>Quitter</button>
      </>} />
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<NetApp />);
