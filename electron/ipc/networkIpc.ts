import { ipcMain } from 'electron'
import { NetworkSegmentService } from '../services/networkSegmentService'

export function registerNetworkIpc() {
  ipcMain.handle('network:getAll', () => NetworkSegmentService.getAll())
  ipcMain.handle('network:getById', (_e, id: number) => NetworkSegmentService.getById(id))
  ipcMain.handle('network:create', (_e, data: any) => NetworkSegmentService.create(data))
  ipcMain.handle('network:update', (_e, data: any) => NetworkSegmentService.update(data))
  ipcMain.handle('network:delete', (_e, id: number) => NetworkSegmentService.delete(id))
  ipcMain.handle('network:autoDiscover', () => NetworkSegmentService.autoDiscover())
  ipcMain.handle('network:getIPUsage', (_e, networkId: number) => NetworkSegmentService.getIPUsage(networkId))
  ipcMain.handle('network:getIPDetails', (_e, networkId: number, searchIp?: string, searchMac?: string, sortBy?: string, sortOrder?: string) =>
    NetworkSegmentService.getIPDetails(networkId, searchIp, searchMac, sortBy, sortOrder))
}
