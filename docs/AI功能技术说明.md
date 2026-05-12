# AI 功能技术说明

## 一、AI API 调用层

两个 AI 功能（助手聊天、拓扑发现）共用同一个 `callAI()` 函数（`electron/services/ai.ts:211-232`）。

### 请求参数

```
POST ${baseUrl}/chat/completions
Headers:
  Content-Type: application/json
  Authorization: Bearer ${apiKey}
Body:
  {
    model: config.modelName,
    messages: [{ role, content }, ...]
  }
```

未设置 `temperature`、`max_tokens`、`top_p` 等参数，全部使用 API 默认值。

---

## 二、AI 助手聊天

**核心文件:** `electron/services/ai.ts` — `chat()` 函数

### 调用链路

```
前端 AIPage.tsx
  → window.api.ai.chat(messages, deviceIds, sessionId)
    → IPC ai:chat
      → chat(messages, deviceIds, sessionId)
```

### System Prompt

```
你是一个网络设备管理AI助手。你可以帮助用户查询网络设备状态、分析网络问题。
当需要查询设备信息时，请在回复中使用特殊格式标记要执行的命令：
[CMD:设备名]命令内容[/CMD]
如果只有一个设备，也可以用 [CMD]命令内容[/CMD]
每个命令单独一行。你可以在命令前后添加解释说明。
注意：只能执行只读查询命令（如 display、show、ping、traceroute），不能执行修改配置的命令。
```

### 动态追加内容（根据选中设备数量）

**单设备时：**

```
当前目标设备信息：
- 名称: xxx
- IP: xxx
- 厂商: xxx
- 型号: xxx
- 版本: xxx
```

**多设备时：**

```
当前目标设备（多台）：
---
- 名称: xxx, IP: xxx, 厂商: xxx, 型号: xxx, 版本: xxx
---
...

你可以在不同设备上执行不同命令，请用 [CMD:设备名] 格式指定在哪台设备上执行。
```

### 第一次 AI 调用

```
messages = [
  { role: "system", content: systemPrompt },
  ...用户历史消息
]
```

### 命令解析

AI 回复后，用正则 `/\[CMD(?::([^\]]+))?\](.*?)\[\/CMD\]/g` 提取命令：

| AI 回复示例 | 解析结果 |
|---|---|
| `[CMD]display arp[/CMD]` | deviceName=空, cmd=`display arp`（单设备时 fallback 到第一台） |
| `[CMD:SW1]display arp[/CMD]` | deviceName=`SW1`, cmd=`display arp` |

设备匹配逻辑：`targetDevices.find(d => d.name === deviceName)` → 找不到则 fallback 到第一台设备。

### 命令安全检查

每条命令经过 `isCommandAllowed(cmd, whitelist)` 检查。Whitelist 来自 `command_whitelist` 表，默认包含：

```
display, show, enable, system-view, quit, ping, traceroute, terminal
```

### 执行模式

| 模式 | 行为 |
|---|---|
| `confirm` | 命令暂存到 `pendingCommands` Map，返回 JSON 给前端弹窗确认 |
| `auto` | 直接执行命令 |

confirm 模式返回结构：

```json
{
  "type": "confirm_required",
  "execId": "日志ID",
  "deviceName": "设备名",
  "command": "命令",
  "aiExplanation": "AI 的原始回复"
}
```

### 第二次 AI 调用（命令执行后）

命令执行完毕后，将输出拼成文本发起第二次调用，让 AI 分析总结：

```
messages = [
  { role: "system", content: systemPrompt },
  ...原始对话,
  { role: "assistant", content: AI的第一次回复 },
  { role: "user", content: "以下是在设备 SW1, SW2 上执行命令的结果，请分析并给出总结：\n\n..." }
]
```

最终返回第二次 AI 的分析结果。

---

## 三、拓扑自动发现

**核心文件:** `electron/services/discovery.ts` — `discoverTopology()` 函数

### 调用链路

```
前端 DiscoveryPanel.tsx
  → window.api.ai.discoverTopology(deviceIds)
    → IPC ai:discoverTopology
      → discoverTopology(deviceIds)
```

### 两阶段流程

#### 阶段 1: 数据采集（纯 SSH，不调 AI）

1. 对每台设备执行 `display version` 或 `show version` 检测厂商
2. 根据厂商选择命令集（`electron/services/vendor-commands.ts`）：

| 厂商 | 采集命令 |
|---|---|
| Huawei | `display version`, `display lldp neighbor brief`, `display arp`, `display ip routing-table`, `display interface brief` |
| Cisco | `show version`, `show lldp neighbors detail`, `show cdp neighbors detail`, `show ip arp`, `show ip route`, `show ip interface brief` |
| H3C | `display version`, `display lldp neighbor-information list`, `display arp`, `display ip routing-table`, `display interface brief` |
| Unknown | `show version`, `display version`, `show lldp neighbors`, `display lldp neighbor brief` |

每条命令同样经过 `isCommandAllowed` 安全校验。

#### 阶段 2: AI 分析（一次调用）

将所有设备的采集输出拼接后发送给 AI。

### System Prompt

```
你是一个网络拓扑分析专家。根据以下从多台网络设备采集的信息，
分析它们之间的拓扑连接关系。

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
4. 接口名从邻居信息和接口表中提取
```

### User Message 格式

```
以下是采集到的设备信息：

设备: SW1 (ID: xxx, 厂商: huawei)
--- display version ---
Huawei Versatile Routing Platform Software...
--- display lldp neighbor brief ---
...

==========

设备: SW2 (ID: yyy, 厂商: cisco)
--- show version ---
Cisco IOS Software...
```

### 结果处理

AI 返回的 JSON 经过：

1. 去除 markdown 代码块包裹（` ```json ``` `）
2. `JSON.parse` 解析
3. 转换为 ReactFlow 的 nodes 和 edges 格式

---

## 四、对比总结

| 维度 | AI 助手 | 拓扑发现 |
|---|---|---|
| AI 调用次数 | 1~2 次（无命令=1次，有命令=2次） | 1 次 |
| System Prompt 角色 | 网络设备管理AI助手 | 网络拓扑分析专家 |
| 输出格式 | 自然语言 + `[CMD:...]` 标记 | 严格 JSON |
| 是否执行命令 | 按需（AI 决定） | 固定命令集（代码预设） |
| 命令来源 | AI 动态生成 | `vendor-commands.ts` 硬编码 |
| 多轮对话 | 支持（传入历史 messages） | 单轮（只发一次） |
| 安全校验 | 共用 `isCommandAllowed` | 共用 `isCommandAllowed` |
| API 额外参数 | 无 | 无 |
