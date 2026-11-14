import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {ArrowDownToLine,Check,Pause,Play,Square} from 'lucide-react';
import {Hand} from './Hand';
import type {AgentEvent,VisionFrame} from './desktop';
import {downloadFile} from './results';
export type LiveAgentHandle={run:(prompt:string)=>Promise<void>};
type RecordEntry={prompt:string;result:string;date:string};
function initialHistory():RecordEntry[]{try{const parsed:unknown=JSON.parse(localStorage.getItem('things.live-history')||'[]');return Array.isArray(parsed)?parsed.filter(v=>v&&typeof v.prompt==='string'&&typeof v.result==='string'&&typeof v.date==='string').slice(0,30):[];}catch{return [];}}
export const LiveAgent=forwardRef<LiveAgentHandle,{onBusy:(busy:boolean)=>void}>(({onBusy},ref)=>{
  const [mode,setMode]=useState<'browser'|'desktop'|'both'>('both');const [windows,setWindows]=useState<{handle:number;title:string;app:string}[]>([]);const [target,setTarget]=useState('');
  const [share,setShare]=useState(false);const [events,setEvents]=useState<AgentEvent[]>([]);const [status,setStatus]=useState('idle');const [error,setError]=useState('');const [result,setResult]=useState('');const [history,setHistory]=useState(initialHistory);
  const [approval,setApproval]=useState<AgentEvent|null>(null);const [submitting,setSubmitting]=useState(false);const taskPrompt=useRef('');const busy=status==='running'||status==='paused';
  const [frame,setFrame]=useState<VisionFrame|null>(null);
  useEffect(()=>{onBusy(busy);},[busy,onBusy]);
  useEffect(()=>window.thingsDesktop?.onAgentEvent(event=>{
    if(event.type==='started'){setEvents([event]);setFrame(null);setResult('');setError('');setStatus('running');taskPrompt.current=event.prompt||taskPrompt.current;return;}
    if(event.type==='frame'){setFrame(event.frame||null);return;}
    if(event.type==='usage')return;
    if(event.type==='approval-request'){setApproval(event);return;}
    if(event.type==='approval-resolved'){setApproval(null);return;}
    setEvents(e=>[...e,event].slice(-150));
    if(event.type==='paused')setStatus('paused');if(event.type==='resumed')setStatus('running');
    if(event.type==='completed'){
      const output=typeof event.result==='string'?event.result:'Task completed.';setResult(output);setStatus('done');
      setHistory(previous=>{const next=[{prompt:taskPrompt.current,result:output,date:new Date().toISOString()},...previous].slice(0,30);try{localStorage.setItem('things.live-history',JSON.stringify(next));}catch{}return next;});
    }
    if(event.type==='failed'||event.type==='stopped'){setStatus(event.type);setError(event.error||'Task stopped.');setApproval(null);}
  }),[]);
  useImperativeHandle(ref,()=>({run:async(prompt)=>{
    if(busy||submitting)return;
    if(!window.thingsDesktop){setError('Real AI tasks require the Electron desktop app.');return;}
    if(!share){setError('Allow task context sharing with Poe before starting.');return;}
    setSubmitting(true);setError('');taskPrompt.current=prompt;
    try{await window.thingsDesktop.agentStart({prompt,mode,handle:target?Number(target):null,shareContext:share});}catch(e){setError(String((e as Error).message));}finally{setSubmitting(false);}
  }}),[busy,submitting,share,mode,target]);
  async function refresh(){try{setWindows(await window.thingsDesktop!.desktopWindows());setError('');}catch(e){setError(String((e as Error).message));}}
  async function control(action:'pause'|'stop'){try{await window.thingsDesktop!.agentControl(action);}catch(e){setError(String((e as Error).message));}}
  async function decide(allow:boolean){if(!approval?.approvalId)return;try{await window.thingsDesktop!.agentApprove(approval.approvalId,allow);}catch(e){setError(String((e as Error).message));}}
  const current=events.filter(e=>e.type==='action').at(-1);
  return <section className="live-agent" aria-label="Real AI tasks"><div className="section-heading"><h2>{busy?'Your little hand, in the real world.':'Let’s do a real thing.'}</h2><div className="task-controls">{busy&&<><button aria-label={status==='paused'?'Resume AI task':'Pause AI task'} onClick={()=>void control('pause')}>{status==='paused'?<Play size={15}/>:<Pause size={15}/>}</button><button aria-label="Stop AI task" onClick={()=>void control('stop')}><Square size={14}/></button></>}</div></div>
    <div className="live-options"><div className="mode-segment" aria-label="Task scope">{(['browser','desktop','both'] as const).map(m=><button key={m} disabled={busy} className={mode===m?'selected':''} onClick={()=>setMode(m)}>{m==='both'?'Both':m==='browser'?'Browser':'Desktop'}</button>)}</div>{mode!=='browser'&&<div className="desktop-target"><select aria-label="Desktop target" disabled={busy} value={target} onChange={e=>setTarget(e.target.value)}><option value="">New Notepad / Calculator only</option>{windows.map(w=><option key={w.handle} value={w.handle}>{w.title} · {w.app}</option>)}</select><button disabled={busy||!window.thingsDesktop} onClick={()=>void refresh()}>Choose window</button></div>}</div>
    <label className="context-consent"><input type="checkbox" checked={share} disabled={busy} onChange={e=>setShare(e.target.checked)}/><span>Allow screenshots of this task’s browser / selected app to be sent to Poe. Routine actions run automatically; final commitments ask for confirmation.</span></label>
    {error&&<p className="notice" role="status">{error}</p>}
    {events.length>0&&<div className="live-progress"><div className="live-character"><Hand pose={busy?(status==='paused'||approval?'idle':current?'tap':'think'):status==='done'?'success':'idle'}/><span>{status==='paused'?'Taking five':approval?'Your say':busy?'Working on it':status==='done'?'All yours':'Ready when you are'}</span></div><div className="agent-log" aria-live="polite">{events.filter(e=>['action','observation','paused','resumed','failed','completed','stopped'].includes(e.type)).map((e,i)=><div key={i} className={`log-row log-${e.type}`}><span>{e.type==='observation'?<Check size={13}/>:e.type==='action'?'→':'·'}</span><div><strong>{e.type==='action'?(e.action==='computer'?String(e.args?.reason||e.args?.action||'Computer action'):e.action?.replace(/_/g,' ')):e.type==='observation'?'Observed result':e.type}</strong>{e.type==='action'&&<p>{actionDetail(e)}</p>}{e.type==='observation'&&<p>{summarize(e.result)}</p>}{e.error&&<p>{e.error}</p>}</div></div>)}</div></div>}
    {frame&&<figure className="vision-frame"><img src={frame.image} alt={`Thing’s latest view of ${frame.title||frame.target}`}/><figcaption><span>THING’S VIEW</span>{frame.title||frame.target}{frame.url&&<a href={frame.url} target="_blank" rel="noreferrer">Source</a>}</figcaption></figure>}
    {approval&&<div className="action-approval" role="alertdialog" aria-labelledby="approval-title"><h3 id="approval-title">A little permission.</h3><p>This step may create a commitment or change your data. Review it before continuing.</p><pre>{JSON.stringify(approval.preview,null,2)}</pre><div><button onClick={()=>void decide(false)}>Decline & stop</button><button className="approve-action" onClick={()=>void decide(true)}>Allow this action</button></div></div>}
    {result&&<div className="live-result"><div className="section-heading"><h3>Another thing, done.</h3><button className="download-button" onClick={()=>downloadFile(result,'things-result.md','text/markdown;charset=utf-8')}><ArrowDownToLine size={14}/>Save result</button></div><div className="result-text">{result}</div></div>}
    {!events.length&&<div className="live-empty"><span className="online-dot"/>Tell THINGS a task. It looks at the screen, takes an action, then looks again. Try “Find three papers about retrieval-augmented generation and give me their source links.”</div>}
    {history.length>0&&!busy&&<details className="live-history"><summary>Real things done · {history.length}</summary>{history.map((h,i)=><div key={i}><strong>{h.prompt}</strong><p>{h.result}</p></div>)}</details>}
  </section>;
});
function summarize(value:unknown){if(!value||typeof value!=='object')return String(value).slice(0,250);const data=value as Record<string,unknown>;return String(data.error||data.title||data.url||(Array.isArray(data.elements)?`${data.elements.length} elements inspected`:data.executed?'Action executed — inspecting next.':'Observed')).slice(0,300);}

function actionDetail(event:AgentEvent){const a=event.args||{};return String(a.url||a.query||a.text||a.key||(Number.isFinite(a.x)?`Click at ${a.x}, ${a.y}`:a.app||'')).slice(0,350);}
