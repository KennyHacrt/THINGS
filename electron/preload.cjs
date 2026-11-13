const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('thingsDesktop', {
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
