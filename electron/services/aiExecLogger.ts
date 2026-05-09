import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database/connection'
import { encField, decField } from '../utils/crypto'

let MK = ''
export function setAiExecLoggerMasterKey(key: string) { MK = key }

export function createLog(entry: {
  deviceId: string
  deviceName: string
  command: string
  status: string
  mode: string
  aiReason: string
}): string {
  const id = uuidv4()
  getDatabase().prepare(`
    INSERT INTO ai_exec_logs (id, device_id, device_name_enc, command, status, mode, ai_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.deviceId,
    encField(entry.deviceName, MK),
    entry.command,
    entry.status,
    entry.mode,
    entry.aiReason
  )
  return id
}

export function updateLogStatus(id: string, status: string): void {
  getDatabase()
    .prepare('UPDATE ai_exec_logs SET status = ? WHERE id = ?')
    .run(status, id)
}

export function getLogs(limit = 100): Array<{
  id: string
  deviceId: string
  deviceName: string
  command: string
  status: string
  mode: string
  aiReason: string
  createdAt: string
}> {
  const rows = getDatabase()
    .prepare('SELECT * FROM ai_exec_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit) as any[]
  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    deviceName: decField(row.device_name_enc, MK),
    command: row.command,
    status: row.status,
    mode: row.mode,
    aiReason: row.ai_reason,
    createdAt: row.created_at,
  }))
}
