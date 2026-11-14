const { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu, safeStorage, desktopCapturer, Tray, nativeImage } = require('electron');
const {createKeyStore}=require('./key-store.cjs');
const {completion}=require('./poe.cjs');
const {Agent}=require('./agent.cjs');
const {VoiceTools}=require('./voice.cjs');
const voiceTools=new VoiceTools();
const {BrowserTools,safeUrl}=require('./browser.cjs');
const {DesktopTools}=require('./desktop-tools.cjs');
const {VisionTools,visionTools}=require('./vision-tools.cjs');
const {assessAction}=require('./vision-policy.cjs');
const {randomUUID}=require('node:crypto');
const {LAYOUT,placement,ActionCursor}=require('./cursor.cjs');
const path = require('node:path');
app.disableHardwareAcceleration();
let mainWindow, companionWindow, quickWindow, cursorTimer, dockWindow, tray;
let deskEnabled=false,deskQueue=[],deskContext=[];
let previousPoint, lastSent = '';
let stillSince = Date.now();
let activity = {pose:'idle', label:'Your little helper', motion:true, busy:false};
let agent, browserTools, desktopTools, credentials, vision;
const actionCursor=new ActionCursor({toDip:p=>screen.screenToDipPoint(p),onChange:state=>{activity={...activity,cursorPhase:state.phase};positionCompanion();}});
const approvals=new Map();
const appFile = path.join(__dirname, '..', 'dist', 'index.html');
const preload = path.join(__dirname, 'preload.cjs');
const poses = new Set(['idle','walk','think','tap','point','success']);
function closeCompanion() {
  clearInterval(cursorTimer); cursorTimer = undefined;
  if (companionWindow && !companionWindow.isDestroyed()) companionWindow.close();
  companionWindow = undefined;
}
function publishActivity(value = activity) {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  const serialized = JSON.stringify(value);
  if(serialized === lastSent) return;
  lastSent = serialized; companionWindow.webContents.send('things:activity', value);
}
function positionCompanion() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  const point=actionCursor.point||screen.getCursorScreenPoint();
  const b=placement(point);companionWindow.setPosition(b.x,b.y,false);
  publishActivity({...activity,cursorPhase:actionCursor.phase});
}
function secureWindow(window) {
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate', e => e.preventDefault());
}
function openCompanion() {
  if (companionWindow && !companionWindow.isDestroyed()) return;
  companionWindow = new BrowserWindow({
    width:LAYOUT.width, height:LAYOUT.height, frame:false, transparent:true, backgroundColor:'#00000000', alwaysOnTop:true,
    skipTaskbar:true, focusable:false, resizable:false, show:false, hasShadow:false,
    webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false},
  });
  companionWindow.setIgnoreMouseEvents(true, {forward:true}); secureWindow(companionWindow);
  companionWindow.loadFile(appFile, {query:{companion:'1'}});
  companionWindow.once('ready-to-show', async() => {lastSent='';positionCompanion();companionWindow?.showInactive();});
  companionWindow.on('closed', () => {clearInterval(cursorTimer);cursorTimer=undefined;companionWindow=undefined;});
  cursorTimer=setInterval(positionCompanion,32);
}
function oldQuick() {
  if (!quickWindow || quickWindow.isDestroyed()) {
    quickWindow = new BrowserWindow({width:620,height:410,frame:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,show:false,backgroundColor:'#f6f5f2',webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});
    secureWindow(quickWindow); quickWindow.loadFile(appFile,{query:{quick:'1'}});
    quickWindow.once('ready-to-show', () => {quickWindow?.center();quickWindow?.show();});
    quickWindow.on('closed', () => {quickWindow=undefined;});
  } else quickWindow.close();
}
function summonQuick(){
  if(dockWindow&&!dockWindow.isDestroyed()){dockWindow.show();dockWindow.focus();return;}
  const area=screen.getPrimaryDisplay().workArea;
  dockWindow=new BrowserWindow({width:390,height:475,x:area.x+area.width-406,y:area.y+area.height-491,title:'THINGS · Desktop assistant',frame:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,show:false,backgroundColor:'#f6f5f2',webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  secureWindow(dockWindow);dockWindow.loadFile(appFile,{query:{desk:'1'}});
  dockWindow.once('ready-to-show',async()=>{dockWindow.show();if(process.argv.includes('--listen'))setTimeout(()=>dockWindow?.webContents.send('things:desk-event',{type:'listen'}),500);});
  dockWindow.webContents.setWindowOpenHandler(({url})=>{try{void browserTools.ensure().loadURL(safeUrl(url));}catch{}return {action:'deny'};});
  dockWindow.on('closed',()=>{dockWindow=undefined;deskEnabled=false;});
}
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',summonQuick);
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    function openSettings(){
      if(!mainWindow||mainWindow.isDestroyed()){
        mainWindow=new BrowserWindow({width:1300,height:930,minWidth:720,minHeight:650,title:'THINGS settings',backgroundColor:'#f6f5f2',webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});
        secureWindow(mainWindow);mainWindow.loadFile(appFile);
        mainWindow.webContents.setWindowOpenHandler(({url})=>{try{void browserTools.ensure().loadURL(safeUrl(url));}catch{}return {action:'deny'};});
        mainWindow.on('close',event=>{if(!app.isQuitting){event.preventDefault();mainWindow.hide();}});
      }
      mainWindow.show();mainWindow.focus();
    }
    const isMain=event=>event.sender===mainWindow?.webContents && event.senderFrame===mainWindow.webContents.mainFrame;
    const isDock=event=>event.sender===dockWindow?.webContents&&event.senderFrame===dockWindow.webContents.mainFrame;
    const isControl=event=>isMain(event)||isDock(event);
    credentials=createKeyStore({safeStorage,directory:app.getPath('userData')});
    browserTools=new BrowserTools({BrowserWindow});desktopTools=new DesktopTools({onPointer:event=>actionCursor.accept(event)});
    vision=new VisionTools({browser:browserTools,desktop:desktopTools,desktopCapturer,onPointer:async({x,y,window,phase='move'})=>{const b=window.getContentBounds(),p=screen.dipToScreenPoint({x:Math.round(b.x+x),y:Math.round(b.y+y)});const handle=window.getNativeWindowHandle().readUInt32LE();await desktopTools.request('browser_pointer',{handle,x:p.x,y:p.y,scale:1,phase});}});

    const send=event=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('things:agent-event',event);if(dockWindow&&!dockWindow.isDestroyed())dockWindow.webContents.send('things:desk-event',event);};
    const chat=(role,text,speak=false)=>{if(dockWindow&&!dockWindow.isDestroyed())dockWindow.webContents.send('things:desk-event',{type:'chat',role,text,speak});};
    const setActivity=value=>{activity={...activity,...value};if(value.busy===false)actionCursor.release();publishActivity();};
    const approve=(action,signal)=>new Promise(resolve=>{
      const id=randomUUID();let timer;
      const finish=allowed=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);approvals.delete(id);send({type:'approval-resolved',approvalId:id,allowed});resolve(allowed);};
      const cancel=()=>finish(false);
      approvals.set(id,finish);signal.addEventListener('abort',cancel,{once:true});
      timer=setTimeout(()=>finish(false),180000);
      send({type:'approval-request',approvalId:id,...action});
      summonQuick();
    });
    agent=new Agent({tools:visionTools,credentials,onEvent:send,onActivity:setActivity,requestApproval:approve,
      assess:async({args,prompt,signal})=>assessAction({frame:vision.getFrame(args),args,prompt,credentials,signal}),
      execute:async(name,args,scope,signal)=>{
        if(name==='describe_action')return vision.describe(args.args);
        return vision.execute(name,args,scope,signal);
      },
    });
    async function workNext(){
      if(agent.run||!deskQueue.length)return;
      const prompt=deskQueue.shift();
      const externalHandle=Number(process.argv.find(a=>a.startsWith('--things-browser-hwnd='))?.split('=')[1]);
      const handle=vision.desktopHandle||externalHandle||null;
      if(externalHandle&&!vision.desktopHandle)await desktopTools.request('allow_browser',{handle:externalHandle});
      vision.setScope(handle);
      try{const result=await agent.start(prompt,{mode:externalHandle?'desktop':'both',handle,conversation:true,externalBrowser:!!externalHandle},deskContext);deskContext=[...deskContext,{role:'user',content:prompt},{role:'assistant',content:result.result}].slice(-6);chat('assistant',result.result,true);}
      catch(e){deskContext=[...deskContext,{role:'user',content:prompt},{role:'assistant',content:'The previous task stopped without a verified completion: '+e.message}].slice(-6);if(!/abort|stopped/i.test(e.message))chat('assistant',e.message,true);}
      finally{if(deskQueue.length)setTimeout(()=>void workNext(),100);}
    }
    ipcMain.handle('things:desk-enable',event=>{if(!isDock(event))throw new Error('Unavailable');if(!credentials.key())throw new Error('Connect Poe in settings first.');deskEnabled=true;openCompanion();return true;});
    ipcMain.handle('things:desk-speak',(event,text)=>{
      if(!isDock(event)||!deskEnabled)throw new Error('Start a voice conversation first.');
      if(typeof text!=='string'||!text.trim()||text.length>4000)throw new Error('Speak a shorter request.');
      chat('user',text);
      if(/^(stop|cancel|stop working|cancel that|停止|停|取消|停低)[.!。]?$/i.test(text.trim())){deskQueue=[];agent.stop();browserTools.stop();chat('assistant','Stopped. What would you like instead?');return {accepted:true};}
      if(/^(pause|pause work|resume|continue|暫停|繼續)[.!。]?$/i.test(text.trim())&&agent.run){agent.pause();return {accepted:true};}
      if(deskQueue.length>=3)throw new Error('I have three requests queued. Let me finish one first.');
      deskQueue.push(text);chat('assistant',agent.run?'Got it. I’ll do that next.':'On it. I’ll work right here.');void workNext();return {accepted:true};
    });
    ipcMain.on('things:desk-settings',event=>{if(isDock(event))openSettings();});
    ipcMain.on('things:desk-hide',event=>{if(isDock(event))dockWindow.hide();});
    ipcMain.handle('things:voice-transcribe',(event,audio,partial=false)=>{if(!isControl(event)&&event.sender!==quickWindow?.webContents)throw new Error('Unavailable');if(agent?.run&&!isDock(event))throw new Error('Finish or stop the current task before speaking another.');return voiceTools.transcribe(audio,partial===true);});
    ipcMain.handle('things:ai-config',event=>{if(!isMain(event))throw new Error('Unavailable');return {...credentials.config(),desktopAvailable:desktopTools.available()};});
    ipcMain.handle('things:ai-save',(event,value)=>{if(!isMain(event)||agent.run)throw new Error('Settings cannot change during a task.');return credentials.save(value||{});});
    ipcMain.handle('things:ai-test',async event=>{
      if(!isMain(event)||agent.run)throw new Error('Finish the current task first.');
      const result=await completion({key:credentials.key(),model:credentials.config().model,messages:[{role:'system',content:'Call connection_check with marker READY. This is a tool API diagnostic.'},{role:'user',content:'Run connection_check now.'}],tools:[{type:'function',function:{name:'connection_check',description:'Verify tool calling.',parameters:{type:'object',properties:{marker:{type:'string'}},required:['marker'],additionalProperties:false}}}]});
      if(!result.message.tool_calls?.some(c=>c.function.name==='connection_check'))throw new Error('Poe responded, but this model did not pass the tool-calling capability check. Choose another model.');
      return {ok:true,model:credentials.config().model,message:'Tool calling verified.'};
    });
    ipcMain.handle('things:desktop-windows',async event=>{if(!isMain(event)||agent.run)throw new Error('Unavailable during a task.');return desktopTools.request('list');});
    ipcMain.handle('things:agent-start',async(event,{prompt,mode,handle,shareContext}={})=>{
      if(!isMain(event)||!['browser','desktop','both'].includes(mode)||shareContext!==true)throw new Error('Allow sharing task context with Poe before starting.');
      if(agent.run||activity.busy)throw new Error('A task is already running.');
      if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000)throw new Error('Enter a task of 1–4000 characters.');
      if(!credentials.key())throw new Error('Connect Poe in settings first.');
      if(handle!==null&&handle!==undefined){
        const windows=await desktopTools.request('list');if(!windows.some(w=>w.handle===handle))throw new Error('Choose an available desktop window.');
      }
      if(agent.run)throw new Error('A task is already running.');
      vision.setScope(handle);
      const task=agent.start(prompt,{mode,handle:handle||null});task.catch(()=>{});return {started:true};
    });
    ipcMain.handle('things:agent-control',(event,action)=>{
      if(!isControl(event))throw new Error('Unavailable');
      if(action==='stop'){voiceTools.close();agent.stop();browserTools.stop();desktopTools.close();return {stopped:true};}
      if(action==='pause')return {paused:agent.pause()};throw new Error('Unknown task control.');
    });
    ipcMain.handle('things:agent-approve',(event,{id,allow}={})=>{if(!isControl(event)||typeof allow!=='boolean')return false;const resolve=approvals.get(id);if(!resolve)return false;resolve(allow);return true;});
    require('electron').session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details) => {
      callback([mainWindow?.webContents,quickWindow?.webContents,dockWindow?.webContents].includes(contents) && permission === 'media' && !details.mediaTypes?.includes('video'));
    });
    ipcMain.handle('things:set-companion', (event,enabled) => {
      if(event.sender !== mainWindow?.webContents || typeof enabled !== 'boolean') return false;
      if(enabled) openCompanion();else closeCompanion();return Boolean(companionWindow);
    });
    ipcMain.on('things:update-activity', (event,value) => {
      if(agent?.run)return;
      if(event.sender !== mainWindow?.webContents || !value || !poses.has(value.pose) || typeof value.label !== 'string' || typeof value.motion !== 'boolean' || typeof value.busy !== 'boolean') return;
      activity={pose:value.pose,label:value.label.slice(0,50),motion:value.motion,busy:value.busy};publishActivity();
    });
    ipcMain.handle('things:get-activity', event => {
      if(event.sender !== companionWindow?.webContents) throw new Error('Companion only');
      return activity;
    });
    ipcMain.handle('things:quick-task', (event,prompt) => {
      if(event.sender !== quickWindow?.webContents || typeof prompt !== 'string' || !prompt.trim() || prompt.length>2000 || activity.busy || !mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) return false;
      mainWindow.show();if(mainWindow.isMinimized()) mainWindow.restore();mainWindow.focus();
      mainWindow.webContents.send('things:quick-task',prompt.trim());quickWindow?.close();return true;
    });
    ipcMain.on('things:close-quick',event => {if(event.sender === quickWindow?.webContents) quickWindow.close();});
    summonQuick();
    const icon=nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABA0lEQVR4nMWXSw7DIAxEYZSrtIuyau9/hnaVLprDtEJKJcviY4wBS1ESIH5j4xDi3GLzuY7b5f61BL2PV5LlR4NrQjATnmJgJjzFgltsvif6/fNMtofrQ1wPcIsNFk5ixNKouW0WKadC4ph4SAVtLQIoqCaI9+UEQSOgBmsx9IBLaZbWBTQR9kTcLGA/YZZQsYCdQGvp1GYJpU4OpfdSQO2NgcgLcfB3qF14mteBcC4uvC11rRGGlsEjChGSQZq5NxXQM+c1wRjhNDXO5FsQlFkoPQeVR0EWpFnymi1ZSyGWoo9bMj9iV8wXrRw8nlUbEstaAVc0wygLuY4Z8GjLf06X2w8dWHnCv6+42QAAAABJRU5ErkJggg==");if(!icon.isEmpty()){tray=new Tray(icon);tray.setToolTip('THINGS · Your desktop helping hand');tray.setContextMenu(Menu.buildFromTemplate([{label:'Talk to THINGS',click:summonQuick},{label:'Settings & history',click:openSettings},{label:'Quit THINGS',click:()=>app.quit()}]));tray.on('click',summonQuick);}
    globalShortcut.register('CommandOrControl+Shift+Space',()=>{summonQuick();if(dockWindow.webContents.isLoading())dockWindow.webContents.once('did-finish-load',()=>dockWindow.webContents.send('things:desk-event',{type:'listen'}));else dockWindow.webContents.send('things:desk-event',{type:'listen'});});
    globalShortcut.register('CommandOrControl+Alt+Space',()=>{voiceTools.close();agent?.stop();browserTools?.stop();desktopTools?.close();});

  });
}
app.on('before-quit',()=>{app.isQuitting=true;agent?.stop();voiceTools.close();desktopTools?.close();});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {voiceTools.close();globalShortcut.unregisterAll();closeCompanion();});
