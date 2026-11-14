const { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu, safeStorage, desktopCapturer } = require('electron');
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
const path = require('node:path');
app.disableHardwareAcceleration();
let mainWindow, companionWindow, quickWindow, cursorTimer;
let previousPoint, lastSent = '';
let stillSince = Date.now();
let activity = {pose:'idle', label:'Your little helper', motion:true, busy:false};
let agent, browserTools, desktopTools, credentials, vision;
let pointerOverride=null;
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
  const point = pointerOverride&&pointerOverride.until>Date.now()?pointerOverride:screen.getCursorScreenPoint();
  if(!previousPoint || Math.abs(point.x - previousPoint.x) + Math.abs(point.y - previousPoint.y) > 2) stillSince = Date.now();
  previousPoint = point;
  const bounds = screen.getDisplayNearestPoint(point).workArea;
  companionWindow.setPosition(
    Math.round(Math.max(bounds.x, Math.min(point.x - 55, bounds.x + bounds.width - 150))),
    Math.round(Math.max(bounds.y, Math.min(point.y + 8, bounds.y + bounds.height - 180))), false,
  );
  publishActivity({...activity, pose: activity.busy || activity.pose === 'success' ? activity.pose : Date.now()-stillSince < 160 ? 'walk' : 'idle'});
}
function secureWindow(window) {
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate', e => e.preventDefault());
}
function openCompanion() {
  if (companionWindow && !companionWindow.isDestroyed()) return;
  companionWindow = new BrowserWindow({
    width:150, height:180, frame:false, transparent:true, backgroundColor:'#00000000', alwaysOnTop:true,
    skipTaskbar:true, focusable:false, resizable:false, show:false, hasShadow:false,
    webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false},
  });
  companionWindow.setIgnoreMouseEvents(true, {forward:true}); secureWindow(companionWindow);
  companionWindow.loadFile(appFile, {query:{companion:'1'}});
  companionWindow.once('ready-to-show', () => {lastSent='';positionCompanion();companionWindow?.showInactive();});
  companionWindow.on('closed', () => {clearInterval(cursorTimer);cursorTimer=undefined;companionWindow=undefined;});
  cursorTimer=setInterval(positionCompanion,32);
}
function summonQuick() {
  if (!quickWindow || quickWindow.isDestroyed()) {
    quickWindow = new BrowserWindow({width:620,height:410,frame:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,show:false,backgroundColor:'#f6f5f2',webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});
    secureWindow(quickWindow); quickWindow.loadFile(appFile,{query:{quick:'1'}});
    quickWindow.once('ready-to-show', () => {quickWindow?.center();quickWindow?.show();});
    quickWindow.on('closed', () => {quickWindow=undefined;});
  } else quickWindow.close();
}
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {if(mainWindow && !mainWindow.isDestroyed()) {if(mainWindow.isMinimized()) mainWindow.restore();mainWindow.show();mainWindow.focus();}});
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    mainWindow=new BrowserWindow({width:1300,height:930,minWidth:720,minHeight:650,title:'THINGS',backgroundColor:'#f6f5f2',webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});
    secureWindow(mainWindow); mainWindow.loadFile(appFile);
    const isMain=event=>event.sender===mainWindow?.webContents && event.senderFrame===mainWindow.webContents.mainFrame;
    credentials=createKeyStore({safeStorage,directory:app.getPath('userData')});
    browserTools=new BrowserTools({BrowserWindow});desktopTools=new DesktopTools();
    vision=new VisionTools({browser:browserTools,desktop:desktopTools,desktopCapturer,onPointer:({x,y,window})=>{const b=window.getContentBounds();pointerOverride={x:b.x+x,y:b.y+y,until:Date.now()+1000};}});
    mainWindow.webContents.setWindowOpenHandler(({url})=>{try{const target=safeUrl(url);void browserTools.ensure().loadURL(target).catch(()=>{});}catch{}return {action:'deny'};});
    const send=event=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('things:agent-event',event);};
    const setActivity=value=>{activity={...activity,...value};publishActivity();};
    const approve=(action,signal)=>new Promise(resolve=>{
      const id=randomUUID();let timer;
      const finish=allowed=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);approvals.delete(id);send({type:'approval-resolved',approvalId:id,allowed});resolve(allowed);};
      const cancel=()=>finish(false);
      approvals.set(id,finish);signal.addEventListener('abort',cancel,{once:true});
      timer=setTimeout(()=>finish(false),180000);
      send({type:'approval-request',approvalId:id,...action});
      mainWindow.show();mainWindow.focus();
    });
    agent=new Agent({tools:visionTools,credentials,onEvent:send,onActivity:setActivity,requestApproval:approve,
      assess:async({args,prompt,signal})=>assessAction({frame:vision.getFrame(args),args,prompt,credentials,signal}),
      execute:async(name,args,scope,signal)=>{
        if(name==='describe_action')return vision.describe(args.args);
        return vision.execute(name,args,scope,signal);
      },
    });
    ipcMain.handle('things:voice-transcribe',(event,audio)=>{if(!isMain(event)&&event.sender!==quickWindow?.webContents)throw new Error('Unavailable');if(agent?.run)throw new Error('Finish or stop the current task before speaking another.');return voiceTools.transcribe(audio);});
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
      if(!isMain(event))throw new Error('Unavailable');
      if(action==='stop'){voiceTools.close();agent.stop();browserTools.stop();desktopTools.close();return {stopped:true};}
      if(action==='pause')return {paused:agent.pause()};throw new Error('Unknown task control.');
    });
    ipcMain.handle('things:agent-approve',(event,{id,allow}={})=>{if(!isMain(event)||typeof allow!=='boolean')return false;const resolve=approvals.get(id);if(!resolve)return false;resolve(allow);return true;});
    mainWindow.webContents.session.setPermissionRequestHandler((contents,permission,callback,details) => {
      callback([mainWindow?.webContents,quickWindow?.webContents].includes(contents) && permission === 'media' && !details.mediaTypes?.includes('video'));
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
    globalShortcut.register('CommandOrControl+Shift+Space',summonQuick);
    globalShortcut.register('CommandOrControl+Alt+Space',()=>{voiceTools.close();agent?.stop();browserTools?.stop();desktopTools?.close();});
    mainWindow.on('closed', () => {voiceTools.close();agent?.stop();desktopTools?.close();browserTools?.close();mainWindow=undefined;closeCompanion();if(quickWindow && !quickWindow.isDestroyed()) quickWindow.close();});
  });
}
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {voiceTools.close();globalShortcut.unregisterAll();closeCompanion();});
