const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const saveSystem = require('./src/saveSystem');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer/index.html');
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            const result = await saveSystem.saveGame({});
            console.log('Save:', result.success ? 'OK' : result.error);
          }
        },
        {
          label: 'Load',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await saveSystem.loadGame();
            console.log('Load:', result.success ? result.data : result.error);
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
