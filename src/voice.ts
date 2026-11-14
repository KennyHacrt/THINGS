import {useEffect,useRef,useState} from 'react';

export function wavBase64(chunks:Float32Array[],rate:number):string {
  const size=chunks.reduce((n,c)=>n+c.length,0), joined=new Float32Array(size);let at=0;
  for(const chunk of chunks){joined.set(chunk,at);at+=chunk.length;}
  const count=Math.floor(size*16000/rate),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
  const write=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
  write(0,'RIFF');view.setUint32(4,36+count*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,count*2,true);
  for(let i=0;i<count;i++){const p=i*rate/16000,a=Math.floor(p),fraction=p-a;const sample=joined[a]*(1-fraction)+(joined[Math.min(a+1,size-1)]||0)*fraction;view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,sample))*32767),true);}
  const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
}

export function useVoice(onTranscript:(text:string)=>void,onError:(text:string)=>void,options:{keepStream?:boolean}={}){
  const [draft,setDraft]=useState(''),[level,setLevel]=useState(0);
  const [state,setState]=useState<'idle'|'listening'|'transcribing'>('idle');const callback=useRef(onTranscript),error=useRef(onError);callback.current=onTranscript;error.current=onError;
  const streamRef=useRef<MediaStream|null>(null);
  const session=useRef<{finish:(cancel?:boolean,keep?:boolean)=>void}|null>(null);const mounted=useRef(true);const generation=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;session.current?.finish(true);streamRef.current?.getTracks().forEach(t=>t.stop());};},[]);
  async function start(){
    if(session.current){session.current.finish();return;}if(state==='transcribing')return;
    const id=++generation.current;setDraft('');setState('listening');
    try{
      const stream=streamRef.current?.active?streamRef.current:await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});streamRef.current=stream;
      if(!mounted.current||id!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}
      const context=new AudioContext();await context.resume();const source=context.createMediaStreamSource(stream),processor=context.createScriptProcessor(4096,1,1),gain=context.createGain();gain.gain.value=0;
      const chunks:Float32Array[]=[];let elapsed=0,lastSpeech=0,heard=false,finished=false,lastPartial=0,partialPending=false;
      const finish=async(cancel=false,keep=false)=>{
        if(finished)return;finished=true;setLevel(0);clearTimeout(timer);processor.disconnect();source.disconnect();gain.disconnect();if(!options.keepStream||(cancel&&!keep)){stream.getTracks().forEach(t=>t.stop());streamRef.current=null;}void context.close();session.current=null;
        if(cancel||!mounted.current||id!==generation.current){if(mounted.current)setState('idle');return;}
        if(!heard){setState('idle');error.current('No speech detected. Tap the microphone and try again.');return;}
        setState('transcribing');
        try{if(!window.thingsDesktop)throw new Error('Local voice recognition runs in the THINGS desktop app.');const result=await window.thingsDesktop.transcribeVoice(wavBase64(chunks,context.sampleRate));if(mounted.current&&id===generation.current){setDraft('');setState('idle');callback.current(result.text);}}
        catch(e){if(mounted.current&&id===generation.current){setState('idle');error.current((e as Error).message);}}
      };
      const timer=setTimeout(()=>void finish(),30000);session.current={finish};
      processor.onaudioprocess=event=>{const samples=event.inputBuffer.getChannelData(0);chunks.push(new Float32Array(samples));elapsed+=samples.length/context.sampleRate;let sum=0;for(const v of samples)sum+=v*v;const rms=Math.sqrt(sum/samples.length);setLevel(Math.min(1,rms*15));if(rms>0.012){heard=true;lastSpeech=elapsed;}if(heard&&elapsed>1.3&&elapsed-lastPartial>1.5&&!partialPending&&window.thingsDesktop){lastPartial=elapsed;partialPending=true;void window.thingsDesktop.transcribeVoice(wavBase64(chunks,context.sampleRate),true).then(result=>{if(mounted.current&&id===generation.current&&!finished)setDraft(result.text);}).catch(()=>{}).finally(()=>{partialPending=false;});}if((heard&&elapsed-lastSpeech>1.6)||(!heard&&elapsed>9))void finish();};
      source.connect(processor);processor.connect(gain);gain.connect(context.destination);
    }catch(e){if(mounted.current&&id===generation.current){setState('idle');error.current((e as Error).name==='NotAllowedError'?'Microphone access is needed to speak a task. Enable it and try again.':`Could not start microphone: ${(e as Error).message}`);}}
  }
  function cancel(){generation.current++;session.current?.finish(true);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setState('idle');}
  function suspend(){generation.current++;session.current?.finish(true,true);setState('idle');}
  return {state,draft,level,start,cancel,suspend};
}
