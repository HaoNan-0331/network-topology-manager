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
    onData: (sid: string, cb: (data: string) => void) => {
      ipcRenderer.on(`connection:data:${sid}`, (_e, data) => cb(data))
    },
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
