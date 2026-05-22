import { getDatabase } from '../database/connection'

export class OUIService {
  static getVendor(mac: string): string {
    if (!mac) return 'Unknown'
    const db = getDatabase()
    const normalizedMac = mac.replace(/[:\-\.]/g, '').toUpperCase()
    const oui = normalizedMac.substring(0, 6)
    const row = db.prepare('SELECT vendor_name FROM oui_database WHERE oui_prefix = ?').get(oui) as { vendor_name: string } | undefined
    return row?.vendor_name || 'Unknown'
  }

  static getAll(): any[] {
    const db = getDatabase()
    return db.prepare('SELECT id, oui_prefix, vendor_name, is_custom, created_at, updated_at FROM oui_database ORDER BY vendor_name, oui_prefix').all()
  }

  static search(keyword: string): any[] {
    const db = getDatabase()
    return db.prepare('SELECT id, oui_prefix, vendor_name, is_custom, created_at, updated_at FROM oui_database WHERE oui_prefix LIKE ? OR vendor_name LIKE ? ORDER BY vendor_name, oui_prefix')
      .all(`%${keyword}%`, `%${keyword}%`)
  }

  static getById(id: number): any {
    return getDatabase().prepare('SELECT id, oui_prefix, vendor_name, is_custom, created_at, updated_at FROM oui_database WHERE id = ?').get(id)
  }

  static add(input: { ouiPrefix: string; vendorName: string }): any {
    const db = getDatabase()
    const normalizedPrefix = input.ouiPrefix.replace(/[:\-\.]/g, '').toUpperCase()
    if (!/^[0-9A-F]{6}$/.test(normalizedPrefix)) throw new Error('OUI 前缀格式无效，需要6位十六进制字符')
    const result = db.prepare('INSERT INTO oui_database (oui_prefix, vendor_name, is_custom) VALUES (?, ?, 1)').run(normalizedPrefix, input.vendorName)
    return this.getById(result.lastInsertRowid)
  }

  static addBatch(entries: Array<{ ouiPrefix: string; vendorName: string }>): number {
    const db = getDatabase()
    let count = 0
    const insert = db.prepare('INSERT OR REPLACE INTO oui_database (oui_prefix, vendor_name, is_custom) VALUES (?, ?, 1)')
    for (const entry of entries) {
      const normalizedPrefix = entry.ouiPrefix.replace(/[:\-\.]/g, '').toUpperCase()
      if (/^[0-9A-F]{6}$/.test(normalizedPrefix)) { insert.run(normalizedPrefix, entry.vendorName); count++ }
    }
    return count
  }

  static update(input: { id: number; ouiPrefix?: string; vendorName?: string }): any {
    const db = getDatabase()
    const updates: string[] = []
    const values: any[] = []
    if (input.ouiPrefix !== undefined) {
      const normalizedPrefix = input.ouiPrefix.replace(/[:\-\.]/g, '').toUpperCase()
      if (!/^[0-9A-F]{6}$/.test(normalizedPrefix)) throw new Error('OUI 前缀格式无效')
      updates.push('oui_prefix = ?'); values.push(normalizedPrefix)
    }
    if (input.vendorName !== undefined) { updates.push('vendor_name = ?'); values.push(input.vendorName) }
    if (updates.length === 0) return this.getById(input.id)
    updates.push('updated_at = CURRENT_TIMESTAMP'); values.push(input.id)
    db.prepare(`UPDATE oui_database SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(input.id)
  }

  static delete(id: number): void {
    const result = getDatabase().prepare('DELETE FROM oui_database WHERE id = ? AND is_custom = 1').run(id)
    if (result.changes === 0) throw new Error('无法删除系统预设的 OUI 条目')
  }

  static deleteBatch(ids: number[]): number {
    const db = getDatabase()
    const placeholders = ids.map(() => '?').join(',')
    return db.prepare(`DELETE FROM oui_database WHERE id IN (${placeholders}) AND is_custom = 1`).run(...ids).changes
  }

  static getAllVendors(): string[] {
    const rows = getDatabase().prepare('SELECT DISTINCT vendor_name FROM oui_database ORDER BY vendor_name').all() as any[]
    return rows.map((r: any) => r.vendor_name)
  }

  static getStats(): { total: number; custom: number; vendors: number } {
    const db = getDatabase()
    const total = (db.prepare('SELECT COUNT(*) as count FROM oui_database').get() as any).count
    const custom = (db.prepare('SELECT COUNT(*) as count FROM oui_database WHERE is_custom = 1').get() as any).count
    const vendors = (db.prepare('SELECT COUNT(DISTINCT vendor_name) as count FROM oui_database').get() as any).count
    return { total, custom, vendors }
  }
}
