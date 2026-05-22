import { ipcMain } from 'electron'
import { ARPCollector } from '../services/arpCollector'
import { IPStatusService } from '../services/ipStatusService'
import { AnomalyService } from '../services/anomalyService'
import { getDatabase } from '../database/connection'

export function registerArpIpc() {
  ipcMain.handle('arp:collectFromDevice', async (_e, deviceId: string) => {
    const { getDeviceById } = await import('../services/device')
    const device = getDeviceById(deviceId)
    if (!device) throw new Error('设备不存在')
    const collector = new ARPCollector()
    const result = await collector.collectFromDevice(device)

    if (result.entries.length > 0) {
      const db = getDatabase()
      const collectionTime = IPStatusService.beginCollection()
      const stmt = db.prepare('INSERT INTO arp_entries (device_id, ip, mac, vlan, interface, collected_at) VALUES (?, ?, ?, ?, ?, ?)')
      for (const entry of result.entries) {
        try { stmt.run(result.deviceId, entry.ip, entry.mac, entry.vlan || null, entry.interface || null, result.collectedAt) } catch { /* ignore dup */ }
      }
      IPStatusService.batchUpdateIPStatus(result.entries.map(e => ({ ip: e.ip, mac: e.mac })), collectionTime)
      AnomalyService.processARPEntries(result.entries)
      IPStatusService.endCollection(collectionTime)
    }
    return result
  })

  ipcMain.handle('arp:collectFromAll', async () => {
    const results = await ARPCollector.collectFromAll()
    const db = getDatabase()
    const collectionTime = IPStatusService.beginCollection()
    let totalEntries = 0, totalChanges = 0

    for (const result of results) {
      if (result.error || result.entries.length === 0) continue
      totalEntries += result.entries.length
      const stmt = db.prepare('INSERT INTO arp_entries (device_id, ip, mac, vlan, interface, collected_at) VALUES (?, ?, ?, ?, ?, ?)')
      for (const entry of result.entries) {
        try { stmt.run(result.deviceId, entry.ip, entry.mac, entry.vlan || null, entry.interface || null, result.collectedAt) } catch { /* ignore dup */ }
      }
      IPStatusService.batchUpdateIPStatus(result.entries.map(e => ({ ip: e.ip, mac: e.mac })), collectionTime)
      totalChanges += AnomalyService.processARPEntries(result.entries).length
    }
    const deprecatedCount = IPStatusService.endCollection(collectionTime)
    return { results, stats: { entries: totalEntries, changes: totalChanges, deprecated: deprecatedCount } }
  })
}
