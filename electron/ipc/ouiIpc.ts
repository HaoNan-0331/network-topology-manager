import { ipcMain } from 'electron'
import { OUIService } from '../services/ouiService'

export function registerOuiIpc() {
  ipcMain.handle('oui:getAll', () => OUIService.getAll())
  ipcMain.handle('oui:search', (_e, keyword: string) => OUIService.search(keyword))
  ipcMain.handle('oui:getById', (_e, id: number) => OUIService.getById(id))
  ipcMain.handle('oui:add', (_e, data: any) => OUIService.add(data))
  ipcMain.handle('oui:addBatch', (_e, entries: any[]) => OUIService.addBatch(entries))
  ipcMain.handle('oui:update', (_e, data: any) => OUIService.update(data))
  ipcMain.handle('oui:delete', (_e, id: number) => OUIService.delete(id))
  ipcMain.handle('oui:deleteBatch', (_e, ids: number[]) => OUIService.deleteBatch(ids))
  ipcMain.handle('oui:getVendor', (_e, mac: string) => OUIService.getVendor(mac))
  ipcMain.handle('oui:getAllVendors', () => OUIService.getAllVendors())
  ipcMain.handle('oui:getStats', () => OUIService.getStats())
}
