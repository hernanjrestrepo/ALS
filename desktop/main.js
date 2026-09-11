const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const APP_URL = 'https://als.paradixe.xyz';

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'ALS Xmart',
        icon: path.join(__dirname, 'build', 'icon.png'),
        backgroundColor: '#ffffff',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    win.setMenuBarVisibility(false);

    // Los links que abren en pestaña nueva (target="_blank") se abren en el
    // navegador normal del sistema, no en una ventana de Electron sin controles.
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    win.loadURL(APP_URL);

    return win;
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
