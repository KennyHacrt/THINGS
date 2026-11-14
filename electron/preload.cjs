const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('thingsDesktop', {
  aiConfig:()=>ipcRenderer.invoke('things:ai-config'),
  aiSave:value=>ipcRenderer.invoke('things:ai-save',value),
  aiTest:()=>ipcRenderer.invoke('things:ai-test'),
  desktopWindows:()=>ipcRenderer.invoke('things:desktop-windows'),
  agentStart:task=>ipcRenderer.invoke('things:agent-start',task),
  agentControl:action=>ipcRenderer.invoke('things:agent-control',action),
  agentApprove:(id,allow)=>ipcRenderer.invoke('things:agent-approve',{id,allow}),
  onAgentEvent:callback=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('things:agent-event',listener);return()=>ipcRenderer.removeListener('things:agent-event',listener);},
  setCompanion: enabled => ipcRenderer.invoke('things:set-companion', Boolean(enabled)),
  updateActivity: activity => ipcRenderer.send('things:update-activity', activity),
  getActivity: () => ipcRenderer.invoke('things:get-activity'),
  onActivity: callback => {
    const listener = (_event, activity) => callback(activity);
    ipcRenderer.on('things:activity', listener);
    return () => ipcRenderer.removeListener('things:activity', listener);
  },
  onQuickTask: callback => {
    const listener = (_event, prompt) => callback(prompt);
    ipcRenderer.on('things:quick-task', listener);
    return () => ipcRenderer.removeListener('things:quick-task', listener);
  },
  submitQuickTask: prompt => ipcRenderer.invoke('things:quick-task', prompt),
  closeQuick: () => ipcRenderer.send('things:close-quick'),
});
