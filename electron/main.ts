import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/connection'
import { createTables } from './database/init'
import { getOrCreateMasterKey } from './utils/keyManager'
import { generateCaptcha, login, isFirstRun, initAdmin } from './services/auth'
import { setDeviceMasterKey, listDevices, createDevice, updateDevice, deleteDevice, getDeviceById } from './services/device'

let mainWindow: BrowserWindow | null = null
let masterKey: string

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1024, minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  masterKey = getOrCreateMasterKey()
  setDeviceMasterKey(masterKey)
  initDatabase()
  createTables()

  // Auth IPC
  ipcMain.handle('auth:getCaptcha', () => { const r = generateCaptcha(); return { svg: r.svg, key: r.key } })
  ipcMain.handle('auth:login', (_e, u, p, ck, ci) => login(u, p, ck, ci))
  ipcMain.handle('auth:isFirstRun', () => isFirstRun())
  ipcMain.handle('auth:initAdmin', (_e, u, p) => initAdmin(u, p))

  // Device IPC
  ipcMain.handle('device:list', () => listDevices())
  ipcMain.handle('device:create', (_e, data) => createDevice(data))
  ipcMain.handle('device:update', (_e, id, data) => updateDevice(id, data))
  ipcMain.handle('device:delete', (_e, id) => deleteDevice(id))
  ipcMain.handle('device:getById', (_e, id) => getDeviceById(id))

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

app.on('before-quit', () => closeDatabase())
