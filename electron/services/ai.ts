import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import { Client, type ConnectConfig } from 'ssh2'
import { getDatabase } from '../database/connection'
import { encField, decField } from '../utils/crypto'
import { verifyPasswordSync } from '../utils/crypto'
import { isCommandAllowed } from './commandSafety'
import { createLog, updateLogStatus, getLogs, setAiExecLoggerMasterKey } from './aiExecLogger'

let MK = ''
export function setAiMasterKey(key: string) {
  MK = key
  setAiExecLoggerMasterKey(key)
}

// ---------- Config ----------

export function getAiConfig(): Record<string, string> | null {
  const row = getDatabase()
    .prepare('SELECT * FROM ai_config LIMIT 1')
    .get() as any
  if (!row) return null
  const apiKey = decField(row.api_key_enc, MK)
  return {
    provider: decField(row.provider_enc, MK),
    apiKey,  // used internally by callAI; renderer receives masked version via IPC
    baseUrl: decField(row.base_url_enc, MK),
    modelName: decField(row.model_name_enc, MK),
  }
}

/** Returns config with masked apiKey for renderer process */
export function getAiConfigMasked(): Record<string, string> | null {
  const config = getAiConfig()
  if (!config) return null
  return {
    provider: config.provider,
    apiKey: config.apiKey ? `****${config.apiKey.slice(-4)}` : '',
    baseUrl: config.baseUrl,
    modelName: config.modelName,
  }
}

export function saveAiConfig(config: Record<string, string>): void {
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM ai_config LIMIT 1').get() as any
  if (existing) {
    db.prepare(
      `UPDATE ai_config SET provider_enc=?, api_key_enc=?, base_url_enc=?, model_name_enc=? WHERE id=?`
    ).run(
      encField(config.provider, MK),
      encField(config.apiKey, MK),
      encField(config.baseUrl, MK),
      encField(config.modelName, MK),
      existing.id
    )
  } else {
    const id = uuidv4()
    db.prepare(
      `INSERT INTO ai_config (id, provider_enc, api_key_enc, base_url_enc, model_name_enc) VALUES (?,?,?,?,?)`
    ).run(
      id,
      encField(config.provider, MK),
      encField(config.apiKey, MK),
      encField(config.baseUrl, MK),
      encField(config.modelName, MK)
    )
  }
}

// ---------- Exec mode ----------

export function getExecMode(): string {
  const row = getDatabase()
    .prepare('SELECT exec_mode FROM ai_config LIMIT 1')
    .get() as any
  return row?.exec_mode || 'confirm'
}

export function setExecMode(mode: string, password: string): { success: boolean; error?: string } {
  if (!['confirm', 'auto'].includes(mode)) {
    return { success: false, error: '无效的执行模式' }
  }
  const user = getDatabase()
    .prepare('SELECT password_hash FROM users LIMIT 1')
    .get() as any
  if (!user || !verifyPasswordSync(password, user.password_hash)) {
    return { success: false, error: '密码验证失败' }
  }
  getDatabase()
    .prepare('UPDATE ai_config SET exec_mode = ?')
    .run(mode)
  return { success: true }
}

// ---------- Command whitelist ----------

export function getCommandWhitelist(): string[] {
  const rows = getDatabase()
    .prepare('SELECT pattern FROM command_whitelist ORDER BY pattern')
    .all() as any[]
  return rows.map((r) => r.pattern)
}

export function saveCommandWhitelist(list: string[]): void {
  const db = getDatabase()
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM command_whitelist').run()
    const stmt = db.prepare('INSERT INTO command_whitelist (id, pattern) VALUES (?, ?)')
    for (const pattern of list) {
      stmt.run(uuidv4(), pattern)
    }
  })
  transaction()
}

// ---------- Chat history ----------

export function getChatHistory(): Array<{
  id: string
  role: string
  content: string
  deviceId: string | null
  createdAt: string
}> {
  const rows = getDatabase()
    .prepare('SELECT * FROM chat_history ORDER BY created_at ASC')
    .all() as any[]
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: decField(row.content_enc, MK),
    deviceId: row.device_id,
    createdAt: row.created_at,
  }))
}

