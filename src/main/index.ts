import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { registerAssetsIpc } from './ipc/assets.ipc'
import { registerExportIpc } from './ipc/export.ipc'
import { registerProductsIpc } from './ipc/products.ipc'

const isDev = !app.isPackaged

// Works around a known Electron/Chromium GPU-compositor quirk on Windows where clicks stop
// registering on parts of the page until the window loses and regains focus (e.g. opening and
// closing a native dialog "unsticks" it) — disabling GPU compositing avoids the state that triggers
// it. Must be called before app is ready. The app is form/canvas-heavy, not animation-heavy, so the
// software-rendering cost is not expected to be noticeable.
app.disableHardwareAcceleration()

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('app:getVersion', () => app.getVersion())
  registerAssetsIpc()
  registerExportIpc()
  registerProductsIpc()

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
