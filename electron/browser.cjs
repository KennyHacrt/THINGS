const {isIP}=require('node:net');
function safeUrl(raw){
  const url=new URL(raw),host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Use a public HTTP(S) URL without credentials.');
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||!host.includes('.')||isIP(host))throw new Error('Private/local addresses are not supported.');
  return url.href;
}
const pointerSource='data:image/svg+xml;base64,'+require('node:fs').readFileSync(require('node:path').join(__dirname,'..','public','thing-pointer.svg')).toString('base64');
class BrowserTools{
  constructor({BrowserWindow}){this.BrowserWindow=BrowserWindow;this.window=null;}
  ensure(){
    if(this.window&&!this.window.isDestroyed())return this.window;
    const area=require('electron').screen.getPrimaryDisplay().workArea;
    const w=new this.BrowserWindow({x:area.x+20,y:area.y+24,width:Math.max(650,area.width-445),height:area.height-48,show:false,title:'THINGS · Task browser',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,partition:'things-task-browser'}});this.window=w;w.once('ready-to-show',()=>w.showInactive());
    w.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
    w.webContents.session.on('will-download',event=>event.preventDefault());
    w.webContents.setWindowOpenHandler(({url})=>{try{const target=safeUrl(url);setImmediate(()=>{if(!w.isDestroyed())void w.loadURL(target).catch(()=>{});});}catch{}return {action:'deny'};});
    const guard=(event,url)=>{try{safeUrl(url);}catch{event.preventDefault();}};
    w.webContents.on('will-navigate',guard);w.webContents.on('will-redirect',guard);
    w.webContents.debugger.attach('1.3');w.on('closed',()=>{this.window=null;});return w;
  }
  async point({x,y,window=this.window,phase='move'}){
    if(!Number.isFinite(x)||!Number.isFinite(y)||!window||window.isDestroyed())return;
    await window.webContents.executeJavaScriptInIsolatedWorld(991,[{code:`(()=>{
      let host=document.getElementById('__things_agent_pointer__');
      if(!host){host=document.createElement('div');host.id='__things_agent_pointer__';host.style.cssText='position:fixed;left:0;top:0;width:64px;height:75px;z-index:2147483647;pointer-events:none!important;opacity:1;transition:transform 90ms linear;';
      const shadow=host.attachShadow({mode:'closed'});const image=document.createElement('img');image.src=${JSON.stringify(pointerSource)};image.style.cssText='width:64px;height:75px;display:block;pointer-events:none;filter:drop-shadow(0 2px 2px #38223630)';shadow.append(image);document.documentElement.append(host);}
      host.style.opacity='1';host.style.transform='translate('+(${JSON.stringify(x)}-70*64/180)+'px,'+(${JSON.stringify(y)}-15.25*75/210)+'px)';
      host.style.transformOrigin='24.89px 5.45px';host.style.scale=${JSON.stringify(phase==='down'?'.92':'1')};
      host.style.filter=${JSON.stringify(phase==='down'?'drop-shadow(0 0 4px #a181d5)':'none')};
    })()`}]);
    if(phase==='move'||phase==='type')await new Promise(r=>setTimeout(r,100));
  }
  async pointerVisible(visible){if(this.window&&!this.window.isDestroyed())await this.window.webContents.executeJavaScriptInIsolatedWorld(991,[{code:`(()=>{const h=document.getElementById('__things_agent_pointer__');if(h)h.style.opacity=${JSON.stringify(visible?'1':'0')};})()`}]).catch(()=>{});}
  stop(){if(this.window&&!this.window.isDestroyed())this.window.webContents.stop();}
  close(){if(this.window&&!this.window.isDestroyed())this.window.close();}
}
module.exports={BrowserTools,safeUrl};
