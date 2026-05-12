import { useState, useEffect } from 'react'
import { Table, Button, Tag, Tabs, Card, Modal, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { AIExecLog, AISystemLog } from '@/types/electron'

// ---------- AI 助手执行日志 ----------

const statusConfig: Record<string, { color: string; label: string }> = {
  approved: { color: 'green', label: '已批准' },
  rejected: { color: 'red', label: '已拒绝' },
  pending: { color: 'orange', label: '待确认' },
  executed: { color: 'blue', label: '已执行' },
  failed: { color: 'red', label: '执行失败' },
}

function AIExecLogTab() {
  const [logs, setLogs] = useState<AIExecLog[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api.ai.getLogs(200)
      setLogs(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <Card
      title="AI 助手执行日志"
      size="small"
      extra={<Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>}
    >
      <Table<AIExecLog>
        dataSource={logs}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 800 }}
        columns={[
          {
            title: '时间',
            dataIndex: 'createdAt',
            width: 170,
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: '设备',
            dataIndex: 'deviceName',
            width: 120,
          },
          {
            title: '命令',
            dataIndex: 'command',
            width: 200,
            ellipsis: true,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (v: string) => {
              const cfg = statusConfig[v]
              return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : v
            },
          },
          {
            title: '模式',
            dataIndex: 'mode',
            width: 80,
            render: (v: string) => (
              <Tag color={v === 'auto' ? 'purple' : 'default'}>
                {v === 'auto' ? '自动' : '确认'}
              </Tag>
            ),
          },
          {
            title: 'AI 原因',
            dataIndex: 'aiReason',
            ellipsis: true,
            render: (v: string) => (
              <Tooltip title={v}><span>{v}</span></Tooltip>
            ),
          },
        ]}
      />
    </Card>
  )
}

// ---------- AI 系统执行日志 ----------

function AISystemLogTab() {
  const [logs, setLogs] = useState<AISystemLog[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLog, setDetailLog] = useState<AISystemLog | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api.ai.getSystemLogs(100)
      setLogs(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <>
      <Card
        title="AI 系统执行日志（拓扑发现）"
        size="small"
        extra={<Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>}
      >
        <Table<AISystemLog>
          dataSource={logs}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 700 }}
          columns={[
            {
              title: '时间',
              dataIndex: 'createdAt',
              width: 170,
              render: (v: string) => new Date(v).toLocaleString(),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 90,
              render: (v: string) => (
                <Tag color={v === 'success' ? 'green' : 'red'}>
                  {v === 'success' ? '成功' : '失败'}
                </Tag>
              ),
            },
            {
              title: '设备',
              dataIndex: 'deviceNames',
              width: 200,
              ellipsis: true,
            },
            {
              title: '错误信息',
              dataIndex: 'errorMessage',
              ellipsis: true,
              render: (v: string) => v || '-',
            },
            {
              title: '操作',
              width: 80,
              render: (_: unknown, record: AISystemLog) => (
                <Button type="link" size="small" onClick={() => setDetailLog(record)}>
                  详情
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!detailLog}
        title={`系统日志详情 — ${detailLog?.status === 'success' ? '成功' : '失败'}`}
        onCancel={() => setDetailLog(null)}
        footer={null}
        width={720}
      >
        {detailLog && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ marginBottom: 12 }}>
              <strong>设备:</strong> {detailLog.deviceNames}
            </div>
            {detailLog.errorMessage && (
              <div style={{ marginBottom: 12, color: '#ff4d4f' }}>
                <strong>错误:</strong> {detailLog.errorMessage}
              </div>
            )}
            <div style={{ marginBottom: 8 }}>
              <strong>发送给 AI 的 Prompt:</strong>
            </div>
            <pre style={{
              background: '#f5f5f5', padding: 12, borderRadius: 4,
              fontSize: 12, maxHeight: 200, overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {detailLog.promptText || '(空)'}
            </pre>
            <div style={{ margin: '12px 0 8px' }}>
              <strong>AI 原始响应:</strong>
            </div>
            <pre style={{
              background: '#f5f5f5', padding: 12, borderRadius: 4,
              fontSize: 12, maxHeight: 200, overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {detailLog.aiResponse || '(空)'}
            </pre>
            {detailLog.parsedResult && (
              <>
                <div style={{ margin: '12px 0 8px' }}>
                  <strong>解析结果:</strong>
                </div>
                <pre style={{
                  background: '#f0fff0', padding: 12, borderRadius: 4,
                  fontSize: 12, maxHeight: 200, overflow: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {detailLog.parsedResult}
                </pre>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

// ---------- 主页面 ----------

export default function LogAuditPage() {
  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <Tabs
        defaultActiveKey="exec"
        items={[
          { key: 'exec', label: 'AI 助手执行日志', children: <AIExecLogTab /> },
          { key: 'system', label: 'AI 系统执行日志', children: <AISystemLogTab /> },
        ]}
      />
    </div>
  )
}