function saveChatMessage(
  role: string,
  content: string,
  deviceId: string | null
): void {
  const id = uuidv4()
  getDatabase().prepare(
    'INSERT INTO chat_history (id, role, content_enc, device_id) VALUES (?, ?, ?, ?)'
  ).run(id, role, encField(content, MK), deviceId || null)
}

// ---------- AI API call ----------

async function callAI(
  config: Record<string, string>,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI API 错误 (${response.status}): ${text}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// ---------- SSH execution ----------

function executeCommandOnDevice(
  device: any,
  command: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new Client()
    const cfg: ConnectConfig = {
      host: device.ipAddress,
      port: device.port || 22,
      username: device.username || 'root',
      readyTimeout: 10000,
    }
    if (device.sshKeyContent) {
      cfg.privateKey = Buffer.from(device.sshKeyContent)
    } else if (device.sshKeyPath) {
      cfg.privateKey = fs.readFileSync(device.sshKeyPath)
    } else {
      cfg.password = device.password
    }

    // Execution timeout (30s)
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        client.end()
        reject(new Error('命令执行超时 (30s)'))
      }
    }, 30000)

    client.on('ready', () => {
      client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer)
          client.end()
          if (!settled) { settled = true; reject(err) }
          return
        }
        let output = ''
        stream.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.stderr.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.on('close', () => {
          clearTimeout(timer)
          client.end()
          if (!settled) { settled = true; resolve(output) }
        })
      })
    })
    client.on('error', (err) => {
      clearTimeout(timer)
      if (!settled) { settled = true; reject(err) }
    })
    client.connect(cfg)
  })
}

// ---------- Device query helper ----------

function getDeviceByIdInternal(id: string): any {
  const row = getDatabase()
    .prepare('SELECT * FROM devices WHERE id = ?')
    .get(id) as any
  if (!row) return null
  return {
    id: row.id,
    name: decField(row.name_enc, MK),
    vendor: decField(row.vendor_enc, MK),
    model: decField(row.model_enc, MK),
    version: decField(row.version_enc, MK),
    ipAddress: decField(row.ip_enc, MK),
    connectionType: row.connection_type,
    port: decField(row.port_enc, MK) ? parseInt(decField(row.port_enc, MK)) : null,
    username: decField(row.username_enc, MK),
    password: decField(row.password_enc, MK),
    sshKeyPath: decField(row.ssh_key_path_enc, MK),
    sshKeyContent: decField(row.ssh_key_content_enc, MK),
  }
}

// ---------- Pending command store (for confirm mode) ----------

const pendingCommands = new Map<
  string,
  {
    deviceId: string
    deviceName: string
    command: string
    aiReason: string
    mode: string
    resolve: (result: string) => void
    reject: (err: Error) => void
  }
>()

export async function confirmCommand(
  execId: string,
  approved: boolean
): Promise<void> {
  const pending = pendingCommands.get(execId)
  if (!pending) throw new Error('未找到待确认命令')
  pendingCommands.delete(execId)

  if (!approved) {
    updateLogStatus(execId, 'rejected')
    pending.resolve('用户拒绝了该命令的执行。')
    return
  }

  updateLogStatus(execId, 'approved')
  const device = getDeviceByIdInternal(pending.deviceId)
  if (!device) {
    updateLogStatus(execId, 'failed')
    pending.resolve('设备不存在，无法执行命令。')
    return
  }

  try {
    const output = await executeCommandOnDevice(device, pending.command)
    updateLogStatus(execId, 'executed')
    pending.resolve(output)
  } catch (err: any) {
    updateLogStatus(execId, 'failed')
    pending.resolve(`命令执行失败: ${err.message}`)
  }
}

// ---------- Main chat ----------

