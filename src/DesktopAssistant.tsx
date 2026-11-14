import {useEffect,useRef,useState} from 'react';
import {Mic,MicOff,Minus,Pause,Play,Settings2,Square} from 'lucide-react';
import {Hand} from './Hand';
import {useVoice} from './voice';
import type {AgentEvent} from './desktop';
type Message={role:'user'|'assistant';text:string};
export function DesktopAssistant(){
  const [enabled,setEnabled]=useState(false),[speaking,setSpeaking]=useState(false),[busy,setBusy]=useState(false),[paused,setPaused]=useState(false),[status,setStatus]=useState('Your little helping hand'),[messages,setMessages]=useState<Message[]>([]),[approval,setApproval]=useState<AgentEvent|null>(null);
  const speechGate=useRef(false),speechSequence=useRef(0),speechTail=useRef<ReturnType<typeof setTimeout>|null>(null);
  const enabledRef=useRef(false),end=useRef<HTMLDivElement>(null);
  function say(text:string){
    const plain=text.replace(/https?:\/\/\S+/g,'').replace(/[#*_`]/g,'').replace(/\s+/g,' ').trim();
    const short=plain.length>260?plain.slice(0,260).replace(/\s\S*$/,'')+'.':plain;
    if(!short)return;const sequence=++speechSequence.current;if(speechTail.current)clearTimeout(speechTail.current);speechGate.current=true;voice.suspend();window.speechSynthesis.cancel();setSpeaking(true);
    const utterance=new SpeechSynthesisUtterance(short);utterance.rate=1.08;utterance.lang=/[\u3400-\u9fff]/.test(short)?'zh-HK':'en-US';
    const ended=()=>{if(sequence!==speechSequence.current)return;speechTail.current=setTimeout(()=>{if(sequence===speechSequence.current){speechGate.current=false;setSpeaking(false);}},700);};
    utterance.onend=utterance.onerror=ended;window.speechSynthesis.speak(utterance);
  }
  const voice=useVoice(text=>{if(speechGate.current)return;window.speechSynthesis.cancel();setSpeaking(false);setStatus('Heard you');void window.thingsDesktop?.deskSpeak(text).catch(e=>{setMessages(m=>[...m,{role:'assistant',text:e.message}]);});},text=>{if(!/No speech detected/i.test(text)){setStatus(text);if(/microphone|permission|device|access/i.test(text)){enabledRef.current=false;setEnabled(false);}}},{keepStream:true});
  useEffect(()=>window.thingsDesktop?.onDeskEvent(event=>{
    if(event.type==='listen'){void toggle();return;}
    if(event.type==='chat'){setMessages(m=>[...m,{role:event.role as Message['role'],text:String(event.text)}].slice(-24));if(event.speak)say(String(event.text));return;}
    if(event.type==='started'){setBusy(true);setPaused(false);setStatus('On it. You can keep talking.');}
    if(event.type==='thinking')setStatus(`Planning next action… (${event.turn||1})`);
    if(event.type==='action')setStatus(String(event.args?.reason||event.action?.replace(/_/g,' ')||'Working…'));
    if(event.type==='paused'){setPaused(true);setStatus('Paused. Say “resume” when you’re ready.');}
    if(event.type==='conflict'){setPaused(true);setStatus(event.error||'Paused to avoid competing with you.');setMessages(m=>[...m,{role:'assistant',text:event.error||'Input conflict. Say resume when ready.'}]);}
    if(event.type==='resumed'){setPaused(false);setStatus('Back to work.');}
    if(event.type==='approval-request'){setApproval(event);setStatus('One step needs your approval.');}
    if(event.type==='approval-resolved')setApproval(null);
    if(['completed','failed','stopped'].includes(event.type)){setBusy(false);setApproval(null);setStatus(event.type==='completed'?'Done. What’s next?':event.type==='stopped'?'Stopped. I’m here.':'Something needs a hand.');}
  }),[]);
  useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'});},[messages,voice.draft]);
  useEffect(()=>{if(enabled&&!speaking&&!speechGate.current&&voice.state==='idle'){const timer=setTimeout(()=>{if(enabledRef.current&&!speechGate.current)void voice.start();},350);return()=>clearTimeout(timer);}},[enabled,speaking,voice.state]);
  useEffect(()=>()=>{speechSequence.current++;if(speechTail.current)clearTimeout(speechTail.current);window.speechSynthesis.cancel();},[]);
  async function toggle(){if(enabled){enabledRef.current=false;setEnabled(false);voice.cancel();speechSequence.current++;if(speechTail.current)clearTimeout(speechTail.current);speechGate.current=false;window.speechSynthesis.cancel();setSpeaking(false);return;}try{await window.thingsDesktop!.deskEnable();enabledRef.current=true;setEnabled(true);setStatus('Listening. Tell me what you need.');}catch(e){setStatus((e as Error).message);}}
  return <main className="desktop-assistant">
    <header className="desk-header"><div className="desk-brand"><Hand pose={busy?'think':'idle'}/><div><strong>things.</strong><span><i className={enabled?'active':''}/>{busy?'Working with you':enabled?'Here with you':'Your desktop companion'}</span></div></div><div className="desk-tools"><button aria-label="Open settings and history" onClick={()=>window.thingsDesktop?.deskSettings()}><Settings2 size={16}/></button><button aria-label="Hide assistant" onClick={()=>window.thingsDesktop?.deskHide()}><Minus size={17}/></button></div></header>
    <div className="desk-conversation" aria-live="polite">{!messages.length&&<div className="desk-welcome"><h1>What’s the thing?</h1><p>Tell me naturally. I’ll work right here on your desktop.</p><span>“Compare flights to Tokyo…”<br/>“Find lunch on Keeta.”</span></div>}{messages.map((m,i)=><div key={i} className={`desk-bubble ${m.role}`}><small>{m.role==='user'?'YOU SAID':'THINGS'}</small><p>{m.text.split(/(https?:\/\/[^\s)<>]+)/g).map((p,j)=>/^https?:\/\//.test(p)?<a key={j} href={p} target="_blank" rel="noreferrer">{p}</a>:p)}</p></div>)}{voice.state!=='idle'&&<div className="desk-bubble user interim"><small>YOU’RE SAYING</small><p>{voice.draft||'Listening…'}<span className="live-caret"/></p></div>}<div ref={end}/></div>
    {approval&&<div className="desk-approval"><p>{String((approval.preview as {reason?:string})?.reason||'Review the pending commitment.')}</p><button onClick={()=>void window.thingsDesktop?.agentApprove(approval.approvalId!,false)}>Decline</button><button onClick={()=>void window.thingsDesktop?.agentApprove(approval.approvalId!,true)}>Approve this step</button></div>}
    <footer className="desk-footer"><div className="desk-status"><i className={busy?'pulse':''}/><span>{voice.state==='transcribing'?'Understanding what you said…':speaking?'THINGS is speaking…':voice.state==='listening'?(busy?status:'Listening… just speak.'):status}</span></div><div className="desk-controls"><button className={`desk-mic ${enabled?'on':''}`} onClick={()=>void toggle()} aria-label={enabled?'Mute conversation':'Start voice conversation'}>{enabled?<Mic size={19}/>:<MicOff size={19}/>}<span>{enabled?'Voice is on':'Start conversation'}</span>{voice.state==='listening'&&<i className="voice-bars">{[.6,1,.8,1,.5].map((v,i)=><b key={i} style={{height:3+voice.level*v*20,animation:'none'}}/>)}</i>}</button>{busy&&<><button aria-label={paused?'Resume work':'Pause work'} onClick={()=>void window.thingsDesktop?.agentControl('pause')}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button aria-label="Stop work" onClick={()=>void window.thingsDesktop?.agentControl('stop')}><Square size={15}/></button></>}</div>{!enabled&&<p className="desk-consent">Starting allows microphone capture and sends task text / task-window screenshots to Poe. Voice audio stays local.</p>}</footer>
  </main>;
}
