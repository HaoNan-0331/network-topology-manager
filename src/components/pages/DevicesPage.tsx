import { useState, useEffect } from 'react'
import { Table, Button, Space, Popconfirm, message, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import DeviceForm from '../DeviceForm'
import type { Device, CreateDeviceDTO } from '../../types/device'

const { Title } = Typography

const deviceTypeLabels: Record<string, string> = {
  router: '路由器', switch: '交换机', firewall: '防火墙', server: '服务器', generic: '通用',
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Device | null>(null)

  const load = async () => {
    setLoading(true)
    try { setDevices(await window.api.device.list()) } catch (e: any) { message.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (values: CreateDeviceDTO) => {
    await window.api.device.create(values)
    message.success('设备添加成功')
    setFormOpen(false); load()
  }

  const handleUpdate = async (values: CreateDeviceDTO) => {
    if (!editing) return
    await window.api.device.update(editing.id, values)
    message.success('设备更新成功')
    setEditing(null); setFormOpen(false); load()
  }

  const handleDelete = async (id: string) => {
    await window.api.device.delete(id)
    message.success('设备删除成功')
    load()
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>设备管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true) }}>添加设备</Button>
      </div>
      <Table columns={[
        { title: '设备名称', dataIndex: 'name', key: 'name' },
        { title: '类型', dataIndex: 'deviceType', key: 'deviceType', render: (v: string) => deviceTypeLabels[v] || v },
        { title: '厂商', dataIndex: 'vendor', key: 'vendor' },
        { title: '型号', dataIndex: 'model', key: 'model' },
        { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress' },
        { title: '连接方式', dataIndex: 'connectionType', key: 'connectionType', render: (v: string) => v?.toUpperCase() },
        { title: '操作', key: 'action', render: (_: unknown, r: Device) => (
          <Space>
            <Button icon={<EditOutlined />} type="text" onClick={() => { setEditing(r); setFormOpen(true) }} />
            <Popconfirm title="删除设备将同时从拓扑中移除，确定删除？" onConfirm={() => handleDelete(r.id)}>
              <Button icon={<DeleteOutlined />} type="text" danger />
            </Popconfirm>
          </Space>
        )},
      ]} dataSource={devices} rowKey="id" loading={loading} pagination={false} />
      <DeviceForm open={formOpen} device={editing} onOk={editing ? handleUpdate : handleCreate}
        onCancel={() => { setFormOpen(false); setEditing(null) }} />
    </div>
  )
}
