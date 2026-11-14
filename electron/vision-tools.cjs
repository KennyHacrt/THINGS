const {safeUrl}=require('./browser.cjs');
const schema=(name,description,properties,required=Object.keys(properties))=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
const str={type:'string'};
function visionTools(scope){
  const tools=[schema('computer','Look at a screenshot or operate by its pixel coordinates. Every action returns a new screenshot. For screenshot use frame an empty string; for all other actions copy the latest frame ID exactly. Coordinates refer to the returned image, not OS pixels.',{target:{type:'string',enum:scope.mode==='browser'?['browser']:scope.mode==='desktop'?['desktop']:['browser','desktop']},action:{type:'string',enum:['screenshot','click','double_click','type','key','scroll','move']},reason:str,frame:str,x:{type:'number'},y:{type:'number'},text:str,key:{type:'string',enum:['Enter','Tab','Escape','Backspace','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End','PageDown','PageUp','Control+A','Control+F','Control+L']},scrollY:{type:'integer'},replace:{type:'boolean'}},['target','action','reason','frame'])];
  if(scope.mode!=='desktop')tools.push(schema('browser_open','Open a public URL in THINGS and return its screenshot.',{url:str}),schema('browser_search','Search the web and return a screenshot of the actual results.',{query:str}));
  if(scope.mode!=='browser')tools.push(schema('desktop_open','Open Calculator or a task-specific Notepad file and return its screenshot.',{app:{type:'string',enum:['calculator','notepad']}}));
  return tools;
}
function point(args,frame){
  if(!Number.isFinite(args.x)||!Number.isFinite(args.y)||args.x<0||args.y<0||args.x>=frame.width||args.y>=frame.height)throw new Error('Coordinates are outside the screenshot.');
  return {x:args.x/frame.width,y:args.y/frame.height};
}
class VisionTools {
  constructor({browser,desktop,desktopCapturer,onPointer}){Object.assign(this,{browser,desktop,desktopCapturer,onPointer});this.frames=new Map();this.desktopHandle=null;this.frameNumber=0;}
  setScope(handle){this.frames.clear();this.desktopHandle=handle||null;this.desktop.setScope(handle);}
  async capture(target){
    let image,metadata;
    if(target==='browser'){
      const w=this.browser.ensure();safeUrl(w.webContents.getURL());
      await this.settle(w.webContents);
      try{image=await w.webContents.capturePage(undefined,{stayAwake:true});}
      catch{
        let shot;
        try{shot=await w.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'jpeg',quality:85,fromSurface:true,captureBeyondViewport:false});}
        catch{shot=await w.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'jpeg',quality:85,fromSurface:false,captureBeyondViewport:false});}
        image=require('electron').nativeImage.createFromBuffer(Buffer.from(shot.data,'base64'));
      }
      const metrics=await w.webContents.debugger.sendCommand('Page.getLayoutMetrics');
      metadata={url:w.webContents.getURL(),title:w.webContents.getTitle(),viewport:{width:metrics.cssVisualViewport.clientWidth,height:metrics.cssVisualViewport.clientHeight}};
    }else{
      if(!this.desktopHandle)throw new Error('Choose a desktop window or call desktop_open first.');
      metadata=await this.desktop.request('metadata',{handle:this.desktopHandle});
      const captured=await this.desktop.request('capture',{handle:this.desktopHandle});
      image=require('electron').nativeImage.createFromDataURL(captured.image);
      metadata=await this.desktop.request('metadata',{handle:this.desktopHandle});
      const size=image.getSize();
      if(Math.abs(size.width/size.height-metadata.bounds.width/metadata.bounds.height)>.08)throw new Error('Window capture and geometry are not aligned yet. Take a new screenshot after the window finishes opening.');
    }
    if(image.isEmpty())throw new Error('The screenshot is empty. Restore the target window.');
    if(image.getSize().width>1280)image=image.resize({width:1280});
    const size=image.getSize();const frame={target,id:`f${++this.frameNumber}`,width:size.width,height:size.height,...metadata,image:'data:image/jpeg;base64,'+image.toJPEG(82).toString('base64')};
    this.frames.set(target,frame);return frame;
  }
  async settle(contents){const deadline=Date.now()+12000;while(contents.isLoadingMainFrame()&&Date.now()<deadline)await new Promise(r=>setTimeout(r,120));await new Promise(r=>setTimeout(r,250));}
  getFrame(args){const frame=this.frames.get(args.target);if(!frame||args.frame!==frame.id)throw new Error(`Stale screenshot. Latest frame is ${frame?.id||'none'}; received ${String(args.frame)}. Capture a new screenshot and copy its id exactly.`);return frame;}
  describe(args){const f=this.getFrame(args);return {application:f.title,target:args.target,url:f.url,action:args.action,reason:args.reason,...(args.text?{text:args.text}:{}),...(args.key?{key:args.key}:{}),...(Number.isFinite(args.x)?{x:args.x,y:args.y}:{})};}
  async execute(name,args,scope,signal){
    if(signal.aborted)throw new Error('Task stopped.');
    if(name==='browser_open'||name==='browser_search'){
      if(name==='browser_search'&&(typeof args.query!=='string'||args.query.length>600))throw new Error('Use a short search query.');
      const url=name==='browser_search'?'https://www.google.com/search?q='+encodeURIComponent(args.query):safeUrl(args.url);
      const w=this.browser.ensure();let timer;const stop=()=>w.webContents.stop();signal.addEventListener('abort',stop,{once:true});
      try{await Promise.race([w.loadURL(url),new Promise((_,reject)=>{timer=setTimeout(()=>{w.webContents.stop();reject(new Error('Page navigation timed out.'));},30000);})]);}
      finally{clearTimeout(timer);signal.removeEventListener('abort',stop);}
      if(signal.aborted)throw new Error('Task stopped.');return this.capture('browser');
    }
    if(name==='desktop_open'){
      const result=await this.desktop.request('open',{app:args.app});this.desktop.allowed.add(result.handle);this.desktopHandle=result.handle;return this.capture('desktop');
    }
    if(name!=='computer')throw new Error('Unsupported vision tool.');
    if(!['browser','desktop'].includes(args.target)||!['screenshot','click','double_click','type','key','scroll','move'].includes(args.action))throw new Error('Invalid computer action.');
    if(args.action==='screenshot')return this.capture(args.target);
    const frame=this.getFrame(args);
    let normalized;
    if(['click','double_click','move'].includes(args.action))normalized=point(args,frame);
    if(args.action==='type'&&(typeof args.text!=='string'||args.text.length>6000))throw new Error('Text must be at most 6000 characters.');
    if(args.action==='scroll'&&(!Number.isInteger(args.scrollY)||Math.abs(args.scrollY)>1500))throw new Error('Scroll by at most 1500 pixels.');
    if(signal.aborted)throw new Error('Task stopped.');
    if(args.target==='browser'){
      const w=this.browser.ensure();if(w.webContents.getURL()!==frame.url)throw new Error('Page changed. Take a new screenshot.');
      const metrics=await w.webContents.debugger.sendCommand('Page.getLayoutMetrics');
      if(metrics.cssVisualViewport.clientWidth!==frame.viewport.width||metrics.cssVisualViewport.clientHeight!==frame.viewport.height)throw new Error('Window resized. Take a new screenshot.');
      const cdp=(method,params)=>w.webContents.debugger.sendCommand(method,params);
      if(normalized){
        const x=normalized.x*frame.viewport.width,y=normalized.y*frame.viewport.height;
        await this.onPointer?.({x,y,window:w});
        if(signal.aborted)throw new Error('Task stopped.');
        await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
        if(args.action!=='move')for(let clickCount=1;clickCount<=(args.action==='double_click'?2:1);clickCount++)for(const type of ['mousePressed','mouseReleased'])await cdp('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount});
      }else if(args.action==='type'){
        const editable=await w.webContents.executeJavaScript(`(() => {const e=document.activeElement;return !!e&&e.type!=='password'&&(['INPUT','TEXTAREA'].includes(e.tagName)||e.isContentEditable);})()`);
        if(!editable)throw new Error('Click an editable non-password field first.');
        if(args.replace)await this.browserKey(cdp,'Control+A');
        await cdp('Input.insertText',{text:args.text});
      }else if(args.action==='key')await this.browserKey(cdp,args.key);
      else if(args.action==='scroll')await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:frame.viewport.width/2,y:frame.viewport.height/2,deltaX:0,deltaY:args.scrollY});
      await this.settle(w.webContents);
    }else{
      await this.desktop.request('input',{handle:this.desktopHandle,action:args.action,...(normalized||{}),text:args.text,key:args.key,scrollY:args.scrollY,replace:args.replace,expected:frame.bounds});
      await new Promise(r=>setTimeout(r,300));
    }
    this.frames.delete(args.target);if(signal.aborted)throw new Error('Task stopped.');return this.capture(args.target);
  }
  async browserKey(cdp,key){
    const map={Enter:['Enter',13,'\r'],Tab:['Tab',9],Escape:['Escape',27],Backspace:['Backspace',8],ArrowDown:['ArrowDown',40],ArrowUp:['ArrowUp',38],ArrowLeft:['ArrowLeft',37],ArrowRight:['ArrowRight',39],Home:['Home',36],End:['End',35],PageDown:['PageDown',34],PageUp:['PageUp',33],'Control+A':['a',65],'Control+F':['f',70]};
    if(!map[key])throw new Error('Unsupported key.');const [name,code,text]=map[key];
    for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:name,windowsVirtualKeyCode:code,modifiers:key.startsWith('Control+')?2:0,...(text&&type==='keyDown'?{text}:{})});
  }
}
module.exports={VisionTools,visionTools,point};
