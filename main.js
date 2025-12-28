const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

const SAVES_DIR = path.join(__dirname, 'saves');

// Ensure saves directory exists
async function ensureSavesDir() {
  try {
    await fs.mkdir(SAVES_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

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
            // Get game state from renderer
            mainWindow.webContents.send('request:gameState');
          }
        },
        {
          label: 'Load',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            await ensureSavesDir();
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Load Save File',
              defaultPath: SAVES_DIR,
              filters: [{ name: 'Save Files', extensions: ['json'] }],
              properties: ['openFile']
            });

            if (!result.canceled && result.filePaths.length > 0) {
              try {
                const data = await fs.readFile(result.filePaths[0], 'utf-8');
                const parsed = JSON.parse(data);
                mainWindow.webContents.send('game:load', {
                  success: true,
                  data: parsed,
                  filename: path.basename(result.filePaths[0])
                });
              } catch (error) {
                mainWindow.webContents.send('game:load', {
                  success: false,
                  error: error.message
                });
              }
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
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

// Handle save request from renderer
ipcMain.on('save:gameState', async (event, data) => {
  await ensureSavesDir();

  // Generate default filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '');
  const defaultFilename = `save_${timestamp}.json`;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Game',
    defaultPath: path.join(SAVES_DIR, defaultFilename),
    filters: [{ name: 'Save Files', extensions: ['json'] }]
  });

  if (!result.canceled && result.filePath) {
    try {
      await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
      mainWindow.webContents.send('game:saved', {
        success: true,
        filename: path.basename(result.filePath)
      });
    } catch (error) {
      mainWindow.webContents.send('game:saved', {
        success: false,
        error: error.message
      });
    }
  }
});

// Auto-load most recent save on startup
ipcMain.handle('save:autoLoad', async () => {
  try {
    await ensureSavesDir();
    const files = await fs.readdir(SAVES_DIR);
    const saveFiles = files
      .filter(f => f.startsWith('save_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (saveFiles.length === 0) {
      return { success: true, data: null };
    }

    const filepath = path.join(SAVES_DIR, saveFiles[0]);
    const data = await fs.readFile(filepath, 'utf-8');
    return { success: true, data: JSON.parse(data), filename: saveFiles[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
