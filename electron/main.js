const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const BackendManager = require('./backend-manager');

// Simple isDev check
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let tray = null;
const backendManager = new BackendManager();

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 190, // Initial card width
    height: 315, // Initial card height
    minWidth: 190,
    minHeight: 315,
    maxWidth: 500,
    maxHeight: 800,
    frame: false, // Remove window frame
    transparent: true, // Make window transparent
    resizable: false, // Disable manual resize (we'll do it programmatically)
    hasShadow: true, // Enable window shadow
    roundedCorners: true, // Enable rounded corners (Windows 11)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false, // Don't show until ready
  });

  // Load the app
  if (isDev) {
    // Development mode - load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(path.join(__dirname, '../figma_project/dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create system tray
 */
function createTray() {
  // Create tray icon (you'll need to add a proper icon file)
  const iconPath = path.join(__dirname, 'tray-icon-new.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Fallback to a simple icon
      trayIcon = nativeImage.createEmpty();
    }
  } catch (error) {
    console.error('Error loading tray icon:', error);
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },
    },
    {
      label: 'Backend Status',
      enabled: false,
      id: 'backend-status',
    },
    { type: 'separator' },
    {
      label: 'Start Backend',
      id: 'start-backend',
      click: async () => {
        await handleStartBackend();
      },
    },
    {
      label: 'Stop Backend',
      id: 'stop-backend',
      click: () => {
        handleStopBackend();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Voice Assistant');

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Update backend status
  updateTrayMenu();
}

/**
 * Update tray menu with backend status
 */
function updateTrayMenu() {
  if (!tray) return;

  const status = backendManager.getStatus();
  
  // Rebuild the menu with updated status
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },
    },
    {
      label: status.isRunning 
        ? `Backend: Running${status.isExternal ? ' (External)' : ''}`
        : 'Backend: Stopped',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Start Backend',
      enabled: !status.isRunning,
      click: async () => {
        await handleStartBackend();
      },
    },
    {
      label: 'Stop Backend',
      enabled: status.isRunning && !status.isExternal,
      click: () => {
        handleStopBackend();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Handle backend start request
 */
async function handleStartBackend() {
  try {
    console.log('Starting backend...');
    const result = await backendManager.start();
    console.log('Backend start result:', result);

    if (result.status === 'error') {
      dialog.showErrorBox('Backend Error', result.message);
      if (mainWindow) {
        mainWindow.webContents.send('backend-status', {
          isRunning: false,
          ...result,
        });
      }
      updateTrayMenu();
      return result;
    }

    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('backend-status', {
        isRunning: true,
        ...result,
      });
    }

    updateTrayMenu();
    return result;
  } catch (error) {
    console.error('Error starting backend:', error);
    dialog.showErrorBox('Backend Error', error.message || 'Unknown error starting backend');
    return { status: 'error', message: error.message };
  }
}

/**
 * Handle backend stop request
 */
function handleStopBackend() {
  const result = backendManager.stop();
  console.log('Backend stop result:', result);
  
  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('backend-status', {
      isRunning: false,
      ...result,
    });
  }
  
  updateTrayMenu();
  return result;
}

// ============================================
// IPC Handlers
// ============================================

ipcMain.handle('backend:start', async () => {
  return await handleStartBackend();
});

ipcMain.handle('backend:stop', () => {
  return handleStopBackend();
});

ipcMain.handle('backend:status', async () => {
  const status = backendManager.getStatus();
  const isRunning = await backendManager.isRunning();
  return { ...status, isRunning };
});

ipcMain.handle('backend:url', () => {
  const status = backendManager.getStatus();
  return status.url;
});

// Window resize handler
ipcMain.on('window:resize', (event, { width, height }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);
    console.log('Resizing window to:', roundedWidth, 'x', roundedHeight);
    mainWindow.setSize(roundedWidth, roundedHeight, true);
    // Force a repaint
    mainWindow.setResizable(false);
  }
});

// Window set min size handler
ipcMain.on('window:set-min-size', (event, { width, height }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setMinimumSize(Math.round(width), Math.round(height));
  }
});

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(async () => {
  createWindow();
  createTray();

  // Auto-start backend
  console.log('Auto-starting backend...');
  await handleStartBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close (run in tray)
  if (process.platform !== 'darwin') {
    // On macOS, keep app running
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  
  // Stop backend if we started it
  backendManager.stop();
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
