import { ipcMain } from 'electron'
import { AnomalyService } from '../services/anomalyService'

export function registerAnomalyIpc() {
  ipcMain.handle('anomaly:getChanges', (_e, unacknowledgedOnly?: boolean, limit?: number) =>
    AnomalyService.getChanges(unacknowledgedOnly, limit))
  ipcMain.handle('anomaly:acknowledge', (_e, id: number, notes?: string) =>
    AnomalyService.acknowledgeChange(id, notes))
  ipcMain.handle('anomaly:acknowledgeAll', () => AnomalyService.acknowledgeAll())
  ipcMain.handle('anomaly:deleteChange', (_e, id: number) => AnomalyService.deleteChange(id))
  ipcMain.handle('anomaly:deleteChanges', (_e, ids: number[]) => AnomalyService.deleteChanges(ids))
  ipcMain.handle('anomaly:getStats', () => AnomalyService.getStats())
  ipcMain.handle('anomaly:getBindingHistory', (_e, ip: string) => AnomalyService.getBindingHistory(ip))
  ipcMain.handle('anomaly:getExcludedIPs', () => AnomalyService.getExcludedIPs())
  ipcMain.handle('anomaly:addExcludedIP', (_e, data: any) => AnomalyService.addExcludedIP(data))
  ipcMain.handle('anomaly:deleteExcludedIP', (_e, id: number) => AnomalyService.deleteExcludedIP(id))
}
