# 网络拓扑管理工具 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个 Windows 桌面端网络拓扑管理工具，支持手动/自动拓扑绘制、设备管理、CLI/Web 连接、AI 辅助（含设备查询和安全管控）。

**Architecture:** Electron 主进程负责数据库、加密、SSH/Telnet 连接、文件系统；渲染进程为 React SPA 负责所有 UI；通过 IPC Bridge 安全通信。所有资产数据（设备信息、凭据、拓扑、AI配置）使用字段级 AES-256-GCM 加密，密钥由软件自动生成并安全存储。单用户模式。

**Tech Stack:**
- 桌面框架: Electron 33+ / Node.js 20+
- 前端: React 18 + TypeScript 5 + Vite 6
- 拓扑可视化: React Flow 12
- 终端模拟: xterm.js 5
- SSH: ssh2
- Telnet: telnet-client
- 数据库: better-sqlite3 (字段级加密)
- 状态管理: Zustand
- UI 组件: Ant Design 5
- AI: OpenAI 兼容接口（fetch 直调，一次性返回）
- 构建: electron-builder

---

## 需求确认清单

### 认证与加密
- 单用户模式（一个管理员账号）
- 登录：用户名 + 密码 + 验证码（SVG）
- 首次使用需初始化管理员
- 字段级 AES-256-GCM 加密：设备信息、凭据、拓扑数据、AI 配置、SSH Key 全部加密
- 加密密钥由软件自动生成并安全存储

### 设备管理
- 设备类型：路由器、交换机、防火墙、服务器、通用（各有对应图标）
- 设备名称显示在图标上方悬浮，图标本身不体现名称
- 设备属性：名称、厂商、型号、版本、IP、连接方式
- 连接方式：SSH（密码认证 + SSH Key 认证）、Telnet、Web（外部浏览器）
- SSH Key 支持文件路径和粘贴内容两种方式
- 设备与拓扑 1:1 关系
- 删除设备时级联删除拓扑中的节点和连线

### 拓扑管理
- React Flow 自由布局画布
- 拓扑中的设备图标按类型区分
- 连线时动态输入接口名（弹窗输入源端和目标端接口名）
- 接口标注显示在节点旁（靠近连接点位置）
- 支持 JSON 导入/导出
- 新建/保存/删除/编辑拓扑

### 设备连接
- SSH/Telnet：独立弹窗终端（可拖拽、调整大小）
- Web：用系统默认浏览器打开
- 弹窗中使用 xterm.js 渲染终端

### AI 助手
- 对话界面顶部有设备选择下拉菜单（仅 CLI 设备）
- AI 可主动 SSH 查询选中设备的信息
- AI 自动决定执行什么命令
- 非流式输出，一次性返回
- 对话历史持久化保存
- **命令安全白名单机制**：
  - 默认允许 display/show/enable 等查看类命令
  - 白名单可在系统设置中自定义
  - 严格禁止修改配置类命令
- **执行确认流程**：
  - 默认：AI 决定 → 程序安全检查 → 用户确认 → 执行
  - 可切换为自动执行（需弹窗风险提示 + 再次输入密码）
- 所有 AI 操作日志记录，内置日志查看器

### 拓扑自动发现
- SSH 采集设备信息 + AI 分析
- 支持华为/Cisco/H3C 厂商命令集，自动检测厂商
- 失败设备标记显示，成功部分正常画拓扑
- 失败设备支持修改参数后重新发现或手动连线
- 待确认拓扑支持完整编辑（拖拽、增删连线、移除节点、编辑属性）
- 手动重试

---

## Phase 1: 项目基础搭建

### Task 1: 初始化项目结构

**Files:**
- Create: `package.json`
- Create: `tsconfig.json` / `tsconfig.web.json` / `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.yml`
- Create: `.gitignore`

**Step 1: 初始化 npm 项目**

```bash
cd E:/knowlegdge_base/claude/network_toplogy
npm init -y
```

修改 `package.json`:
```json
{
  "name": "network-topology-manager",
  "version": "0.1.0",
  "description": "网络拓扑管理工具",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.web.json && vite build && tsc -p tsconfig.node.json",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 2: 安装依赖**

```bash
npm install react react-dom reactflow @ant-design/icons antd zustand xterm xterm-addon-fit ssh2 telnet-client better-sqlite3 uuid

npm install -D typescript @types/react @types/react-dom @types/better-sqlite3 @types/uuid vite @vitejs/plugin-react electron electron-builder concurrently wait-on vitest jsdom
```

**Step 3: 创建配置文件**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.web.json" }, { "path": "./tsconfig.node.json" }]
}
```

`tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "dist-electron",
    "rootDir": "electron"
  },
  "include": ["electron"]
}
```

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173 },
})
```

`electron-builder.yml`:
```yaml
appId: com.network-topology.manager
productName: 网络拓扑管理工具
directories:
  output: release
win:
  target: nsis
  icon: public/icon.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

`.gitignore`:
```
node_modules/
dist/
dist-electron/
release/
*.db
*.db-journal
.env
```

**Step 4: 初始化 git**

```bash
git init && git add -A && git commit -m "chore: 初始化项目结构和配置"
```

---

### Task 2: Electron 主进程骨架

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

`electron/main.ts`:
```typescript
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

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

// === 所有 IPC handlers 将在后续 Task 中逐步添加 ===

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
```

`electron/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  auth: {
    login: (u: string, p: string, ck: string, ci: string) => ipcRenderer.invoke('auth:login', u, p, ck, ci),
    getCaptchaSvg: () => ipcRenderer.invoke('auth:getCaptcha'),
    isFirstRun: () => ipcRenderer.invoke('auth:isFirstRun'),
    initAdmin: (u: string, p: string) => ipcRenderer.invoke('auth:initAdmin', u, p),
  },
  device: {
    list: () => ipcRenderer.invoke('device:list'),
    create: (data: unknown) => ipcRenderer.invoke('device:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('device:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('device:delete', id),
    getById: (id: string) => ipcRenderer.invoke('device:getById', id),
  },
  topology: {
    list: () => ipcRenderer.invoke('topology:list'),
    getById: (id: string) => ipcRenderer.invoke('topology:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('topology:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('topology:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('topology:delete', id),
    exportJson: (id: string) => ipcRenderer.invoke('topology:exportJson', id),
    importJson: (data: string) => ipcRenderer.invoke('topology:importJson', data),
  },
  connection: {
    sshConnect: (deviceId: string) => ipcRenderer.invoke('connection:ssh', deviceId),
    telnetConnect: (deviceId: string) => ipcRenderer.invoke('connection:telnet', deviceId),
    openWeb: (url: string) => ipcRenderer.invoke('connection:openWeb', url),
    disconnect: (sessionId: string) => ipcRenderer.invoke('connection:disconnect', sessionId),
    onData: (sid: string, cb: (data: string) => void) => { ipcRenderer.on(`connection:data:${sid}`, (_e, data) => cb(data)) },
    write: (sid: string, data: string) => ipcRenderer.invoke('connection:write', sid, data),
  },
  ai: {
    chat: (messages: unknown[], deviceId?: string) => ipcRenderer.invoke('ai:chat', messages, deviceId),
    discoverTopology: (deviceIds: string[]) => ipcRenderer.invoke('ai:discoverTopology', deviceIds),
    getConfig: () => ipcRenderer.invoke('ai:getConfig'),
    saveConfig: (config: unknown) => ipcRenderer.invoke('ai:saveConfig', config),
    getCommandWhitelist: () => ipcRenderer.invoke('ai:getCommandWhitelist'),
    saveCommandWhitelist: (list: string[]) => ipcRenderer.invoke('ai:saveCommandWhitelist', list),
    getExecMode: () => ipcRenderer.invoke('ai:getExecMode'),
    setExecMode: (mode: string, password: string) => ipcRenderer.invoke('ai:setExecMode', mode, password),
    confirmCommand: (execId: string, approved: boolean) => ipcRenderer.invoke('ai:confirmCommand', execId, approved),
    getLogs: (limit?: number) => ipcRenderer.invoke('ai:getLogs', limit),
    getChatHistory: () => ipcRenderer.invoke('ai:getChatHistory'),
  },
}

contextBridge.exposeInMainWorld('api', api)
```

**提交:**
```bash
git add electron/ && git commit -m "feat: 添加 Electron 主进程骨架和 preload 脚本"
```

---

### Task 3: React 渲染进程骨架

