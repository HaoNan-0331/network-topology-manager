export interface AIConfig {
  provider: string
  apiKey: string
  baseUrl: string
  modelName: string
}

export interface AIExecLog {
  id: string
  deviceId: string
  deviceName: string
  command: string
  status: 'approved' | 'rejected' | 'pending' | 'executed' | 'failed'
  mode: 'confirm' | 'auto'
  aiReason: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: string
  content: string
  deviceId: string | null
  createdAt: string
}

export interface ElectronAPI {
  auth: {
    login: (u: string, p: string, ck: string, ci: string) => Promise<{ success: boolean; token?: string; error?: string }>
    getCaptchaSvg: () => Promise<{ svg: string; key: string }>
    isFirstRun: () => Promise<boolean>
    initAdmin: (u: string, p: string) => Promise<{ success: boolean; error?: string }>
  }
  device: {
    list: () => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<void>
    getById: (id: string) => Promise<any>
  }
  topology: {
    list: () => Promise<any[]>
    getById: (id: string) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<void>
    delete: (id: string) => Promise<void>
    exportJson: (id: string) => Promise<string>
    importJson: (json: string) => Promise<any>
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
    discoverTopology: (deviceIds: string[]) => Promise<{ nodes: any[]; edges: any[]; failedDevices: Array<{ deviceId: string; deviceName: string; error: string }> }>
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

export interface TerminalAPI {
  onData: (cb: (data: string) => void) => void
  write: (data: string) => Promise<void>
}

declare global {
  interface Window {
    api: ElectronAPI
    terminalApi: TerminalAPI
  }
}
