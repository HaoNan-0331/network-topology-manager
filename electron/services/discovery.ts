import { v4 as uuidv4 } from 'uuid'
import { getAiConfig, callAI, getDeviceByIdInternal, executeCommandOnDevice } from './ai'
import { getCommandWhitelist } from './ai'
import { isCommandAllowed } from './commandSafety'
import { detectVendor, getDiscoveryCommands, type Vendor } from './vendor-commands'
import { createSystemLog } from './systemLog'

export interface DiscoveryFailedDevice {
  deviceId: string
  deviceName: string
  error: string
}

export interface DiscoveryResult {
  nodes: any[]
  edges: any[]
  failedDevices: DiscoveryFailedDevice[]
}

// Mutex: prevent concurrent discovery
let discoveryInProgress = false

export async function discoverTopology(deviceIds: string[]): Promise<DiscoveryResult> {
  if (discoveryInProgress) throw new Error('已有发现任务在执行中，请等待完成')
  discoveryInProgress = true

  try {
    return await discoverTopologyInner(deviceIds)
  } finally {
    discoveryInProgress = false
  }
}

async function discoverTopologyInner(deviceIds: string[]): Promise<DiscoveryResult> {
  const config = getAiConfig()
  if (!config?.apiKey) throw new Error('请先配置 AI 服务')
  const whitelist = getCommandWhitelist()

  const collectedData: Array<{
    deviceId: string
    deviceName: string
    vendor: Vendor
    outputs: Record<string, string>
  }> = []
  const failedDevices: DiscoveryFailedDevice[] = []

  // Phase 1: Collect data from each device
  for (const deviceId of deviceIds) {
    const device = getDeviceByIdInternal(deviceId)
    if (!device) {
      failedDevices.push({ deviceId, deviceName: '未知', error: '设备不存在' })
      continue
    }
    if (device.connectionType === 'web') {
      failedDevices.push({ deviceId, deviceName: device.name, error: 'Web设备不支持SSH采集' })
      continue
    }

    try {
      // Detect vendor via version command
      let vendorOutput = ''
      try {
        vendorOutput = await executeCommandOnDevice(device, 'display version')
      } catch {
        try {
          vendorOutput = await executeCommandOnDevice(device, 'show version')
        } catch {
          vendorOutput = ''
        }
      }

      const vendor = detectVendor(vendorOutput)
      const commands = getDiscoveryCommands(vendor)
      const outputs: Record<string, string> = { version: vendorOutput }

      // Skip first command (version already collected)
      for (const cmd of commands.slice(1)) {
        try {
          // Safety check even for hardcoded discovery commands
          const safety = isCommandAllowed(cmd, whitelist)
          if (!safety.allowed) {
            outputs[cmd] = `命令被安全策略拒绝: ${safety.reason}`
            continue
          }
          outputs[cmd] = await executeCommandOnDevice(device, cmd)
        } catch (err: any) {
          outputs[cmd] = `执行失败: ${err.message}`
        }
      }

      collectedData.push({ deviceId, deviceName: device.name, vendor, outputs })
    } catch (err: any) {
      failedDevices.push({ deviceId, deviceName: device.name, error: err.message })
    }
  }

  if (collectedData.length === 0) {
    return { nodes: [], edges: [], failedDevices }
  }

  // Phase 2: Send to AI for analysis
  const collectionText = collectedData
    .map((d) => {
      const outputsText = Object.entries(d.outputs)
        .map(([cmd, out]) => `--- ${cmd} ---\n${out}`)
        .join('\n\n')
      return `设备: ${d.deviceName} (ID: ${d.deviceId}, 厂商: ${d.vendor})\n${outputsText}`
    })
    .join('\n\n==========\n\n')

  const systemPrompt = `你是一个网络拓扑分析专家。根据以下从多台网络设备采集的信息，分析它们之间的拓扑连接关系。

请返回严格的JSON格式（不要包含其他文本）：
{
  "nodes": [
    {
      "deviceId": "设备的原始ID",
      "deviceName": "设备名称",
      "position": { "x": 数字, "y": 数字 }
    }
  ],
  "edges": [
    {
      "sourceDeviceId": "源设备ID",
      "targetDeviceId": "目标设备ID",
      "sourceInterface": "源端接口名",
      "targetInterface": "目标端接口名"
    }
  ]
}

分析规则：
1. 根据LLDP/CDP邻居信息确定设备间连接关系
2. 根据ARP表和路由表补充连接关系
3. 为每个节点分配合理的布局位置（分层/星型/树形）
4. 接口名从邻居信息和接口表中提取`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `以下是采集到的设备信息：\n\n${collectionText}` },
  ]

  const promptText = JSON.stringify(messages, null, 2)
  const deviceIdsStr = deviceIds.join(',')
  const deviceNamesStr = collectedData.map((d) => d.deviceName).join(',')

  let aiResponse: string
  try {
    aiResponse = await callAI(config, messages)
  } catch (err: any) {
    createSystemLog({
      type: 'discovery',
      status: 'failed',
      deviceIds: deviceIdsStr,
      deviceNames: deviceNamesStr,
      promptText,
      errorMessage: `AI 调用失败: ${err.message}`,
    })
    throw err
  }

  // Parse AI response — strip markdown code blocks first
  let parsed: any
  try {
    let jsonStr = aiResponse.trim()
    // Remove markdown code fences if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }
    parsed = JSON.parse(jsonStr)

    // Log success
    createSystemLog({
      type: 'discovery',
      status: 'success',
      deviceIds: deviceIdsStr,
      deviceNames: deviceNamesStr,
      promptText,
      aiResponse,
      parsedResult: JSON.stringify(parsed, null, 2),
    })
  } catch (err: any) {
    // Log parse failure
    createSystemLog({
      type: 'discovery',
      status: 'failed',
      deviceIds: deviceIdsStr,
      deviceNames: deviceNamesStr,
      promptText,
      aiResponse,
      errorMessage: `JSON 解析失败: ${err.message}`,
    })
    throw new Error(`AI 分析结果解析失败: ${err.message}`)
  }

  // Convert to TopologyNode[] and TopologyEdge[]
  const nodes = (parsed.nodes || []).map((n: any) => {
    const dev = getDeviceByIdInternal(n.deviceId)
    return {
      id: n.deviceId,
      type: 'deviceNode',
      position: n.position || { x: Math.random() * 600 + 100, y: Math.random() * 400 + 100 },
      data: {
        deviceId: n.deviceId,
        deviceName: n.deviceName,
        deviceType: dev?.deviceType || 'generic',
        ipAddress: dev?.ipAddress || '',
        connectionType: dev?.connectionType || 'ssh',
      },
    }
  })

  const edges = (parsed.edges || []).map((e: any) => ({
    id: uuidv4(),
    source: e.sourceDeviceId,
    target: e.targetDeviceId,
    type: 'edgeWithInterfaces',
    data: {
      sourceInterface: e.sourceInterface || '',
      targetInterface: e.targetInterface || '',
    },
  }))

  return { nodes, edges, failedDevices }
}