**Files:**
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx` (占位)
- Create: `src/styles/global.css`
- Create: `src/types/electron.d.ts`

`index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>网络拓扑管理工具</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ConfigProvider locale={zhCN}><App /></ConfigProvider></React.StrictMode>
)
```

`src/styles/global.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; }
```

`src/types/electron.d.ts`:
```typescript
export interface ElectronAPI {
  auth: {
    login: (u: string, p: string, ck: string, ci: string) => Promise<{ success: boolean; token?: string; error?: string }>
    getCaptchaSvg: () => Promise<{ svg: string; key: string }>
    isFirstRun: () => Promise<boolean>
    initAdmin: (u: string, p: string) => Promise<{ success: boolean; error?: string }>
  }
  device: {
    list: () => Promise<Device[]>
    create: (data: CreateDeviceDTO) => Promise<Device>
    update: (id: string, data: UpdateDeviceDTO) => Promise<Device>
    delete: (id: string) => Promise<void>
    getById: (id: string) => Promise<Device>
  }
  topology: {
    list: () => Promise<TopologyMeta[]>
    getById: (id: string) => Promise<TopologyDetail>
    create: (data: CreateTopologyDTO) => Promise<TopologyMeta>
    update: (id: string, data: UpdateTopologyDTO) => Promise<void>
    delete: (id: string) => Promise<void>
    exportJson: (id: string) => Promise<string>
    importJson: (json: string) => Promise<TopologyMeta>
  }
  connection: {
    sshConnect: (deviceId: string) => Promise<{ sessionId: string }>
    telnetConnect: (deviceId: string) => Promise<{ sessionId: string }>
    openWeb: (url: string) => Promise<void>
    disconnect: (sessionId: string) => Promise<void>
    onData: (sid: string, cb: (data: string) => void) => void
    write: (sid: string, data: string) => Promise<void>
  }
  ai: {
    chat: (messages: Array<{ role: string; content: string }>, deviceId?: string) => Promise<string>
    discoverTopology: (deviceIds: string[]) => Promise<{ nodes: any[]; edges: any[] }>
    getConfig: () => Promise<AIConfig | null>
    saveConfig: (config: AIConfig) => Promise<void>
    getCommandWhitelist: () => Promise<string[]>
    saveCommandWhitelist: (list: string[]) => Promise<void>
    getExecMode: () => Promise<'confirm' | 'auto'>
    setExecMode: (mode: string, password: string) => Promise<{ success: boolean; error?: string }>
    confirmCommand: (execId: string, approved: boolean) => Promise<void>
    getLogs: (limit?: number) => Promise<AIExecLog[]>
    getChatHistory: () => Promise<ChatMessage[]>
  }
}

declare global { interface Window { api: ElectronAPI } }
```

**提交:**
```bash
git add index.html src/ && git commit -m "feat: 添加 React 渲染进程骨架和类型声明"
```

---

## Phase 2: 认证系统 & 加密层

### Task 4: 加密工具 + 密钥管理 + 数据库

**Files:**
- Create: `electron/utils/crypto.ts`
- Create: `electron/utils/keyManager.ts`
- Create: `electron/database/connection.ts`
- Create: `electron/database/init.ts`
- Test: `tests/unit/crypto.test.ts`

**Step 1: 编写加密测试**

`tests/unit/crypto.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hashPassword, verifyPassword } from '../../../electron/utils/crypto'

describe('crypto', () => {
  const key = 'test-key-32-bytes-long-enough!!'

  it('加密解密正确', () => {
    const enc = encrypt('hello', key)
    expect(decrypt(enc, key)).toBe('hello')
  })

  it('每次加密结果不同', () => {
    expect(encrypt('same', key)).not.toBe(encrypt('same', key))
  })

  it('密码哈希验证', async () => {
    const hash = await hashPassword('Pass123!')
    expect(await verifyPassword('Pass123!', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('错误密钥解密失败', () => {
    expect(() => decrypt(encrypt('s', key), 'wrong-key-00000000000000000')).toThrow()
  })
})
```

**Step 2: 实现加密工具**

`electron/utils/crypto.ts`:
```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LEN = 16
const SALT_LEN = 64
const TAG_LEN = 16
const ITERATIONS = 100000

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha512')
}

export function encrypt(plaintext: string, masterKey: string): string {
  const salt = crypto.randomBytes(SALT_LEN)
  const iv = crypto.randomBytes(IV_LEN)
  const key = deriveKey(masterKey, salt)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([salt, iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string, masterKey: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const salt = buf.subarray(0, SALT_LEN)
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN)
  const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN)
  const enc = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN)
  const key = deriveKey(masterKey, salt)
  const dec = crypto.createDecipheriv(ALGORITHM, key, iv)
  dec.setAuthTag(tag)
  return Buffer.concat([dec.update(enc), dec.final()]).toString('utf8')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LEN)
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, 64, 'sha512', (err, dk) => {
      if (err) reject(err)
      resolve(`${salt.toString('base64')}:${dk.toString('base64')}`)
    })
  })
}

export function verifyPasswordSync(password: string, storedHash: string): boolean {
  const [saltB64, hashB64] = storedHash.split(':')
  const salt = Buffer.from(saltB64, 'base64')
  const stored = Buffer.from(hashB64, 'base64')
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, 64, 'sha512')
  return crypto.timingSafeEqual(stored, derived)
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return verifyPasswordSync(password, storedHash)
}