export async function chat(
  messages: Array<{ role: string; content: string }>,
  deviceId?: string
): Promise<string> {
  const config = getAiConfig()
  if (!config || !config.apiKey) {
    throw new Error('请先配置 AI 服务（API Key 未设置）')
  }

  const whitelist = getCommandWhitelist()
  const execMode = getExecMode()

  // Build system prompt
  let systemPrompt =
    '你是一个网络设备管理AI助手。你可以帮助用户查询网络设备状态、分析网络问题。' +
    '当需要查询设备信息时，请在回复中使用特殊格式标记要执行的命令：\n' +
    '[CMD]命令内容[/CMD]\n' +
    '每个命令单独一行。你可以在命令前后添加解释说明。\n' +
    '注意：只能执行只读查询命令（如 display、show、ping、traceroute），不能执行修改配置的命令。'

  let targetDevice: any = null

  if (deviceId) {
    targetDevice = getDeviceByIdInternal(deviceId)
    if (!targetDevice) throw new Error('设备不存在')
    systemPrompt += `\n\n当前目标设备信息：\n- 名称: ${targetDevice.name}\n- IP: ${targetDevice.ipAddress}\n- 厂商: ${targetDevice.vendor || '未知'}\n- 型号: ${targetDevice.model || '未知'}\n- 版本: ${targetDevice.version || '未知'}`
  }

  const fullMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const aiReply = await callAI(config, fullMessages)

  // Extract [CMD]...[/CMD] blocks (no dotAll flag - single line per command)
  const cmdRegex = /\[CMD\](.*?)\[\/CMD\]/g
  const commands: string[] = []
  let match: RegExpExecArray | null
  while ((match = cmdRegex.exec(aiReply)) !== null) {
    commands.push(match[1].trim())
  }

  // No commands — just return the reply
  if (commands.length === 0 || !targetDevice) {
    saveChatMessage('user', messages[messages.length - 1]?.content || '', deviceId || null)
    saveChatMessage('assistant', aiReply, deviceId || null)
    return aiReply
  }

  // Process commands
  const cmdResults: Array<{ cmd: string; output: string; status: string }> = []

  for (const cmd of commands) {
    const safety = isCommandAllowed(cmd, whitelist)
    const logId = createLog({
      deviceId: targetDevice.id,
      deviceName: targetDevice.name,
      command: cmd,
      status: safety.allowed ? (execMode === 'auto' ? 'approved' : 'pending') : 'rejected',
      mode: execMode,
      aiReason: aiReply.substring(0, 500),
    })

    if (!safety.allowed) {
      cmdResults.push({ cmd, output: `命令被拒绝: ${safety.reason}`, status: 'rejected' })
      continue
    }

    if (execMode === 'confirm') {
      // Return a special response telling the user to confirm
      const confirmResponse = JSON.stringify({
        type: 'confirm_required',
        execId: logId,
        deviceName: targetDevice.name,
        command: cmd,
        aiExplanation: aiReply,
      })
      saveChatMessage('user', messages[messages.length - 1]?.content || '', deviceId || null)
      saveChatMessage('assistant', `等待确认命令: ${cmd}`, deviceId || null)
      return confirmResponse
    }

    // Auto mode — execute directly
    try {
      const output = await executeCommandOnDevice(targetDevice, cmd)
      updateLogStatus(logId, 'executed')
      cmdResults.push({ cmd, output, status: 'executed' })
    } catch (err: any) {
      updateLogStatus(logId, 'failed')
      cmdResults.push({ cmd, output: `执行失败: ${err.message}`, status: 'failed' })
    }
  }

  // Send results back to AI for final analysis
  const resultsText = cmdResults
    .map((r) => `命令: ${r.cmd}\n状态: ${r.status}\n输出:\n${r.output}`)
    .join('\n\n')

  const followUpMessages: Array<{ role: string; content: string }> = [
    ...fullMessages,
    { role: 'assistant', content: aiReply },
    {
      role: 'user',
      content: `以下是在设备 ${targetDevice.name} 上执行命令的结果，请分析并给出总结：\n\n${resultsText}`,
    },
  ]

  const finalReply = await callAI(config, followUpMessages)

  saveChatMessage('user', messages[messages.length - 1]?.content || '', deviceId || null)
  saveChatMessage('assistant', finalReply, deviceId || null)

  return finalReply
}

// ---------- Re-export getLogs ----------

export { getLogs as getAiLogs }
