import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ ├─┬ preload
// │ │ └── index.js
// │ └─┬ renderer
// │   └── index.html

process.env.DIST_ELECTRON = path.join(__dirname, '../dist-electron');
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public');

let mainWindow: BrowserWindow | null;
let projectorWindow: BrowserWindow | null;

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createMainWindow() {
    mainWindow = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
        },
    });

    // Test active push message to Renderer-process
    mainWindow.webContents.on('did-finish-load', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('main-process-message', (new Date).toLocaleString());
        }
    });

    if (VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
    } else {
        // win.loadFile('dist/index.html')
        mainWindow.loadFile(path.join(process.env.DIST, 'index.html'));
    }
}


function createProjectorWindow(displaySettings?: any) {
    if (projectorWindow) {
        if (!projectorWindow.isDestroyed()) {
            projectorWindow.focus();
        } else {
            projectorWindow = null;
        }
        return;
    }

    // ... (rest of creation logic is okay) ...


    // ... Skipping to IPC handlers ...





    const displays = screen.getAllDisplays();
    let display = displays[0];

    if (displaySettings && !displaySettings.autoDefine && displaySettings.presenterDisplayId !== undefined) {
        const targetDisplay = displays.find(d => d.id === displaySettings.presenterDisplayId);
        if (targetDisplay) {
            display = targetDisplay;
        }
    } else {
        const externalDisplay = displays.find((d) => {
            return d.bounds.x !== 0 || d.bounds.y !== 0; // Simple check for secondary
        });
        display = externalDisplay || displays[0]; // Fallback to primary if no secondary
    }

    projectorWindow = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        fullscreen: true,
        autoHideMenuBar: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
        },
    });

    if (VITE_DEV_SERVER_URL) {
        projectorWindow.loadURL(`${VITE_DEV_SERVER_URL}/projector.html`);
    } else {
        projectorWindow.loadFile(path.join(process.env.DIST, 'projector.html'));
    }

    // Reliably notify main window when projector page is loaded (Electron-level event)
    projectorWindow.webContents.on('did-finish-load', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('projector-ready');
        }
    });

    projectorWindow.on('closed', () => {
        projectorWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('projector-closed');
        }
    });
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        mainWindow = null;
        projectorWindow = null;
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

app.whenReady().then(() => {
    createMainWindow();

    ipcMain.handle('open-projector', (event, displaySettings) => {
        createProjectorWindow(displaySettings);
        return true;
    });

    ipcMain.handle('get-displays', () => {
        return screen.getAllDisplays().map(d => ({
            id: d.id,
            label: d.label,
            bounds: d.bounds,
            size: d.size,
            scaleFactor: d.scaleFactor
        }));
    });

    ipcMain.on('projector-command', (event, command, payload) => {
        // Relay command from Controller to Projector
        if (projectorWindow && !projectorWindow.isDestroyed()) {
            projectorWindow.webContents.send('projector-command', command, payload);
        }
    });

    // Relay projector ready state to main window so it can send initial data
    ipcMain.on('projector-ready', (event, payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('projector-ready', payload);
        }
    });

    // Relay navigation commands from Projector to Main window
    ipcMain.on('navigate-verse', (event, direction) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('navigate-verse', direction);
        }
    });

    ipcMain.handle('close-projector', () => {
        if (projectorWindow && !projectorWindow.isDestroyed()) {
            projectorWindow.close();
            projectorWindow = null;
        }
        return true;
    });
});
