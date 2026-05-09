import { useState, useEffect, useRef } from 'react'
import { Select, Input, Button, Spin, Typography, message, Modal, Tag } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

const { Title } = Typography
const { TextArea } = Input

interface DeviceOption {
  id: string
  name: string
  connectionType: string
}

interface ChatMsg {
  id?: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

interface ConfirmData {
  type: 'confirm_required'
  execId: string
  deviceName: string
  command: string
  aiExplanation: string
}

export default function AIPage() {
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [hasConfig, setHasConfig] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmData | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [devs, history, config] = await Promise.all([
        window.api.device.list(),
        window.api.ai.getChatHistory(),
        window.api.ai.getConfig(),
      ])
      setDevices(
        devs
          .filter((d: any) => d.connectionType === 'ssh' || d.connectionType === 'telnet')
          .map((d: any) => ({ id: d.id, name: d.name, connectionType: d.connectionType }))
      )
      if (history.length > 0) {
        setMessages(
          history.map((h: any) => ({ id: h.id, role: h.role, content: h.content, createdAt: h.createdAt }))
        )
      }
      setHasConfig(!!config && !!config.apiKey)
    } catch {
      // ignore
    }
    setConfigLoading(false)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const reply = await window.api.ai.chat(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        selectedDevice
      )

      // Check if reply is a confirm_required response
      try {
        const parsed: ConfirmData = JSON.parse(reply)
        if (parsed.type === 'confirm_required') {
          setPendingConfirm(parsed)
          setLoading(false)
          return
        }
      } catch {
        // Not JSON — normal reply
      }

      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages([...newMessages, { role: 'assistant', content: `错误: ${e.message}` }])
    }
    setLoading(false)
  }

  async function handleConfirm(approved: boolean) {
    if (!pendingConfirm) return
    setLoading(true)
    try {
      const reply = await window.api.ai.confirmCommand(pendingConfirm.execId, approved)
      // After confirmation, the AI reply comes back as the result
      // Check if it's already a final string
      if (approved) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: pendingConfirm.aiExplanation + '\n\n命令执行结果:\n' + reply },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '已拒绝执行命令: ' + pendingConfirm.command },
        ])
      }
    } catch (e: any) {
      message.error(e.message)
    }
    setPendingConfirm(null)
    setLoading(false)
  }

  if (configLoading) {
    return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  }

  if (!hasConfig) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 100 }}>
        <ExclamationCircleOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
        <div style={{ fontSize: 16, color: '#666' }}>
          请先在「系统设置」中配置 AI 服务参数
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with device selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>AI 助手</Title>
        <Select
          allowClear
          placeholder="选择目标设备（可选）"
          style={{ width: 280 }}
          value={selectedDevice}
          onChange={setSelectedDevice}
          options={devices.map((d) => ({ value: d.id, label: `${d.name} (${d.connectionType.toUpperCase()})` }))}
        />
      </div>

      {/* Chat messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 16,
          background: '#fafafa',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#bfbfbf', paddingTop: 60 }}>
            <RobotOutlined style={{ fontSize: 40, marginBottom: 8 }} />
            <div>向 AI 助手提问，选择设备后可查询设备信息</div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '8px 12px',
                borderRadius: 8,
                background: msg.role === 'user' ? '#1677ff' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#333',
                border: msg.role === 'user' ? 'none' : '1px solid #e8e8e8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <div style={{ marginBottom: 4 }}>
                {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                <span style={{ marginLeft: 4, fontWeight: 500 }}>
                  {msg.role === 'user' ? '我' : 'AI'}
                </span>
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8' }}>
              <Spin size="small" /> <span style={{ marginLeft: 8, color: '#999' }}>思考中...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim()}
        >
          发送
        </Button>
      </div>

      {/* Confirm modal */}
      <Modal
        open={!!pendingConfirm}
        title="命令执行确认"
        onCancel={() => handleConfirm(false)}
        footer={[
          <Button key="reject" danger onClick={() => handleConfirm(false)}>
            拒绝执行
          </Button>,
          <Button key="approve" type="primary" onClick={() => handleConfirm(true)}>
            确认执行
          </Button>,
        ]}
      >
        {pendingConfirm && (
          <div>
            <p>
              <strong>目标设备:</strong> {pendingConfirm.deviceName}
            </p>
            <p>
              <strong>待执行命令:</strong>{' '}
              <Tag color="blue" style={{ fontSize: 13 }}>
                {pendingConfirm.command}
              </Tag>
            </p>
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, marginTop: 8 }}>
              <strong>AI 说明:</strong>
              <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{pendingConfirm.aiExplanation}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
