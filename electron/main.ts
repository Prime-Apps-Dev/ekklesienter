import { app, BrowserWindow, screen, ipcMain, dialog, protocol, net } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register custom protocol as privileged before app is ready
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'local-resource',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            bypassCSP: true,
            stream: true
        }
    }
]);

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

const TEMPLATES_DIR = path.join(app.getPath('userData'), 'templates');

// Ensure templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createMainWindow() {
    mainWindow = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        },
    });

    console.log('Main Process: Main Window Created');
    console.log('Main Process: Preload Path:', path.join(__dirname, 'preload.cjs'));

    if (VITE_DEV_SERVER_URL) {
        mainWindow.webContents.openDevTools();
    }

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
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        },
    });

    console.log('Main Process: Projector Window Created');
    console.log('Main Process: Preload Path:', path.join(__dirname, 'preload.cjs'));

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
    // Error logging for Main Process
    process.on('uncaughtException', (error) => {
        console.error('CRITICAL MAIN PROCESS ERROR:', error);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('UNHANDLED MAIN PROCESS REJECTION:', reason);
    });

    console.log('Main Process: Error Logging Initialized');

    // Register custom protocol for local resources
    protocol.handle('local-resource', async (request) => {
        try {
            const urlStr = request.url;
            const url = new URL(urlStr);
            let filePath = decodeURIComponent(url.pathname);

            if (url.host && url.host !== '' && !url.host.match(/^[a-zA-Z]:$/)) {
                filePath = '/' + url.host + filePath;
            }

            if (process.platform === 'win32') {
                if (filePath.startsWith('/') && filePath.match(/^\/[a-zA-Z]:/)) {
                    filePath = filePath.slice(1);
                }
            } else {
                if (!filePath.startsWith('/')) {
                    filePath = '/' + filePath;
                }
            }

            console.log(`[Protocol] Loading: ${filePath}`);
            return await net.fetch(`file://${filePath}`);
        } catch (error) {
            console.error('[Protocol] Error:', error);
            return new Response('Not Found', { status: 404 });
        }
    });

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

    ipcMain.on('projector-ready', (event, payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('projector-ready', payload);
        }
    });

    ipcMain.on('relay-keydown', (event, payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('relay-keydown', payload);
        }
    });

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

    ipcMain.handle('select-file', async (event, options) => {
        console.log('IPC: select-file called');
        try {
            const result = await dialog.showOpenDialog(mainWindow!, {
                properties: ['openFile'],
                filters: [
                    { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] }
                ],
                ...options
            });
            console.log('IPC: select-file result:', result.filePaths[0]);
            return result.filePaths[0];
        } catch (error) {
            console.error('IPC: select-file error:', error);
            return null;
        }
    });

    ipcMain.handle('select-folder', async () => {
        console.log('IPC: select-folder called');
        try {
            const result = await dialog.showOpenDialog(mainWindow!, {
                properties: ['openDirectory']
            });
            console.log('IPC: select-folder result:', result.filePaths[0]);
            return result.filePaths[0];
        } catch (error) {
            console.error('IPC: select-folder error:', error);
            return null;
        }
    });

    ipcMain.handle('read-directory-recursive', async (event, dirPath) => {
        console.log('IPC: read-directory-recursive called for:', dirPath);

        async function getFiles(dir: string): Promise<string[]> {
            const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
            const files = await Promise.all(dirents.map((dirent: any) => {
                const res = path.resolve(dir, dirent.name);
                return dirent.isDirectory() ? getFiles(res) : res;
            }));
            return files.flat();
        }

        try {
            const allFiles = await getFiles(dirPath);
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
            const imageFiles = allFiles.filter((f: string) =>
                validExtensions.includes(path.extname(f).toLowerCase())
            );

            console.log(`IPC: found ${imageFiles.length} images`);
            return imageFiles.map(f => ({
                id: crypto.randomUUID(),
                name: path.basename(f),
                url: `local-resource://${f.startsWith('/') ? '' : '/'}${f}`
            }));
        } catch (err) {
            console.error('Error reading directory:', err);
            return [];
        }
    });

    ipcMain.handle('read-file-data', async (event, filePath) => {
        console.log('IPC: read-file-data called for:', filePath);
        try {
            const buffer = await fs.promises.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap: Record<string, string> = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp'
            };
            return {
                data: buffer,
                mimeType: mimeMap[ext] || 'application/octet-stream'
            };
        } catch (error) {
            console.error('IPC: read-file-data error:', error);
            return null;
        }
    });

    // --- Template Management IPCs ---

    ipcMain.handle('templates:list', async () => {
        try {
            const files = await fs.promises.readdir(TEMPLATES_DIR);
            return files.filter(f => f.endsWith('.ektmp'));
        } catch (error) {
            console.error('Error listing templates:', error);
            return [];
        }
    });

    ipcMain.handle('templates:read', async (event, filename) => {
        try {
            const filePath = path.join(TEMPLATES_DIR, filename);
            const buffer = await fs.promises.readFile(filePath);
            return buffer;
        } catch (error) {
            console.error('Error reading template:', error);
            return null;
        }
    });

    ipcMain.handle('templates:write', async (event, filename, data) => {
        try {
            const filePath = path.join(TEMPLATES_DIR, filename);
            await fs.promises.writeFile(filePath, Buffer.from(data));
            return true;
        } catch (error) {
            console.error('Error writing template:', error);
            return false;
        }
    });

    ipcMain.handle('templates:delete', async (event, filename) => {
        try {
            const filePath = path.join(TEMPLATES_DIR, filename);
            await fs.promises.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Error deleting template:', error);
            return false;
        }
    });

    ipcMain.handle('templates:get-path', () => TEMPLATES_DIR);
});
