import { getDatabase } from '../database/connection'
import { OUIService } from './ouiService'

export class NetworkSegmentService {
  static getAll(): any[] {
    const db = getDatabase()
    return (db.prepare('SELECT id, name, network, mask, cidr, gateway, description, is_auto_discovered, created_at, updated_at FROM network_segments ORDER BY created_at DESC').all() as any[])
      .map(row => ({ ...row, isAutoDiscovered: row.is_auto_discovered === 1 }))
  }

  static getById(id: number): any {
    const row = getDatabase().prepare('SELECT id, name, network, mask, cidr, gateway, description, is_auto_discovered, created_at, updated_at FROM network_segments WHERE id = ?').get(id) as any
    if (!row) return null
    return { ...row, isAutoDiscovered: row.is_auto_discovered === 1 }
  }

  static create(input: { name: string; network: string; mask: string; gateway?: string; description?: string }): any {
    const db = getDatabase()
    const cidr = this.maskToCIDR(input.mask)
    const result = db.prepare('INSERT INTO network_segments (name, network, mask, cidr, gateway, description) VALUES (?, ?, ?, ?, ?, ?)')
      .run(input.name, input.network, input.mask, cidr, input.gateway || null, input.description || null)
    return this.getById(result.lastInsertRowid)
  }

  static update(input: { id: number; name?: string; network?: string; mask?: string; gateway?: string; description?: string }): any {
    const db = getDatabase()
    const updates: string[] = []
    const values: any[] = []
    if (input.name !== undefined) { updates.push('name = ?'); values.push(input.name) }
    if (input.network !== undefined) { updates.push('network = ?'); values.push(input.network) }
    if (input.mask !== undefined) { updates.push('mask = ?', 'cidr = ?'); values.push(input.mask, this.maskToCIDR(input.mask)) }
    if (input.gateway !== undefined) { updates.push('gateway = ?'); values.push(input.gateway) }
    if (input.description !== undefined) { updates.push('description = ?'); values.push(input.description) }
    if (updates.length === 0) return this.getById(input.id)
    updates.push('updated_at = CURRENT_TIMESTAMP'); values.push(input.id)
    db.prepare(`UPDATE network_segments SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(input.id)
  }

  static delete(id: number): void {
    getDatabase().prepare('DELETE FROM network_segments WHERE id = ?').run(id)
  }

  static autoDiscover(): any[] {
    const db = getDatabase()
    const arpEntries = db.prepare('SELECT DISTINCT ip FROM arp_entries ORDER BY ip').all() as any[]
    if (arpEntries.length === 0) return []

    const segments = new Map<string, { ips: string[]; count: number }>()
    for (const entry of arpEntries) {
      const parts = entry.ip.split('.')
      const network = `${parts[0]}.${parts[1]}.${parts[2]}.0`
      if (!segments.has(network)) segments.set(network, { ips: [], count: 0 })
      segments.get(network)!.ips.push(entry.ip)
      segments.get(network)!.count++
    }

    const existingNetworks = new Set(this.getAll().map((s: any) => s.network))
    const discovered: any[] = []

    for (const [network, data] of segments) {
      if (!existingNetworks.has(network) && data.count >= 2) {
        try {
          const result = db.prepare('INSERT INTO network_segments (name, network, mask, cidr, description, is_auto_discovered) VALUES (?, ?, ?, ?, ?, 1)')
            .run(`自动发现-${network}/24`, network, '255.255.255.0', 24, `自动发现，包含 ${data.count} 个IP地址`)
          const segment = this.getById(result.lastInsertRowid)
          if (segment) discovered.push(segment)
        } catch { /* ignore duplicate */ }
      }
    }
    return discovered
  }

  static getIPUsage(networkId: number): { networkId: number; total: number; used: number; available: number; usagePercent: number } {
    const segment = this.getById(networkId)
    if (!segment) return { networkId, total: 0, used: 0, available: 0, usagePercent: 0 }
    const db = getDatabase()
    const total = Math.pow(2, 32 - segment.cidr) - 2
    const networkParts = segment.network.split('.')
    const prefix = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`
    const usedResult = db.prepare("SELECT COUNT(*) as count FROM ip_status WHERE ip LIKE ? AND status = 'used'").get(`${prefix}.%`) as { count: number }
    const used = usedResult.count
    const available = Math.max(0, total - used)
    const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0
    return { networkId, total, used, available, usagePercent }
  }

  static getIPDetails(networkId: number, searchIp?: string, searchMac?: string, sortBy: string = 'ip', sortOrder: string = 'asc'): any[] {
    const segment = this.getById(networkId)
    if (!segment) return []
    const db = getDatabase()
    const networkParts = segment.network.split('.')
    const prefix = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`
    const conditions: string[] = ['ips.ip LIKE ?']
    const params: any[] = [`${prefix}.%`]
    if (searchIp) { conditions.push('ips.ip LIKE ?'); params.push(`%${searchIp}%`) }
    if (searchMac) { conditions.push('ips.mac LIKE ?'); params.push(`%${searchMac}%`) }

    const sortColumnMap: Record<string, string> = { ip: 'ips.ip', mac: 'ips.mac', lastSeen: 'ips.last_seen' }
    const safeSortBy = sortColumnMap[sortBy] || 'ips.ip'
    const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC'

    const query = `SELECT ips.ip, ips.mac, ips.status, ips.last_seen as collectedAt, arp.interface, arp.device_id as deviceName
      FROM ip_status ips
      LEFT JOIN (SELECT ip, interface, device_id, ROW_NUMBER() OVER (PARTITION BY ip ORDER BY collected_at DESC) as rn FROM arp_entries) arp ON arp.ip = ips.ip AND arp.rn = 1
      WHERE ${conditions.join(' AND ')} ORDER BY ${safeSortBy} ${safeSortOrder}`

    return (db.prepare(query).all(...params) as any[]).map(entry => ({
      ip: entry.ip, mac: entry.mac, status: entry.status, lastSeen: entry.collectedAt,
      interface: entry.interface, deviceName: entry.deviceName || undefined,
      macVendor: entry.mac ? (OUIService.getVendor(entry.mac) === 'Unknown' ? undefined : OUIService.getVendor(entry.mac)) : undefined,
    }))
  }

  private static maskToCIDR(mask: string): number {
    return mask.split('.').reduce((cidr, p) => cidr + (parseInt(p, 10).toString(2).match(/1/g) || []).length, 0)
  }
}
