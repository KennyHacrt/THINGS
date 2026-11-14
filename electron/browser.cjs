const {isIP}=require('node:net');
function safeUrl(raw){
  const url=new URL(raw),host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Use a public HTTP(S) URL without credentials.');
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||!host.includes('.')||isIP(host))throw new Error('Private/local addresses are not supported.');
  return url.href;
}
class BrowserTools{
  constructor({BrowserWindow}){this.BrowserWindow=BrowserWindow;this.window=null;}
  ensure(){
    if(this.window&&!this.window.isDestroyed())return this.window;
    const w=new this.BrowserWindow({width:1050,height:820,title:'THINGS · Task browser',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,partition:'things-task-browser'}});this.window=w;
    w.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
    w.webContents.session.on('will-download',event=>event.preventDefault());
    w.webContents.setWindowOpenHandler(({url})=>{try{const target=safeUrl(url);setImmediate(()=>{if(!w.isDestroyed())void w.loadURL(target).catch(()=>{});});}catch{}return {action:'deny'};});
    const guard=(event,url)=>{try{safeUrl(url);}catch{event.preventDefault();}};
    w.webContents.on('will-navigate',guard);w.webContents.on('will-redirect',guard);
    w.webContents.debugger.attach('1.3');w.on('closed',()=>{this.window=null;});return w;
  }
  stop(){if(this.window&&!this.window.isDestroyed())this.window.webContents.stop();}
  close(){if(this.window&&!this.window.isDestroyed())this.window.close();}
}
module.exports={BrowserTools,safeUrl};
