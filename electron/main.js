const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Dentist PRO 7.0 - Modern Offline Dental Management',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    autoHideMenuBar: false,
  });

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';

  const loadWithRetry = (retryCount = 0) => {
    mainWindow.loadURL(startUrl).catch((err) => {
      if (retryCount < 30) {
        // Retry up to 30 times (60 seconds total with 2s intervals)
        console.log(`Waiting for Next.js server... (attempt ${retryCount + 1})`);
        setTimeout(() => loadWithRetry(retryCount + 1), 2000);
      } else {
        console.error('Failed to connect to Next.js server after retries:', err);
      }
    });
  };

  loadWithRetry();

  // Enable Reload Shortcuts (Ctrl+R / F5 / Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.reload();
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for Native Printing and System API
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('print-direct', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'Window not initialized' };

  try {
    mainWindow.webContents.print(
      {
        silent: options.silent || false,
        printBackground: true,
        deviceName: options.deviceName || '',
        margins: options.margins || { marginType: 'default' },
        landscape: options.landscape || false,
        pagesPerSheet: 1,
        collate: true,
        copies: options.copies || 1,
      },
      (success, failureReason) => {
        if (!success) {
          console.log('Print failed:', failureReason);
        }
      }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
