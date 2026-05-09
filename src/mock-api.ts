// Mock window.api for browser-based testing
// This file is only loaded when running outside Electron
if (!(window as any).api) {
  console.log('[mock] Injecting mock window.api')

  // Persistent stores via localStorage
  const load = <T>(key: string, fallback: T): T => {
    try { const d = localStorage.getItem('mock_' + key); return d ? JSON.parse(d) : fallback } catch { return fallback }
  }
  const save = (key: string, val: any) => { try { localStorage.setItem('mock_' + key, JSON.stringify(val)) } catch {} }

  let users = load<{ id: string; username: string; password: string }[]>('users', [])
  let devices = load<any[]>('devices', [])
  let topologies = load<any[]>('topologies', [])
  let commandWhitelist = load<string[]>('whitelist', ['display', 'show', 'enable', 'system-view', 'quit', 'ping', 'traceroute', 'terminal'])
  let execLogs = load<any[]>('execLogs', [])
  let chatHistory = load<any[]>('chatHistory', [])
  let aiConfig = load<any>('aiConfig', null)
  let execMode = load<string>('execMode', 'confirm')
  let adminInitialized = load<boolean>('adminInit', false)

  let currentUser: any = null

  ;(window as any).api = {
    auth: {
      login: async (u: string, p: string, _ck: string, _ci: string) => {
        if (!adminInitialized) return { success: false, error: '请先初始化管理员' }
        const user = users.find(x => x.username === u && x.password === p)
        if (!user) return { success: false, error: '用户名或密码错误' }
        currentUser = user
        return { success: true }
      },
      getCaptchaSvg: async () => {
        return { svg: '<svg><text x="0" y="20" font-size="24">TEST</text></svg>', key: 'mock-key' }
      },
      isFirstRun: async () => !adminInitialized,
      initAdmin: async (u: string, p: string) => {
        users.push({ id: '1', username: u, password: p })
        adminInitialized = true
        save('users', users)
        save('adminInit', true)
        return { success: true }
      },
    },
    device: {
      list: async () => devices.map(d => ({ ...d })),
      create: async (data: any) => {
        const dev = { id: 'dev-' + Date.now(), ...data, createdAt: new Date().toISOString() }
        devices.push(dev); save('devices', devices)
        return dev
      },
      update: async (id: string, data: any) => {
        const idx = devices.findIndex(d => d.id === id)
        if (idx >= 0) { Object.assign(devices[idx], data); save('devices', devices) }
        return { success: true }
      },
      delete: async (id: string) => {
        devices = devices.filter(d => d.id !== id); save('devices', devices)
        return { success: true }
      },
      getById: async (id: string) => devices.find(d => d.id === id) || null,
    },
    topology: {
      list: async () => topologies.map(t => ({ id: t.id, name: t.name })),
      getById: async (id: string) => topologies.find(t => t.id === id) || null,
      create: async (data: any) => {
        const topo = { id: 'topo-' + Date.now(), name: data.name, nodes: [], edges: [], status: 'active', createdAt: new Date().toISOString() }
        topologies.push(topo); save('topologies', topologies)
        return topo
      },
      update: async (id: string, data: any) => {
        const idx = topologies.findIndex(t => t.id === id)
        if (idx >= 0) { Object.assign(topologies[idx], data); save('topologies', topologies) }
        return { success: true }
      },
      delete: async (id: string) => {
        topologies = topologies.filter(t => t.id !== id); save('topologies', topologies)
        return { success: true }
      },
      exportJson: async (id: string) => {
        const t = topologies.find(t => t.id === id)
        return t ? JSON.stringify(t, null, 2) : ''
      },
      importJson: async (jsonStr: string) => {
        const data = JSON.parse(jsonStr)
        const topo = { id: 'topo-' + Date.now(), name: data.name || 'Imported', nodes: data.nodes || [], edges: data.edges || [], status: 'active' }
        topologies.push(topo); save('topologies', topologies)
        return topo
      },
    },
    connection: {
      sshConnect: async (_deviceId: string) => ({ sessionId: 'mock-session' }),
      telnetConnect: async (_deviceId: string) => ({ sessionId: 'mock-session' }),
      openWeb: async (_url: string) => ({ success: true }),
      disconnect: async (_sessionId: string) => ({ success: true }),
      onData: (_sid: string, _cb: (data: string) => void) => {},
      write: async (_sid: string, _data: string) => ({ success: true }),
    },
    ai: {
      chat: async (_messages: any[], _deviceId?: string) => '这是 AI 模拟回复。当前为浏览器测试模式，不会执行实际命令。',
      discoverTopology: async (_deviceIds: string[]) => ({ nodes: [], edges: [], failedDevices: [] }),
      getConfig: async () => aiConfig ? { ...aiConfig, apiKey: '****test' } : null,
      saveConfig: async (config: any) => { aiConfig = { ...aiConfig, ...config }; save('aiConfig', aiConfig); return { success: true } },
      getCommandWhitelist: async () => [...commandWhitelist],
      saveCommandWhitelist: async (list: string[]) => { commandWhitelist = [...list]; save('whitelist', commandWhitelist); return { success: true } },
      getExecMode: async () => execMode,
      setExecMode: async (mode: string, _password: string) => { execMode = mode; save('execMode', execMode); return { success: true } },
      confirmCommand: async (_execId: string, _approved: boolean) => ({ success: true }),
      getLogs: async (_limit?: number) => [...execLogs],
      getChatHistory: async () => [...chatHistory],
    },
  }
}
