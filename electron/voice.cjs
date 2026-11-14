const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const readline=require('node:readline');
class VoiceTools {
  constructor(){this.worker=null;this.pending=null;this.serial=0;}
  transcribe(audio){
    if(this.pending)return Promise.reject(new Error('A voice request is already being transcribed.'));
    if(typeof audio!=='string'||audio.length>2000000||!audio.startsWith('UklGR'))return Promise.reject(new Error('Invalid voice recording.'));
    const python=path.join(__dirname,'..','.desktop-env','Scripts','python.exe');
    if(!fs.existsSync(python))return Promise.reject(new Error('Run npm run desktop:setup to install local voice recognition.'));
    if(!this.worker){
      const worker=spawn(python,['-u',path.join(__dirname,'voice_worker.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});this.worker=worker;
      readline.createInterface({input:worker.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(this.pending?.id===value.id){const p=this.pending;this.pending=null;clearTimeout(p.timer);value.error?p.reject(new Error(value.error)):p.resolve(value.result);}}catch{}});
      worker.stderr.on('data',()=>{});
      const failed=()=>{if(this.worker===worker)this.close();};worker.on('error',failed);worker.on('exit',failed);
    }
    return new Promise((resolve,reject)=>{const id=++this.serial;const timer=setTimeout(()=>this.close(),180000);this.pending={id,resolve,reject,timer};this.worker.stdin.write(JSON.stringify({id,audio})+'\n');});
  }
  close(){const worker=this.worker;this.worker=null;worker?.kill();if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new Error('Voice transcription stopped.'));this.pending=null;}}
}
module.exports={VoiceTools};
