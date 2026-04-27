const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameAPI', {
  // Send game state for saving
  sendGameState: (data) => ipcRenderer.send('save:gameState', data),

  // Auto-load most recent save
  autoLoad: () => ipcRenderer.invoke('save:autoLoad'),

  // Event listeners
  onRequestGameState: (callback) => ipcRenderer.on('request:gameState', callback),
  onGameSaved: (callback) => ipcRenderer.on('game:saved', (event, result) => callback(result)),
  onGameLoad: (callback) => ipcRenderer.on('game:load', (event, result) => callback(result)),

  // Export terrain data
  exportTerrain: (data) => ipcRenderer.send('export:terrain', data)
});
