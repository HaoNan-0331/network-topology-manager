import { ipcMain } from 'electron'
import { ExportService } from '../services/exportService'

export function registerExportIpc() {
  ipcMain.handle('export:arpTable', () => ExportService.exportARPTable())
  ipcMain.handle('export:changes', (_e, unacknowledgedOnly?: boolean) => ExportService.exportChanges(unacknowledgedOnly))
  ipcMain.handle('export:networkUsage', (_e, networkId?: number) => ExportService.exportNetworkUsage(networkId))
}
