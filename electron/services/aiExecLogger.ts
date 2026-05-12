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
  promptText?: string
  aiResponse?: string
}): string {
  const id = uuidv4()
  getDatabase().prepare(`
    INSERT INTO ai_exec_logs (id, device_id, device_name_enc, command, status, mode, ai_reason, prompt_text, ai_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.deviceId,
    encField(entry.deviceName, MK),
    entry.command,
    entry.status,
    entry.mode,
    entry.aiReason,
    entry.promptText || '',
    entry.aiResponse || ''
  )
  return id
}

export function updateLogStatus(id: string, status: string): void {
  getDatabase()
    .prepare('UPDATE ai_exec_logs SET status = ? WHERE id = ?')
    .run(status, id)
}

export function appendLogAiResponse(id: string, secondPrompt: string, secondResponse: string): void {
  getDatabase()
    .prepare('UPDATE ai_exec_logs SET prompt_text = prompt_text || ? || ?, ai_response = ai_response || ? || ? WHERE id = ?')
    .run(
      '\n\n========== 命令执行后的第二次 AI 调用 ==========\n\n发送给 AI 的 Prompt:\n',
      secondPrompt,
      '\n\nAI 分析结果:\n',
      secondResponse,
      id
    )
}

export function getLogs(limit = 100): Array<{
  id: string
  deviceId: string
  deviceName: string
  command: string
  status: string
  mode: string
  aiReason: string
  promptText: string
  aiResponse: string
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
    promptText: row.prompt_text || '',
    aiResponse: row.ai_response || '',
    createdAt: row.created_at,
  }))
}
