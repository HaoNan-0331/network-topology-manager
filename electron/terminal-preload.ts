import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('terminalApi', {
  onData: (cb: (data: string) => void) => {
    ipcRenderer.on('terminal:data', (_e, data) => cb(data))
  },
  write: (data: string) => ipcRenderer.invoke('terminal:write', data),
})
