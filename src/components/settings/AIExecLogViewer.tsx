import { useState, useEffect } from 'react'
import { Table, Button, Tag, Card, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { AIExecLog } from '../../types/electron'

const statusConfig: Record<string, { color: string; label: string }> = {
  approved: { color: 'green', label: '已批准' },
  rejected: { color: 'red', label: '已拒绝' },
  pending: { color: 'orange', label: '待确认' },
  executed: { color: 'blue', label: '已执行' },
  failed: { color: 'red', label: '执行失败' },
}

export default function AIExecLogViewer() {
  const [logs, setLogs] = useState<AIExecLog[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api.ai.getLogs(200)
      setLogs(data)
    } catch {
      // ignore
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <Card
      title="AI 执行日志"
      size="small"
      extra={
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          刷新
        </Button>
      }
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
            key: 'createdAt',
            width: 170,
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: '设备',
            dataIndex: 'deviceName',
            key: 'deviceName',
            width: 120,
          },
          {
            title: '命令',
            dataIndex: 'command',
            key: 'command',
            width: 200,
            ellipsis: true,
          },
          {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (v: string) => {
              const cfg = statusConfig[v]
              return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : v
            },
          },
          {
            title: '模式',
            dataIndex: 'mode',
            key: 'mode',
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
            key: 'aiReason',
            ellipsis: true,
            render: (v: string) => (
              <Tooltip title={v}>
                <span>{v}</span>
              </Tooltip>
            ),
          },
        ]}
      />
    </Card>
  )
}