// 字段级加密辅助
export function encField(val: string | null | undefined, key: string): string | null {
  if (!val) return null
  return encrypt(val, key)
}

export function decField(val: string | null | undefined, key: string): string {
  if (!val) return ''
  return decrypt(val, key)
}
```

**Step 3: 密钥管理器（自动生成密钥）**

`electron/utils/keyManager.ts`:
```typescript
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const KEY_FILE = 'master.key'
const KEY_LEN = 32

/**
 * 获取或自动生成主加密密钥
 * 密钥存储在 userData 目录下的 master.key 文件中
 * 首次启动自动生成，后续读取已有密钥
 */
export function getOrCreateMasterKey(): string {
  const keyPath = path.join(app.getPath('userData'), KEY_FILE)

  if (fs.existsSync(keyPath)) {
    const encrypted = fs.readFileSync(keyPath, 'utf8')
    return encrypted
  }

  // 首次运行：生成随机密钥并保存
  const key = crypto.randomBytes(KEY_LEN).toString('base64')
  fs.writeFileSync(keyPath, key, { encoding: 'utf8', mode: 0o600 })
  return key
}
```

**Step 4: 数据库层**

`electron/database/connection.ts`:
```typescript
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'topology.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function closeDatabase() {
  if (db) { db.close(); db = null }
}
```

`electron/database/init.ts`:
```typescript
import { getDatabase } from './connection'

