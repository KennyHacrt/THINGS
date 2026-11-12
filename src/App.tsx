import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, ChevronRight, Clock3, Command, Hand as HandIcon, History, Layers3, Mic, MoreHorizontal, Pause, Play, Plus, RotateCcw, Settings2, Sparkles, Square, Sun, Utensils, Volume2, X } from 'lucide-react';
import { Hand, type HandPose } from './Hand';
import { createPlan, dinnerShortlist, readHistory, recipes, suggestions, type Plan, type SavedTask } from './engine';

declare global {
  interface Window {
    thingsDesktop?: { setCompanion: (enabled: boolean) => Promise<boolean>; onVoiceShortcut: (cb: () => void) => () => void };
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }
}
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((event: { results: { [n: number]: { [n: number]: { transcript: string }; isFinal: boolean }; length: number } }) => void) | null; onerror: ((event: {error: string}) => void) | null; onend: (() => void) | null };
type Preferences = { motion: boolean; sound: boolean; companion: boolean };
type Status = 'idle' | 'running' | 'paused' | 'done' | 'cancelled';
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
function initialHistory() { try { return readHistory(localStorage.getItem('things.history')); } catch { return []; } }
function initialPrefs(): Preferences { try { const p = JSON.parse(localStorage.getItem('things.preferences') || '{}'); return { motion: p.motion !== false, sound: p.sound === true, companion: false }; } catch { return {motion: true, sound: false, companion: false}; } }

