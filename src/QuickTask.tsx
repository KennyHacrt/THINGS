import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Mic, X } from 'lucide-react';
import { Hand } from './Hand';
import {useVoice} from './voice';

export function QuickTask() {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const voice=useVoice(text=>{setPrompt(text);void submit(text);},setError);
  const started=useRef(false);
  useEffect(()=>{const timer=setTimeout(()=>{if(!started.current){started.current=true;void voice.start();}},350);return()=>clearTimeout(timer);},[]);
  useEffect(() => { input.current?.focus(); const onKey = (e: KeyboardEvent) => { if(e.key === 'Escape') window.thingsDesktop?.closeQuick(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  async function submit(value = prompt) {
    if (!value.trim() || pending) return;
    setPending(true); setError('');
    try { const accepted = await window.thingsDesktop?.submitQuickTask(value.trim()); if (!accepted) setError('A thing is already running. Finish or stop it first.'); }
    catch { setError('Could not reach your workspace. Please open THINGS again.'); }
    finally {setPending(false);}
  }
  return <main className="quick-window">
    <button className="quick-close" aria-label="Close quick task" onClick={() => window.thingsDesktop?.closeQuick()}><X size={18}/></button>
    <div className="quick-heading"><Hand pose="idle"/><div><div className="eyebrow">YOUR LITTLE HELPING HAND</div><h1>Got a little thing?</h1><p>Just speak. I’ll get started when you finish.</p></div></div>
    <button className={`quick-mic ${voice.state==='listening'?'recording':''}`} disabled={pending||voice.state==='transcribing'} onClick={()=>void voice.start()} aria-label="Speak a task"><Mic size={22}/><span>{voice.state==='listening'?'Listening… pause to send':voice.state==='transcribing'?'Understanding your voice…':'Speak another thing'}</span>{voice.state==='listening'&&<i className="voice-bars"><b/><b/><b/><b/><b/></i>}</button>
    <form onSubmit={e => {e.preventDefault(); void submit();}}><label className="sr-only" htmlFor="quick-prompt">Your task</label><input id="quick-prompt" ref={input} autoFocus value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="What can I take off your hands?" maxLength={2000}/><button type="submit" aria-label="Send task to workspace" disabled={pending || !prompt.trim()}><ArrowRight size={20}/></button></form>
    <div className="quick-suggestions">{[{title:'Read a real page',prompt:'Open https://example.com and tell me its heading and purpose.'},{title:'Write a little note',prompt:'Open a fresh Notepad and write: Meet THINGS. A little hand, a lot off your hands.'}].map(s => <button disabled={pending} key={s.title} onClick={() => void submit(s.prompt)}>{s.title}</button>)}</div>
    {error ? <p className="quick-status" role="status">{error}</p> : <p className="quick-status">Poe + real tools · Ctrl / ⌘ + Shift + Space to summon · Esc to close</p>}
  </main>;
}