export function createTables() {
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      topology_id TEXT,
      name_enc TEXT NOT NULL,
      vendor_enc TEXT,
      model_enc TEXT,
      version_enc TEXT,
      ip_enc TEXT,
      device_type TEXT DEFAULT 'generic' CHECK(device_type IN ('router','switch','firewall','server','generic')),
      connection_type TEXT CHECK(connection_type IN ('ssh','telnet','web')),
      port_enc TEXT,
      username_enc TEXT,
      password_enc TEXT,
      ssh_key_path_enc TEXT,
      ssh_key_content_enc TEXT,
      web_url_enc TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (topology_id) REFERENCES topologies(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS topologies (
      id TEXT PRIMARY KEY,
      name_enc TEXT NOT NULL,
      data_enc TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','pending','draft')),
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ai_config (
      id TEXT PRIMARY KEY,
      provider_enc TEXT,
      api_key_enc TEXT,
      base_url_enc TEXT,
      model_name_enc TEXT,
      exec_mode TEXT DEFAULT 'confirm' CHECK(exec_mode IN ('confirm','auto')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS command_whitelist (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS ai_exec_logs (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      device_name_enc TEXT,
      command TEXT NOT NULL,
      status TEXT CHECK(status IN ('approved','rejected','pending','executed','failed')),
      mode TEXT CHECK(mode IN ('confirm','auto')),
      ai_reason TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content_enc TEXT NOT NULL,
      device_id TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 默认白名单命令
    INSERT OR IGNORE INTO command_whitelist (id, pattern) VALUES
      ('w1', 'display'),
      ('w2', 'show'),
      ('w3', 'enable'),
      ('w4', 'system-view'),
      ('w5', 'quit'),
      ('w6', 'ping'),
      ('w7', 'traceroute'),
      ('w8', 'terminal');
  `)
}
```

**Step 5: 运行测试**

```bash
npx vitest run tests/unit/crypto.test.ts
```
预期: 4 PASS

**Step 6: 提交**
```bash
git add electron/utils/ electron/database/ tests/ && git commit -m "feat: 添加加密工具、密钥管理器和数据库层"
```

---

### Task 5: 认证服务

**Files:**
- Create: `electron/services/auth.ts`
- Test: `tests/unit/auth.test.ts`
- Modify: `electron/main.ts` (注册 IPC + 初始化 DB)

`electron/services/auth.ts`:
```typescript
import crypto from 'crypto'
import { getDatabase } from '../database/connection'
import { hashPassword, verifyPasswordSync } from '../utils/crypto'

const captchaStore = new Map<string, { text: string; expires: number }>()

export function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let text = ''
  for (let i = 0; i < 4; i++) text += chars[Math.floor(Math.random() * chars.length)]
  const key = crypto.randomUUID()
  captchaStore.set(key, { text, expires: Date.now() + 5 * 60 * 1000 })
  return { svg: renderSvg(text), key, text }
}

export function verifyCaptcha(key: string, input: string): boolean {
  const s = captchaStore.get(key)
  if (!s) return false
  if (Date.now() > s.expires) { captchaStore.delete(key); return false }
  captchaStore.delete(key)
  return s.text.toUpperCase() === input.toUpperCase()
}

export function login(username: string, password: string, captchaKey: string, captchaInput: string) {
  if (!verifyCaptcha(captchaKey, captchaInput)) return { success: false, error: '验证码错误' }
  const db = getDatabase()
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
  if (!user) return { success: false, error: '用户名或密码错误' }
  if (!verifyPasswordSync(password, user.password_hash)) return { success: false, error: '用户名或密码错误' }
  return { success: true, token: crypto.randomUUID() }
}

export function isFirstRun(): boolean {
  return (getDatabase().prepare('SELECT COUNT(*) as c FROM users').get() as any).c === 0
}

export async function initAdmin(username: string, password: string) {
  const db = getDatabase()
  try {
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(crypto.randomUUID(), username, await hashPassword(password))
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return { success: false, error: '用户名已存在' }
    return { success: false, error: '创建失败' }
  }
}

function renderSvg(text: string): string {
  let chars = '', noise = ''
  for (let i = 0; i < text.length; i++) {
    const x = 15 + i * 25, y = 28 + Math.random() * 6 - 3
    chars += `<text x="${x}" y="${y}" font-size="28" fill="rgb(${~~(Math.random()*100)},${~~(Math.random()*100)},${~~(Math.random()*100)})" transform="rotate(${Math.random()*30-15},${x},${y})" font-family="monospace">${text[i]}</text>`
  }
  for (let i = 0; i < 4; i++) noise += `<line x1="${Math.random()*120}" y1="${Math.random()*40}" x2="${Math.random()*120}" y2="${Math.random()*40}" stroke="#aaa" stroke-width="1"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="100%" height="100%" fill="#f0f0f0"/>${noise}${chars}</svg>`
}
```

`electron/main.ts` 中添加初始化和 IPC:
```typescript
import { initDatabase, closeDatabase } from './database/connection'
import { createTables } from './database/init'
import { getOrCreateMasterKey } from './utils/keyManager'
import { generateCaptcha, login, isFirstRun, initAdmin } from './services/auth'

let masterKey: string

app.whenReady().then(() => {
  masterKey = getOrCreateMasterKey()
  initDatabase()
  createTables()

  // Auth IPC
  ipcMain.handle('auth:getCaptcha', () => { const r = generateCaptcha(); return { svg: r.svg, key: r.key } })
  ipcMain.handle('auth:login', (_e, u, p, ck, ci) => login(u, p, ck, ci))
  ipcMain.handle('auth:isFirstRun', () => isFirstRun())
  ipcMain.handle('auth:initAdmin', (_e, u, p) => initAdmin(u, p))

  createWindow()
})

app.on('before-quit', () => closeDatabase())
```

**提交:**
```bash
git add electron/ tests/ && git commit -m "feat: 实现认证服务、验证码和数据库初始化"
```

---

### Task 6: 登录界面 UI

**Files:**
- Create: `src/stores/authStore.ts`
- Create: `src/components/Login.tsx`
- Create: `src/components/InitAdmin.tsx`
- Modify: `src/App.tsx`

（UI 代码与之前计划相同，此处省略重复。关键变更：单用户模式，无用户管理。）

**提交:**
```bash
git add src/ && git commit -m "feat: 实现登录界面和管理员初始化"
```

---

## Phase 3: 主布局与设备管理

### Task 7: 主布局框架

**Files:**
- Create: `src/components/MainLayout.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/pages/*.tsx` (4个占位页)

侧边栏菜单：拓扑管理、设备管理、AI 助手、系统设置（含日志查看器）。

**提交:**
```bash
git add src/ && git commit -m "feat: 实现主布局框架和路由导航"
```

---

### Task 8: 设备管理 CRUD（含设备类型 + SSH Key）

**Files:**
- Create: `src/types/device.ts`
- Create: `electron/services/device.ts`
- Create: `src/components/DeviceForm.tsx`
- Replace: `src/components/pages/DevicesPage.tsx`

`src/types/device.ts`:
```typescript
export type ConnectionType = 'ssh' | 'telnet' | 'web'
export type DeviceType = 'router' | 'switch' | 'firewall' | 'server' | 'generic'

export interface Device {
  id: string
  topologyId: string | null
  name: string
  vendor: string
  model: string
  version: string
  ipAddress: string
  deviceType: DeviceType
  connectionType: ConnectionType
  port: number | null
  username: string
  password: string
  sshKeyPath: string
  sshKeyContent: string
  webUrl: string
  createdAt: string
  updatedAt: string
}

export interface CreateDeviceDTO {
  name: string
  vendor: string
  model: string
  version: string
  ipAddress: string
  deviceType: DeviceType
  connectionType: ConnectionType
  port?: number
  username?: string
  password?: string
  sshKeyPath?: string
  sshKeyContent?: string
  webUrl?: string
}
```

设备服务 `electron/services/device.ts`:
- 所有字段加密存储
- 删除设备时级联清理拓扑中的节点和连线
- 支持 SSH Key 文件路径和内容

设备表单 `src/components/DeviceForm.tsx`:
- 增加设备类型选择（路由器/交换机/防火墙/服务器/通用）
- SSH 连接方式下增加 SSH Key 认证选项（文件路径选择 or 粘贴内容）
- SSH Key 文件选择使用 Electron dialog

**提交:**
```bash
git add src/types/ src/components/ electron/services/ && git commit -m "feat: 实现设备管理（设备类型、SSH Key、级联删除、全字段加密）"
```

---

## Phase 4: 拓扑可视化

### Task 9: React Flow 拓扑画布（设备类型图标 + 动态接口输入）

**Files:**
- Create: `src/types/topology.ts`
- Create: `src/components/topology/TopologyCanvas.tsx`
- Create: `src/components/topology/DeviceNode.tsx` (按设备类型显示不同图标，名称悬浮在上方)
- Create: `src/components/topology/EdgeWithInterfaces.tsx` (接口标注在节点旁)
- Create: `src/components/topology/ConnectionModal.tsx` (连线时弹窗输入接口名)
- Create: `src/assets/device-icons/` (路由器/交换机/防火墙/服务器/通用 SVG 图标)

**设备类型图标方案：**
- 使用内联 SVG 图标，通过 React 组件渲染
- 路由器：带箭头的圆形
- 交换机：多端口矩形
- 防火墙：盾牌形状
- 服务器：机架形状
- 通用：方形设备

**DeviceNode 关键设计：**
- 图标居中显示，按 deviceType 渲染不同 SVG
- 设备名称悬浮在图标**上方**（CSS position: absolute, top: 负值）
- IP 地址显示在图标下方
- 四方向 Handle（top/bottom/left/right）

**提交:**
```bash
git add src/types/topology.ts src/components/topology/ src/assets/ && git commit -m "feat: 实现拓扑画布（设备类型图标、动态接口输入、接口标注在节点旁）"
```

---

### Task 10: 拓扑管理页面（含导入导出）

**Files:**
- Create: `src/components/topology/TopologyToolbar.tsx` (含导入/导出按钮)
- Create: `src/components/topology/AddDeviceModal.tsx`
- Create: `electron/services/topology.ts`
- Replace: `src/components/pages/TopologyPage.tsx`

拓扑服务增加：
- `exportTopology(id)` → 导出 JSON 字符串（解密后）
- `importTopology(json)` → 导入 JSON 并加密存储

工具栏增加：
- 导出按钮 → 保存为 JSON 文件
- 导入按钮 → 选择 JSON 文件导入

**提交:**
```bash
git add src/components/topology/ electron/services/topology.ts src/components/pages/TopologyPage.tsx && git commit -m "feat: 实现拓扑管理页面（新建/保存/删除/导入/导出）"
```

---

## Phase 5: 设备连接

### Task 11: SSH/Telnet/Web 连接（独立弹窗终端 + SSH Key）

**Files:**
- Create: `electron/services/connection.ts`
- Create: `src/components/TerminalWindow.tsx` (独立 BrowserWindow 弹窗)

**独立终端弹窗方案：**
- 双击设备节点时，主进程创建新 BrowserWindow
- 新窗口加载一个独立的终端页面
- 通过 IPC 在主窗口和新窗口间通信
- 支持 SSH Key 认证：优先使用 SSH Key，无则使用密码

`electron/services/connection.ts`:
```typescript
// 创建独立终端窗口
export function openTerminalWindow(deviceId: string, mainWindow: BrowserWindow) {
  const device = getDeviceById(deviceId)
  if (!device) throw new Error('设备不存在')

  const termWin = new BrowserWindow({
    width: 800, height: 500,
    title: `终端 - ${device.name}`,
    webPreferences: {
      preload: path.join(__dirname, 'terminal-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 加载终端页面
  termWin.loadFile(path.join(__dirname, '../dist/terminal.html'))

  // 建立 SSH/Telnet 连接
  if (device.connectionType === 'ssh') {
    connectSSH(device, termWin)
  } else if (device.connectionType === 'telnet') {
    connectTelnet(device, termWin)
  }
}
```

**提交:**
```bash
git add electron/services/connection.ts src/components/TerminalWindow.tsx && git commit -m "feat: 实现独立弹窗终端（SSH Key 支持）和 Web 外部浏览器打开"
```

---

## Phase 6: AI 集成

### Task 12: AI 服务（配置 + 对话 + 设备查询）

**Files:**
- Create: `electron/services/ai.ts`
- Create: `electron/services/commandSafety.ts` (命令安全白名单检查)
- Create: `electron/services/aiExecLogger.ts` (AI 执行日志)
- Replace: `src/components/pages/AIPage.tsx` (含设备选择下拉菜单)
- Replace: `src/components/pages/SettingsPage.tsx`

**命令安全系统 `electron/services/commandSafety.ts`:**
```typescript
/**
 * 白名单模式：仅允许匹配白名单模式的命令
 * 配置存储在 command_whitelist 表中
 */
export function isCommandAllowed(command: string, whitelist: string[]): { allowed: boolean; reason: string } {
  const cmd = command.trim().toLowerCase()

  // 严格禁止的模式（即使白名单中有也拒绝）
  const BLOCKED = [
    /shutdown/i, /no\s+shutdown/i,
    /configure\s+terminal/i, /config\s+t/i,
    /^sys/, /^int\s/,
    /delete/i, /erase/i, /reset/i, /reboot/i, /reload/i,
    /write/i, /save/i, /commit/i,
  ]

  for (const pattern of BLOCKED) {
    if (pattern.test(cmd)) return { allowed: false, reason: `禁止的命令模式: ${pattern.source}` }
  }

  // 检查白名单
  for (const prefix of whitelist) {
    if (cmd.startsWith(prefix.toLowerCase())) return { allowed: true, reason: `匹配白名单: ${prefix}` }
  }

  return { allowed: false, reason: '不在命令白名单中' }
}
```

**AI 对话流程：**
1. 用户选择设备（下拉菜单）
2. 用户输入问题
3. 如果选中了设备：
   a. AI 分析问题，决定需要执行的命令列表
   b. 每条命令经过安全检查
   c. 根据执行模式（confirm/auto）决定是否需要用户确认
   d. 执行命令并收集输出
   e. AI 根据输出回答用户问题
4. 记录所有操作日志

**AI 执行模式管理：**
- 默认 `confirm` 模式
- 切换到 `auto` 需要重新输入密码验证
- 存储在 ai_config 表的 exec_mode 字段

**提交:**
```bash
git add electron/services/ai.ts electron/services/commandSafety.ts electron/services/aiExecLogger.ts src/components/pages/ && git commit -m "feat: 实现 AI 服务（设备查询、命令安全白名单、执行日志）"
```

---

### Task 13: 系统设置页面（白名单配置 + 日志查看器 + 执行模式切换）

**Files:**
- Replace: `src/components/pages/SettingsPage.tsx`
- Create: `src/components/settings/CommandWhitelistEditor.tsx`
- Create: `src/components/settings/AIExecLogViewer.tsx`
- Create: `src/components/settings/ExecModeSwitch.tsx`

**设置页面包含：**
1. **AI 模型配置** - 提供商、API Key、Base URL、模型名称
2. **命令白名单编辑器** - 可增删白名单命令，展示当前白名单
3. **AI 执行模式** - confirm/auto 切换（切换到 auto 需输入密码确认风险）
4. **AI 执行日志** - 表格展示所有 AI 操作记录（时间、设备、命令、状态、原因）
5. **退出登录**

**提交:**
```bash
git add src/components/ && git commit -m "feat: 实现系统设置（白名单编辑、日志查看器、执行模式切换）"
```

---

## Phase 7: 拓扑自动发现

### Task 14: SSH 采集 + AI 分析（华为/Cisco/H3C）

**Files:**
- Create: `electron/services/vendor-commands.ts`
- Create: `electron/services/discovery.ts`
- Create: `src/components/topology/DiscoveryPanel.tsx`
- Modify: `src/components/pages/TopologyPage.tsx` (添加发现入口)

**厂商命令集 `vendor-commands.ts`:**
- 华为：`display version`, `display lldp neighbor brief`, `display arp`, `display ip routing-table`, `display interface brief`
- Cisco：`show version`, `show lldp neighbors detail`, `show cdp neighbors detail`, `show ip arp`, `show ip route`, `show ip interface brief`
- H3C：`display version`, `display lldp neighbor-information list`, `display arp`, `display ip routing-table`, `display interface brief`
- 自动检测：根据设备填写的厂商信息匹配，无则自动检测

**发现流程：**
1. 用户选择设备（Transfer 组件，仅 CLI 设备）
2. 逐台 SSH 登录采集
3. 失败的设备标记为失败状态，成功的继续
4. 发送采集数据给 AI 分析
5. 生成待确认拓扑
6. 用户可编辑（拖拽、增删连线、移除节点、编辑属性）
7. 确认后保存

**DiscoveryPanel 增强：**
- 失败设备列表展示，每台可点击修改参数后重新发现
- 失败设备支持手动在画布上添加连线

**提交:**
```bash
git add electron/services/vendor-commands.ts electron/services/discovery.ts src/components/topology/DiscoveryPanel.tsx && git commit -m "feat: 实现 SSH 采集 + AI 分析拓扑自动发现（支持华为/Cisco/H3C）"
```

---

## 项目结构总览

```
network_toplogy/
├── docs/plans/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── terminal-preload.ts          # 终端弹窗专用 preload
│   ├── database/
│   │   ├── connection.ts
│   │   └── init.ts                  # 含所有表（含日志、白名单、对话历史）
│   ├── services/
│   │   ├── auth.ts
│   │   ├── device.ts
│   │   ├── topology.ts              # 含导入/导出
│   │   ├── connection.ts            # 含独立终端窗口
│   │   ├── ai.ts                    # 含设备查询
│   │   ├── commandSafety.ts         # 命令白名单安全检查
│   │   ├── aiExecLogger.ts          # AI 执行日志
│   │   ├── discovery.ts             # SSH 采集 + AI 分析
│   │   └── vendor-commands.ts       # 厂商命令集
│   └── utils/
│       ├── crypto.ts
│       └── keyManager.ts            # 自动密钥管理
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   ├── electron.d.ts
│   │   ├── device.ts
│   │   └── topology.ts
│   ├── stores/
│   │   └── authStore.ts
│   ├── assets/
│   │   └── device-icons/            # 设备类型 SVG 图标
│   ├── components/
│   │   ├── Login.tsx
│   │   ├── InitAdmin.tsx
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── DeviceForm.tsx           # 含设备类型、SSH Key
│   │   ├── TerminalWindow.tsx       # 独立终端弹窗
│   │   ├── pages/
│   │   │   ├── TopologyPage.tsx
│   │   │   ├── DevicesPage.tsx
│   │   │   ├── AIPage.tsx           # 含设备选择下拉菜单
│   │   │   └── SettingsPage.tsx     # 含白名单、日志、执行模式
│   │   ├── topology/
│   │   │   ├── TopologyCanvas.tsx
│   │   │   ├── DeviceNode.tsx       # 设备类型图标 + 名称悬浮上方
│   │   │   ├── EdgeWithInterfaces.tsx
│   │   │   ├── ConnectionModal.tsx  # 连线时接口输入
│   │   │   ├── TopologyToolbar.tsx  # 含导入/导出
│   │   │   ├── AddDeviceModal.tsx
│   │   │   └── DiscoveryPanel.tsx   # 含失败设备重试
│   │   └── settings/
│   │       ├── CommandWhitelistEditor.tsx
│   │       ├── AIExecLogViewer.tsx
│   │       └── ExecModeSwitch.tsx
│   └── styles/
│       └── global.css
├── tests/unit/
│   ├── crypto.test.ts
│   └── auth.test.ts
├── terminal.html                     # 终端弹窗独立 HTML
├── index.html
├── package.json
└── vite.config.ts / tsconfig*.json / electron-builder.yml / .gitignore
```

## 实施顺序

| Phase | Task | 内容 | 依赖 |
|-------|------|------|------|
| 1 | Task 1 | 项目初始化 | 无 |
| 1 | Task 2 | Electron 主进程 + preload | Task 1 |
| 1 | Task 3 | React 渲染进程骨架 | Task 1 |
| 2 | Task 4 | 加密工具 + 密钥管理 + 数据库 | Task 2 |
| 2 | Task 5 | 认证服务 | Task 4 |
| 2 | Task 6 | 登录界面 UI | Task 5 |
| 3 | Task 7 | 主布局框架 | Task 3, 6 |
| 3 | Task 8 | 设备管理（类型+SSH Key+级联删除） | Task 4, 7 |
| 4 | Task 9 | 拓扑画布（设备图标+动态接口） | Task 7 |
| 4 | Task 10 | 拓扑管理页面（含导入导出） | Task 8, 9 |
| 5 | Task 11 | 设备连接（独立弹窗+SSH Key） | Task 10 |
| 6 | Task 12 | AI 服务（对话+设备查询+白名单+日志） | Task 4, 7 |
| 6 | Task 13 | 系统设置（白名单编辑+日志查看器） | Task 12 |
| 7 | Task 14 | 拓扑自动发现（SSH采集+AI分析） | Task 12, 11 |
