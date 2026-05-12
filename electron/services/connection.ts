import { BrowserWindow, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import net from 'net'
import iconv from 'iconv-lite'
import { Client, type ConnectConfig, type ClientChannel } from 'ssh2'
import { getDeviceById, setDeviceMasterKey } from './device'

interface DeviceInfo {
  id: string
  name: string
  ipAddress: string
  connectionType: string
  port: number | null
  username: string
  password: string
  sshKeyPath: string
  sshKeyContent: string
  webUrl: string
}

interface ActiveSession {
  id: string
  client: Client | net.Socket
  window: BrowserWindow
  stream: { write: (data: string | Buffer) => void; end: () => void } | null
}

const sessions = new Map<string, ActiveSession>()
const windowSessionMap = new Map<number, string>() // webContents.id -> sessionId
let sessionCounter = 0

export function setConnectionMasterKey(key: string) {
  setDeviceMasterKey(key)
}

export function openTerminal(deviceId: string): { sessionId: string } {
  const device = getDeviceById(deviceId) as DeviceInfo | null
  if (!device) throw new Error('设备不存在')

  if (device.connectionType === 'web') {
    if (device.webUrl) openWebSafe(device.webUrl)
    return { sessionId: '' }
  }

  const sessionId = `session_${++sessionCounter}_${Date.now()}`

  const termWin = new BrowserWindow({
    width: 900,
    height: 600,
    title: `终端 - ${device.name} (${device.ipAddress})`,
    webPreferences: {
      preload: path.join(__dirname, 'terminal-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  termWin.setMenu(null)

  const webContentsId = termWin.webContents.id
  windowSessionMap.set(webContentsId, sessionId)

  termWin.on('closed', () => {
    windowSessionMap.delete(webContentsId)
    disconnectSession(sessionId)
  })

  // Wait for window to finish loading before starting connection
  termWin.webContents.on('did-finish-load', () => {
    if (device.connectionType === 'ssh') {
      connectSSH(sessionId, device, termWin)
    } else if (device.connectionType === 'telnet') {
      connectTelnet(sessionId, device, termWin)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    termWin.loadURL('http://localhost:5173/terminal.html')
  } else {
    termWin.loadFile(path.join(__dirname, '../dist/terminal.html'))
  }

  return { sessionId }
}

export function openWebSafe(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`不支持的协议: ${parsed.protocol}`)
    }
    shell.openExternal(url)
  } catch {
    throw new Error('无效的 URL')
  }
}

function decodeBuffer(data: Buffer): string {
  // Try UTF-8 first; if it contains invalid sequences, fall back to GBK
  const text = data.toString('utf-8')
  if (!text.includes('\ufffd')) return text
  return iconv.decode(data, 'gbk')
}

function connectSSH(sessionId: string, device: DeviceInfo, termWin: BrowserWindow) {
  const client = new Client()

  const config: ConnectConfig = {
    host: device.ipAddress,
    port: device.port || 22,
    username: device.username || 'root',
    readyTimeout: 10000,
    algorithms: {
      kex: [
        'ecdh-sha2-nistp256',
        'ecdh-sha2-nistp384',
        'ecdh-sha2-nistp521',
        'diffie-hellman-group-exchange-sha256',
        'diffie-hellman-group14-sha256',
        'diffie-hellman-group15-sha512',
        'diffie-hellman-group16-sha512',
        'diffie-hellman-group-exchange-sha1',
        'diffie-hellman-group14-sha1',
        'diffie-hellman-group1-sha1',
      ],
      cipher: [
        'aes128-gcm@openssh.com',
        'aes256-gcm@openssh.com',
        'aes128-ctr',
        'aes192-ctr',
        'aes256-ctr',
        'aes128-cbc',
        'aes192-cbc',
        'aes256-cbc',
        '3des-cbc',
        'blowfish-cbc',
      ],
      serverHostKey: [
        'ssh-rsa',
        'rsa-sha2-256',
        'rsa-sha2-512',
        'ecdsa-sha2-nistp256',
        'ecdsa-sha2-nistp384',
        'ecdsa-sha2-nistp521',
        'ssh-ed25519',
        'ssh-dss',
      ],
    },
  }

  // SSH Key auth priority
  if (device.sshKeyContent) {
    config.privateKey = Buffer.from(device.sshKeyContent)
  } else if (device.sshKeyPath) {
    config.privateKey = fs.readFileSync(device.sshKeyPath)
  } else {
    config.password = device.password
  }

  client.on('ready', () => {
    client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err: Error | undefined, stream: ClientChannel) => {
      if (err) {
        if (!termWin.isDestroyed()) {
          termWin.webContents.send('terminal:data', `\r\nSSH错误: ${err.message}\r\n`)
        }
        client.end()
        return
      }

      sessions.set(sessionId, { id: sessionId, client, window: termWin, stream })

      if (!termWin.isDestroyed()) {
        termWin.webContents.send('terminal:data', `已连接到 ${device.name} (${device.ipAddress})\r\n`)
      }

      stream.on('data', (data: Buffer) => {
        if (!termWin.isDestroyed()) {
          termWin.webContents.send('terminal:data', decodeBuffer(data))
        }
      })
      stream.stderr.on('data', (data: Buffer) => {
        if (!termWin.isDestroyed()) {
          termWin.webContents.send('terminal:data', decodeBuffer(data))
        }
      })
      stream.on('close', () => {
        if (!termWin.isDestroyed()) {
          termWin.webContents.send('terminal:data', '\r\n连接已关闭\r\n')
        }
        client.end()
      })
    })
  })

  client.on('error', (err: Error) => {
    if (!termWin.isDestroyed()) {
      termWin.webContents.send('terminal:data', `\r\n连接错误: ${err.message}\r\n`)
    }
    client.end()
  })

  client.connect(config)
}

function connectTelnet(sessionId: string, device: DeviceInfo, termWin: BrowserWindow) {
  const socket = net.createConnection({
    host: device.ipAddress,
    port: device.port || 23,
  })

  socket.on('connect', () => {
    sessions.set(sessionId, { id: sessionId, client: socket, window: termWin, stream: socket })
    if (!termWin.isDestroyed()) {
      termWin.webContents.send('terminal:data', `已连接到 ${device.name} (${device.ipAddress})\r\n`)
    }
  })

  socket.on('data', (data: Buffer) => {
    if (!termWin.isDestroyed()) {
      termWin.webContents.send('terminal:data', iconv.decode(data, 'gbk'))
    }
  })

  socket.on('error', (err: Error) => {
    if (!termWin.isDestroyed()) {
      termWin.webContents.send('terminal:data', `\r\n连接错误: ${err.message}\r\n`)
    }
  })

  socket.on('close', () => {
    if (!termWin.isDestroyed()) {
      termWin.webContents.send('terminal:data', '\r\n连接已关闭\r\n')
    }
  })
}

export function writeToSession(sessionId: string, data: string) {
  const session = sessions.get(sessionId)
  if (!session || !session.stream) return
  session.stream.write(data)
}

export function writeByWebContentsId(webContentsId: number, data: string) {
  const sessionId = windowSessionMap.get(webContentsId)
  if (!sessionId) return
  writeToSession(sessionId, data)
}

export function disconnectSession(sessionId: string) {
  const session = sessions.get(sessionId)
  if (!session) return
  if (session.stream) {
    try { session.stream.end() } catch (_e) { /* ignore */ }
  }
  if (session.client instanceof Client) {
    try { session.client.end() } catch (_e) { /* ignore */ }
  } else {
    try { (session.client as net.Socket).destroy() } catch (_e) { /* ignore */ }
  }
  if (!session.window.isDestroyed()) {
    session.window.close()
  }
  sessions.delete(sessionId)
}