export default function App() {
  const overlay = new URLSearchParams(window.location.search).has('companion');
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [step, setStep] = useState(-1);
  const [opened, setOpened] = useState(false);
  const [filtered, setFiltered] = useState(false);
  const [selected, setSelected] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<SavedTask[]>(initialHistory);
  const [tab, setTab] = useState<'workspace' | 'history'>('workspace');
  const [settings, setSettings] = useState(false);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [message, setMessage] = useState('');
  const [listening, setListening] = useState(false);
  const [handPosition, setHandPosition] = useState({ x: 70, y: 145 });
  const [handPose, setHandPose] = useState<HandPose>('idle');
  const [activeTarget, setActiveTarget] = useState('');
  const controller = useRef<AbortController | null>(null);
  const paused = useRef(false);
  const workspace = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const prefsRef = useRef(prefs);
  const voiceRef = useRef<() => void>(() => {});
  const newTaskRef = useRef<() => void>(() => {});
  const isBusy = status === 'running' || status === 'paused';

  useEffect(() => {
    prefsRef.current = prefs;
    try { localStorage.setItem('things.preferences', JSON.stringify({motion: prefs.motion, sound: prefs.sound})); } catch { /* Session preferences still work. */ }
  }, [prefs]);
  useEffect(() => () => { controller.current?.abort(); recognition.current?.abort(); }, []);
  useEffect(() => window.thingsDesktop?.onVoiceShortcut(() => voiceRef.current()), []);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); newTaskRef.current(); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  useEffect(() => { if (!settings) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSettings(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [settings]);

  function listen() {
    if (listening) { recognition.current?.stop(); return; }
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) { setMessage('Voice input is unavailable in this browser. You can type your request below.'); input.current?.focus(); return; }
    const rec = new API();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = e => { let text = ''; for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript; setPrompt(text); };
    rec.onerror = e => { setListening(false); setMessage(e.error === 'not-allowed' ? 'Microphone access was declined. Type your request instead.' : `Voice input stopped (${e.error}). You can still type your request.`); };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    try { rec.start(); setListening(true); setMessage('Listening… Speak your request, then review it before sending.'); } catch { setListening(false); setMessage('Could not start the microphone. Try typing your request.'); }
  }
  voiceRef.current = listen;

  function chime() {
    if (!prefsRef.current.sound) return;
    try { const ctx = new AudioContext(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.connect(gain); gain.connect(ctx.destination); oscillator.frequency.setValueAtTime(640, ctx.currentTime); oscillator.frequency.setValueAtTime(850, ctx.currentTime + .12); gain.gain.setValueAtTime(.04, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .4); oscillator.start(); oscillator.stop(ctx.currentTime + .4); oscillator.onended = () => void ctx.close(); } catch { /* Audio is optional. */ }
  }

  async function startTask(value = prompt) {
    if (isBusy || !value.trim()) return;
    const next = createPlan(value);
    if (!next) { setMessage('This prototype can shortlist vegetarian dinners, organize sample tabs, or plan an afternoon. Choose a suggestion to try it.'); return; }
    const abort = new AbortController();
    controller.current = abort;
    paused.current = false;
    setPrompt(value); setPlan(next); setStatus('running'); setStep(-1); setOpened(false); setFiltered(false); setSelected(false); setSaved(false); setMessage(''); setTab('workspace'); setHandPose('think');
    const gate = async () => { while (paused.current && !abort.signal.aborted) await wait(100); return !abort.signal.aborted; };
    const delay = async (ms: number) => { for (let elapsed = 0; elapsed < ms; elapsed += 50) { if (!(await gate())) return false; await wait(50); } return !abort.signal.aborted; };
    if (!(await delay(800))) return;
    for (let i = 0; i < next.steps.length; i++) {
      if (!(await gate())) return;
      setStep(i); setHandPose('walk'); setActiveTarget(next.steps[i].target);
      const el = document.getElementById(next.steps[i].target);
      const container = workspace.current;
      if (!el || !container) { setStatus('cancelled'); setMessage('The workspace changed. Start the task again.'); setHandPose('idle'); return; }
      const rect = el.getBoundingClientRect(); const area = container.getBoundingClientRect();
      setHandPosition({ x: rect.left - area.left + rect.width / 2 - 52, y: rect.top - area.top + rect.height / 2 - 9 });
      if (!(await delay(prefsRef.current.motion ? 1100 : 250))) return;
      setHandPose('tap');
      if (!(await delay(300))) return;
      if (el instanceof HTMLButtonElement && el.disabled) { setStatus('cancelled'); setMessage('The next workspace action is unavailable. Please restart the task.'); setHandPose('idle'); setActiveTarget(''); return; }
      el.click();
      if (!(await delay(800))) return;
      setHandPose('think');
      if (!(await delay(400))) return;
    }
    setStep(next.steps.length); setStatus('done'); setHandPose('success'); setActiveTarget(''); chime();
  }

  function stopTask() { controller.current?.abort(); paused.current = false; setStatus('cancelled'); setHandPose('idle'); setActiveTarget(''); setMessage('Task stopped. Your workspace stays just as you left it.'); }
  function pauseTask() { paused.current = !paused.current; setStatus(paused.current ? 'paused' : 'running'); }
  function newTask() { controller.current?.abort(); recognition.current?.abort(); setStatus('idle'); setPlan(null); setPrompt(''); setStep(-1); setOpened(false); setFiltered(false); setSelected(false); setSaved(false); setMessage(''); setActiveTarget(''); setTab('workspace'); setHandPose('idle'); input.current?.focus(); }
  newTaskRef.current = () => { if (!isBusy && !settings) newTask(); };

  function saveTask() {
    if (!plan || saved) return;
    const entry: SavedTask = { id: crypto.randomUUID(), title: plan.title, scenario: plan.scenario, prompt, completedAt: new Date().toISOString() };
    const next = [entry, ...history].slice(0, 30);
    setHistory(next); setSaved(true);
    try { localStorage.setItem('things.history', JSON.stringify(next)); } catch { setMessage('Saved for this session. Browser storage is unavailable; download the result to keep it.'); }
  }
  function downloadResult() {
    if (!plan || !saved) return;
    const data = { project: 'THINGS', mode: 'Local interactive demo', task: prompt, result: plan.scenario === 'recipes' ? dinnerShortlist() : plan.scenario === 'tabs' ? tabGroups : schedule };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `things-${plan.scenario}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function toggleCompanion() {
    if (!window.thingsDesktop) { setMessage('The desktop companion is available in the Electron app. Run npm run desktop to try it.'); return; }
    try { const enabled = await window.thingsDesktop.setCompanion(!prefs.companion); setPrefs(p => ({...p, companion: enabled})); } catch { setMessage('The desktop companion could not be opened. Try again in the desktop app.'); }
  }

  if (overlay) return <div className="desktop-hand"><Hand pose="idle" /></div>;

  return <div className={`app ${!prefs.motion ? 'reduce-motion' : ''}`}>
    <aside className="sidebar">
      <a className="wordmark" href="#" onClick={e => {e.preventDefault(); if (!isBusy) newTask();}} aria-label="THINGS home"><span className="brand-glyph"><HandIcon size={21}/></span>things<span className="brand-period">.</span></a>
      <button className="new-task" onClick={newTask} disabled={isBusy}><Plus size={18}/> New thing <span>⌘ N</span></button>
      <nav aria-label="Main navigation">
        <button className={tab === 'workspace' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('workspace')}><Sparkles size={18}/> My workspace <ChevronRight size={15}/></button>
        <button className={tab === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('history')} disabled={isBusy}><History size={18}/> Things done <span className="count">{history.length}</span></button>
      </nav>
      <div className="sidebar-label">A LITTLE INSPIRATION</div>
      <div className="quick-tasks">{suggestions.map(s => <button key={s.scenario} disabled={isBusy} onClick={() => void startTask(s.prompt)}>{s.scenario === 'recipes' ? <Utensils size={16}/> : s.scenario === 'tabs' ? <Layers3 size={16}/> : <Sun size={16}/>} {s.title}</button>)}</div>
      <div className="sidebar-bottom">
        <div className="companion-note"><div className="mini-hand"><Hand pose={isBusy ? 'think' : 'idle'}/></div><div><strong>Your little accomplice.</strong><p>Ready when you are.</p></div><span className="online-dot"/></div>
        <button className="nav-item settings-trigger" onClick={() => setSettings(true)}><Settings2 size={18}/> Make it yours <MoreHorizontal size={18}/></button>
        <div className="build-label"><span>THINGS LAB</span><span>v0.1 · prototype</span></div>
      </div>
    </aside>

    <main>
      <header className="topbar"><span>YOUR PERSONAL LITTLE HELPER</span><div className="mode-badge"><span className="online-dot"/> Local demo <span className="badge-separator">/</span> No API key needed</div></header>
      {tab === 'workspace' ? <>
        <section className="intro"><div><div className="eyebrow"><span/> LESS BUSYWORK. MORE YOU.</div><h1>A little hand.<br/><span>A lot off your hands.</span></h1><p>Tell your Thing what needs doing.<br className="mobile-break"/> Let a little magic take it from there.</p></div><div className="hero-character"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="hero-spark spark-one">✧</span><span className="hero-spark spark-two">✧</span><Hand pose={isBusy ? 'think' : 'idle'}/><span className="character-tag"><span className="online-dot"/> A helping hand. With personality.</span></div></section>

        <section className={`composer ${listening ? 'listening' : ''}`} aria-label="Give your Thing a task">
          <form onSubmit={e => {e.preventDefault(); void startTask();}}>
            <label className="sr-only" htmlFor="task-prompt">What can I take off your hands?</label>
            <textarea id="task-prompt" ref={input} value={prompt} disabled={isBusy} onChange={e => setPrompt(e.target.value)} placeholder="What can I take off your hands?" rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); void startTask();} }}/>
            <div className="composer-bottom"><button type="button" className={`voice-button ${listening ? 'recording' : ''}`} onClick={listen} disabled={isBusy} aria-label={listening ? 'Stop listening' : 'Use voice input'}><Mic size={17}/><span>{listening ? 'Listening…' : 'Say it out loud'}</span></button><div className="composer-right"><span className="enter-hint">↵ to send</span><button className="send-button" type="submit" disabled={isBusy || !prompt.trim()}>Give it a Thing <ArrowRight size={17}/></button></div></div>
          </form>
        </section>
        {message && <p className="notice" role="status">{message}<button aria-label="Dismiss message" onClick={() => setMessage('')}><X size={14}/></button></p>}

        {!plan ? <section className="suggestions"><div className="section-heading"><h2>Small things. Big relief.</h2><span>TRY SOMETHING</span></div><div className="suggestion-grid">{suggestions.map(s => <button className="suggestion-card" key={s.scenario} onClick={() => void startTask(s.prompt)}><span className={`suggestion-icon ${s.scenario}`}>{s.scenario === 'recipes' ? <Utensils size={21}/> : s.scenario === 'tabs' ? <Layers3 size={21}/> : <Sun size={21}/>}</span><ArrowUpRight size={17} className="card-arrow"/><h3>{s.title}</h3><p>{s.detail}</p></button>)}</div><div className="demo-footnote"><Command size={14}/><span>Interactive sample workspaces · Your real apps stay untouched</span></div></section> :
        <section className="task-section" aria-label="Task progress"><div className="section-heading"><h2>{status === 'done' ? 'Another thing, done.' : status === 'paused' ? 'Taking a little breather.' : status === 'cancelled' ? 'Right where you left it.' : 'A little hand at work.'}</h2><div className="task-controls">{isBusy && <><button aria-label={status === 'paused' ? 'Resume task' : 'Pause task'} onClick={pauseTask}>{status === 'paused' ? <Play size={15}/> : <Pause size={15}/>}</button><button aria-label="Stop task" onClick={stopTask}><Square size={13}/></button></>}{!isBusy && <button onClick={() => void startTask(prompt)} aria-label="Replay task"><RotateCcw size={15}/></button>}</div></div>
          <div className="task-layout"><div className="progress-panel"><div className="task-type"><span className={`status-dot ${status}`}/>{status === 'done' ? 'NICELY DONE' : status === 'paused' ? 'PAUSED' : status === 'cancelled' ? 'STOPPED' : 'WORKING ON IT'}</div><h3>{plan.title}</h3><ol className="steps">{plan.steps.map((s, i) => <li key={s.label} className={i < step || status === 'done' ? 'complete' : i === step ? 'current' : ''}><span className="step-number">{i < step || status === 'done' ? <Check size={12}/> : i + 1}</span><span>{s.label}</span></li>)}</ol><p className="workspace-disclosure">A real interaction with sample data in this workspace. AI and external app control are not connected yet.</p>{saved && <button className="download-button" onClick={downloadResult}><ArrowDownToLine size={15}/> Download result</button>}</div>
          <div className="workspace" ref={workspace}><div className="workspace-toolbar"><div className="window-dots"><i/><i/><i/></div><span>{plan.scenario === 'recipes' ? 'The little recipe book' : plan.scenario === 'tabs' ? 'A place for every tab' : 'An afternoon, thoughtfully'}<span className="sample-tag">SAMPLE</span></span><MoreHorizontal size={15}/></div>
            <div className="workspace-body"><div className="workspace-title"><div><span className="eyebrow">{plan.scenario === 'recipes' ? 'SOMETHING GOOD FOR TONIGHT' : plan.scenario === 'tabs' ? 'CLEAR TABS, CLEAR HEAD' : 'A LITTLE SPACE TO THINK'}</span><h3>{plan.scenario === 'recipes' ? 'Dinner, sorted.' : plan.scenario === 'tabs' ? 'Find your flow.' : 'Your afternoon.'}</h3></div><button id="workspace-open" className={`workspace-button ${opened ? 'checked' : ''} ${activeTarget === 'workspace-open' ? 'targeted' : ''}`} onClick={() => setOpened(true)}>{opened ? <Check size={13}/> : <Plus size={13}/>} {opened ? 'Opened' : 'Open'}</button></div>
            <div className="workspace-actions"><button id="workspace-filter" disabled={!opened} className={`filter-button ${filtered ? 'selected' : ''} ${activeTarget === 'workspace-filter' ? 'targeted' : ''}`} onClick={() => setFiltered(true)}>{plan.scenario === 'recipes' ? 'Vegetarian · Under 30 min' : plan.scenario === 'tabs' ? 'Group by purpose' : 'Focus + breaks'}{filtered && <Check size={12}/>}</button><button id="workspace-select" disabled={!filtered} className={`text-button ${activeTarget === 'workspace-select' ? 'targeted' : ''}`} onClick={() => setSelected(true)}>{selected ? 'Selected ✓' : plan.scenario === 'recipes' ? 'Pick three' : 'Select all'}</button></div>
            {!opened ? <div className="workspace-empty"><Layers3 size={28}/><p>A little possibility,<br/>waiting to be opened.</p></div> : plan.scenario === 'recipes' ? <div className="recipe-list">{(filtered ? dinnerShortlist() : recipes).map(r => <div className={`recipe-row ${selected ? 'picked' : ''}`} key={r.id}><span className={`recipe-art ${r.color}`}>{r.emoji}</span><div><strong>{r.name}</strong><p>{r.note}</p><span className="recipe-time"><Clock3 size={10}/>{r.time} min{r.vegetarian ? ' · Vegetarian' : ' · Fish'}</span></div>{selected && <span className="picked-check"><Check size={12}/></span>}</div>)}</div> : plan.scenario === 'tabs' ? <div className="tab-collection">{(filtered ? tabGroups : [{name: 'Unsorted', tabs: tabGroups.flatMap(g => g.tabs)}]).map(g => <div className={`tab-group ${selected ? 'picked' : ''}`} key={g.name}><span>{g.name}</span>{g.tabs.map(t => <div key={t}><span className="tab-favicon">{t[0]}</span>{t}{selected && <Check size={12}/>}</div>)}</div>)}</div> : <div className="schedule">{(filtered ? schedule : [{time: '14:00 – 17:00', name: 'An open afternoon', type: 'Open time'}]).map(s => <div className={selected ? 'picked' : ''} key={s.time}><span>{s.time}</span><div><strong>{s.name}</strong><small>{s.type}</small></div>{selected && <Check size={12}/>}</div>)}</div>}
            <div className="workspace-footer"><span>{saved ? 'Saved to Things done' : selected ? 'Looking good. Ready to keep.' : 'One little step at a time.'}</span><button id="workspace-save" disabled={!selected || saved} className={`workspace-save ${activeTarget === 'workspace-save' ? 'targeted' : ''}`} onClick={saveTask}>{saved ? <Check size={13}/> : <Plus size={13}/>} {saved ? 'Saved' : 'Save collection'}</button></div></div>
            <div className={`agent-cursor ${status === 'paused' ? 'frozen' : ''}`} style={{left: handPosition.x, top: handPosition.y}}><Hand pose={status === 'paused' ? 'idle' : handPose}/><span className="cursor-label">{status === 'done' ? 'All yours ✧' : status === 'paused' ? 'Taking five' : 'Thing 01'}</span></div>
          </div></div>
        </section>}
      </> : <section className="history-section"><div className="eyebrow">A LITTLE PROGRESS ADDS UP</div><h1>Things, done.</h1><p className="history-intro">A home for everything your little hand has helped with.</p>{history.length === 0 ? <div className="history-empty"><Hand pose="idle"/><h2>A clean slate.</h2><p>Your completed things will be right here.</p><button className="send-button" onClick={() => setTab('workspace')}>Give it a first thing <ArrowRight size={16}/></button></div> : <div className="history-list">{history.map(h => <div className="history-row" key={h.id}><span className="history-check"><Check size={18}/></span><div><strong>{h.title}</strong><p>{h.prompt}</p></div><time dateTime={h.completedAt}>{new Date(h.completedAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</time><button aria-label={`Run again: ${h.title}`} onClick={() => void startTask(h.prompt)}><RotateCcw size={16}/></button></div>)}</div>}</section>}
      <footer className="main-footer"><span>A little strange. A lot of help.</span><span>MADE TO LEND A HAND <span className="footer-star">✧</span></span></footer>
    </main>

    {settings && <div className="modal-backdrop" onClick={() => setSettings(false)}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={e => e.stopPropagation()}><button className="close-modal" aria-label="Close settings" onClick={() => setSettings(false)} autoFocus><X size={20}/></button><div className="eyebrow">A HAND THAT FEELS LIKE YOURS</div><h2 id="settings-title">The little details.</h2><p>Just enough personality. Just the way you like it.</p><Toggle icon={<Sparkles size={19}/>} title="Character motion" description="Crawling, tapping, and a little celebration." enabled={prefs.motion} onClick={() => setPrefs(p => ({...p, motion: !p.motion}))}/><Toggle icon={<Volume2 size={19}/>} title="A little sound" description="A soft chime when a thing is done." enabled={prefs.sound} onClick={() => setPrefs(p => ({...p, sound: !p.sound}))}/><Toggle icon={<HandIcon size={19}/>} title="Desktop companion" description={window.thingsDesktop ? 'Let Thing follow your cursor. Clicks pass through.' : 'Available in the Electron desktop app.'} enabled={prefs.companion} onClick={() => void toggleCompanion()}/><div className="settings-note"><strong>Honest little prototype.</strong><p>Tasks run on local sample data. Voice support depends on your browser and may use its speech service. No external computer-use agent is connected.</p></div>{message && <p className="notice" role="status">{message}</p>}</section></div>}
  </div>;
}

function Toggle({icon, title, description, enabled, onClick}: {icon: React.ReactNode; title:string; description:string; enabled:boolean; onClick:() => void}) { return <div className="preference"><span>{icon}</span><div><strong>{title}</strong><p>{description}</p></div><button className={`toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label={title} onClick={onClick}><span/></button></div>; }
const tabGroups = [ {name: 'Research', tabs: ['Gesture interaction notes', 'Agent architecture guide']}, {name: 'Inspiration', tabs: ['Minimal interface collection', 'Character motion studies']}, {name: 'Tools', tabs: ['Project repository', 'Hackathon checklist']} ];
const schedule = [ {time: '14:00 – 14:50', name: 'Make the important thing', type: 'Focus · 50 min'}, {time: '14:50 – 15:00', name: 'Stretch. Water. Breathe.', type: 'Break · 10 min'}, {time: '15:00 – 15:50', name: 'Keep the momentum', type: 'Focus · 50 min'}, {time: '15:50 – 16:00', name: 'A little fresh air', type: 'Break · 10 min'}, {time: '16:00 – 17:00', name: 'Review, refine, wrap up', type: 'Focus · 60 min'} ];
