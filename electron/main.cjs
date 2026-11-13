const { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu } = require('electron');
const path = require('node:path');
let mainWindow, companionWindow, quickWindow, cursorTimer;
let previousPoint, lastSent = '';
let stillSince = Date.now();
let activity = {pose:'idle', label:'Your little helper', motion:true, busy:false};
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
  const point = screen.getCursorScreenPoint();
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
    quickWindow = new BrowserWindow({width:620,height:325,frame:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,show:false,backgroundColor:'#f6f5f2',webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});
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
    mainWindow.webContents.session.setPermissionRequestHandler((contents,permission,callback,details) => {
      callback(contents === mainWindow?.webContents && permission === 'media' && !details.mediaTypes?.includes('video'));
    });
    ipcMain.handle('things:set-companion', (event,enabled) => {
      if(event.sender !== mainWindow?.webContents || typeof enabled !== 'boolean') return false;
      if(enabled) openCompanion();else closeCompanion();return Boolean(companionWindow);
    });
    ipcMain.on('things:update-activity', (event,value) => {
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
    mainWindow.on('closed', () => {mainWindow=undefined;closeCompanion();if(quickWindow && !quickWindow.isDestroyed()) quickWindow.close();});
  });
}
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {globalShortcut.unregisterAll();closeCompanion();});
