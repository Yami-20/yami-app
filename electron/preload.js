const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Spotify login — opens embedded browser, returns sp_dc cookie automatically
  openSpotifyLogin: () => ipcRenderer.send('spotify-open-login'),
  onSpotifySpDc: (cb) => {
    ipcRenderer.on('spotify-sp-dc', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('spotify-sp-dc');
  },
});
