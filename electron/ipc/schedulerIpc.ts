import { ipcMain } from 'electron'
import { SchedulerService } from '../services/schedulerService'

export function registerSchedulerIpc() {
  ipcMain.handle('scheduler:getConfig', () => SchedulerService.getConfig())
  ipcMain.handle('scheduler:updateConfig', (_e, data: any) => SchedulerService.updateConfig(data))
  ipcMain.handle('scheduler:runNow', () => SchedulerService.runNow())
  ipcMain.handle('scheduler:getStatus', () => SchedulerService.getStatus())
}
