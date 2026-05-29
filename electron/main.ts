import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDev = !app.isPackaged

// ── Data persistence ─────────────────────────────────────────────────────────
const dataDir = join(app.getPath('userData'), 'zeenema')
const dataFile = join(dataDir, 'data.json')

// Default project folder: %APPDATA%\.zeenema\projects
const defaultProjectsDir = join(app.getPath('appData'), '.zeenema', 'projects')

function ensureDataDir() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
}

function ensureProjectsDir() {
  if (!existsSync(defaultProjectsDir)) mkdirSync(defaultProjectsDir, { recursive: true })
}

ipcMain.handle('load-data', () => {
  ensureDataDir()
  if (!existsSync(dataFile)) return null
  try {
    return JSON.parse(readFileSync(dataFile, 'utf-8'))
  } catch {
    return null
  }
})

ipcMain.handle('save-data', (_event, data: unknown) => {
  ensureDataDir()
  writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8')
})

// ── Project file operations ───────────────────────────────────────────────────
let currentProjectPath: string | null = null

ipcMain.handle('project-new', () => {
  currentProjectPath = null
  return null
})

ipcMain.handle('project-open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Project',
    filters: [{ name: 'Zeenema Project', extensions: ['znm'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  currentProjectPath = result.filePaths[0]
  try {
    return JSON.parse(readFileSync(currentProjectPath, 'utf-8'))
  } catch {
    return null
  }
})

ipcMain.handle('get-default-projects-dir', () => {
  ensureProjectsDir()
  return defaultProjectsDir
})

ipcMain.handle('project-save-to-dir', async (_event, data: unknown, dirPath: string, fileName: string) => {
  try {
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })
    const filePath = join(dirPath, fileName.endsWith('.znm') ? fileName : fileName + '.znm')
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    currentProjectPath = filePath
    return filePath
  } catch {
    return null
  }
})

ipcMain.handle('project-save', async (_event, data: unknown) => {
  if (!currentProjectPath) {
    // Fall back to Save As
    ensureProjectsDir()
    const result = await dialog.showSaveDialog({
      title: 'Save Project',
      defaultPath: join(defaultProjectsDir, 'project.znm'),
      filters: [{ name: 'Zeenema Project', extensions: ['znm'] }],
    })
    if (result.canceled || !result.filePath) return false
    currentProjectPath = result.filePath
  }
  writeFileSync(currentProjectPath, JSON.stringify(data, null, 2), 'utf-8')
  return true
})

ipcMain.handle('choose-directory', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose Save Location',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('project-save-as', async (_event, data: unknown) => {
  ensureProjectsDir()
  const result = await dialog.showSaveDialog({
    title: 'Save Project As',
    defaultPath: currentProjectPath ?? join(defaultProjectsDir, 'project.znm'),
    filters: [{ name: 'Zeenema Project', extensions: ['znm'] }],
  })
  if (result.canceled || !result.filePath) return false
  currentProjectPath = result.filePath
  writeFileSync(currentProjectPath, JSON.stringify(data, null, 2), 'utf-8')
  return true
})

// ── Window ───────────────────────────────────────────────────────────────────
let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'Zeenema Studio',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
