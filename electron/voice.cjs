const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const readline=require('node:readline');
class VoiceTools {
  constructor(){this.worker=null;this.pending=new Map();this.serial=0;}
  transcribe(audio,partial=false){
    if(this.pending.size>3)return Promise.reject(new Error('Voice recognition is busy.'));
    if(typeof audio!=='string'||audio.length>2000000||!audio.startsWith('UklGR'))return Promise.reject(new Error('Invalid voice recording.'));
    const python=path.join(__dirname,'..','.desktop-env','Scripts','python.exe');
    if(!fs.existsSync(python))return Promise.reject(new Error('Run npm run desktop:setup to install local voice recognition.'));
    if(!this.worker){
      const worker=spawn(python,['-u',path.join(__dirname,'voice_worker.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});this.worker=worker;
      readline.createInterface({input:worker.stdout}).on('line',line=>{try{const value=JSON.parse(line);const p=this.pending.get(value.id);if(p){this.pending.delete(value.id);clearTimeout(p.timer);value.error?p.reject(new Error(value.error)):p.resolve(value.result);}}catch{}});
      worker.stderr.on('data',()=>{});
      const failed=()=>{if(this.worker===worker)this.close();};worker.on('error',failed);worker.on('exit',failed);
    }
    return new Promise((resolve,reject)=>{const id=++this.serial;const timer=setTimeout(()=>this.close(),180000);this.pending.set(id,{resolve,reject,timer});this.worker.stdin.write(JSON.stringify({id,audio,partial})+'\n');});
  }
  close(){const worker=this.worker;this.worker=null;worker?.kill();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Voice transcription stopped.'));}this.pending.clear();}
}
module.exports={VoiceTools};
