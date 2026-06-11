const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Spotify auth
  openSpotifyAuth: (url) => ipcRenderer.send('spotify-open-auth', url),
  onSpotifyCallback: (cb) => {
    ipcRenderer.on('spotify-callback', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('spotify-callback');
  },

  // Media keys
  onMediaPlayPause: (cb) => { ipcRenderer.on('media-play-pause', cb); return () => ipcRenderer.removeAllListeners('media-play-pause'); },
  onMediaNext:      (cb) => { ipcRenderer.on('media-next',       cb); return () => ipcRenderer.removeAllListeners('media-next'); },
  onMediaPrev:      (cb) => { ipcRenderer.on('media-prev',       cb); return () => ipcRenderer.removeAllListeners('media-prev'); },
  onMediaStop:      (cb) => { ipcRenderer.on('media-stop',       cb); return () => ipcRenderer.removeAllListeners('media-stop'); },

  // Backend status
  onBackendStatus: (cb) => { ipcRenderer.on('backend-status', (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('backend-status'); },

  // Auto-updater
  onUpdateDownloaded: (cb) => { ipcRenderer.on('update-downloaded', (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('update-downloaded'); },
});
