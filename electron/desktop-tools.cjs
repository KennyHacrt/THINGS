const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const readline=require('node:readline');
const {randomUUID}=require('node:crypto');
class DesktopTools {
  constructor(){this.worker=null;this.pending=new Map();this.allowed=new Set();}
  available(){return process.platform==='win32'&&fs.existsSync(path.join(__dirname,'..','.desktop-env','Scripts','python.exe'));}
  start() {
    if(this.worker)return;
    if(!this.available())throw new Error('Install Windows desktop support with npm run desktop:setup.');
    const worker=spawn(path.join(__dirname,'..','.desktop-env','Scripts','python.exe'),['-u',path.join(__dirname,'screen_worker.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});this.worker=worker;
    readline.createInterface({input:worker.stdout}).on('line',line=>{try{const r=JSON.parse(line);const p=this.pending.get(r.id);if(p){clearTimeout(p.timer);this.pending.delete(r.id);r.error?p.reject(new Error(r.error)):p.resolve(r.result);}}catch{}});
    worker.stderr.on('data',()=>{});
    worker.on('error',()=>{if(this.worker===worker)this.close();});worker.on('exit',()=>{if(this.worker!==worker)return;this.worker=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Desktop helper stopped.'));}this.pending.clear();});
  }
  request(action,args={}) {
    this.start();const id=randomUUID();
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Desktop action timed out.'));this.close();},25000);this.pending.set(id,{resolve,reject,timer});this.worker.stdin.write(JSON.stringify({id,action,args})+'\n');});
  }
  setScope(handle){this.allowed=new Set(handle?[handle]:[]);}
  async execute(name,args,signal) {
    if(signal?.aborted)throw new Error('Task stopped.');
    if(name==='desktop_open'){const result=await this.request('open',args);this.allowed.add(result.handle);return result;}
    if(!Number.isSafeInteger(args.handle)||!this.allowed.has(args.handle))throw new Error('Select this desktop window before accessing it.');
    return this.request(name.replace('desktop_',''),args);
  }
  close(){const worker=this.worker;this.worker=null;if(worker)worker.kill();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Desktop helper stopped.'));}this.pending.clear();}
}
module.exports={DesktopTools};
