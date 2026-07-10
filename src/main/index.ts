import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { loadEnv } from './services/env'

// Load .env (GEMINI_API_KEY) before anything reads it.
loadEnv()

// App icon lives in build/ at the repo root (../../build relative to out/main).
// .ico gives the crispest Windows taskbar/titlebar; PNG is the cross-platform fallback.
const iconPath = join(
  __dirname,
  '../../build',
  process.platform === 'win32' ? 'icon.ico' : 'icon.png'
)

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
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Security-first per the development plan.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // Zoom shortcuts (no app menu, so wire them up manually):
  //   Ctrl/Cmd + '='/'+'  zoom in · Ctrl/Cmd + '-'  zoom out · Ctrl/Cmd + '0'  reset.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const mod = process.platform === 'darwin' ? input.meta : input.control
    if (!mod) return
    const level = win.webContents.getZoomLevel()
    if (input.key === '=' || input.key === '+') {
      win.webContents.setZoomLevel(Math.min(level + 0.5, 5))
      event.preventDefault()
    } else if (input.key === '-' || input.key === '_') {
      win.webContents.setZoomLevel(Math.max(level - 0.5, -3))
      event.preventDefault()
    } else if (input.key === '0') {
      win.webContents.setZoomLevel(0)
      event.preventDefault()
    }
  })

  // Ctrl/Cmd + mouse wheel to zoom, like a browser.
  win.webContents.on('zoom-changed', (_e, direction) => {
    const level = win.webContents.getZoomLevel()
    win.webContents.setZoomLevel(direction === 'in' ? Math.min(level + 0.5, 5) : Math.max(level - 0.5, -3))
  })

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
  // Ensures Windows groups the app under its own taskbar icon (not Electron's).
  if (process.platform === 'win32') app.setAppUserModelId('com.planner.app')
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
