import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: '#0d0d0f',
    autoHideMenuBar: true,
    title: 'Planner',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Security-first per the development plan.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // The renderer's own URL (dev server or the built index.html) — anything else
  // is an external link that must open in the OS browser, never in-app.
  const appOrigin = process.env['ELECTRON_RENDERER_URL']

  const isExternal = (url: string): boolean => {
    if (url.startsWith('http://localhost') || url.startsWith('file://')) return false
    if (appOrigin && url.startsWith(appOrigin)) return false
    return /^https?:\/\//i.test(url)
  }

  // target="_blank" / window.open → OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Plain <a href> clicks navigate the window in place; intercept and redirect
  // external ones to the OS browser so the app never gets replaced.
  win.webContents.on('will-navigate', (event, url) => {
    if (isExternal(url)) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
