import { useEffect } from 'react'
import { Modal, Input, Select, Form } from 'antd'
import type { TopologyNodeData } from '@/types/topology'
import type { DeviceType } from '@/types/device'

interface EditNodeModalProps {
  open: boolean
  data: TopologyNodeData | null
  onConfirm: (updated: TopologyNodeData) => void
  onCancel: () => void
}

interface FormValues {
  deviceName: string
  ipAddress: string
  deviceType: DeviceType
  vendor: string
  model: string
}

export default function EditNodeModal({
  open,
  data,
  onConfirm,
  onCancel,
}: EditNodeModalProps) {
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        deviceName: data.deviceName,
        ipAddress: data.ipAddress,
        deviceType: data.deviceType,
        vendor: data.vendor || '',
        model: data.model || '',
      })
    }
  }, [open, data, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onConfirm({
        ...data!,
        deviceName: values.deviceName,
        ipAddress: values.ipAddress,
        deviceType: values.deviceType,
        vendor: values.vendor || undefined,
        model: values.model || undefined,
      })
    } catch {
      // validation failed
    }
  }

  return (
    <Modal
      title="编辑节点属性"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="确认"
      cancelText="取消"
      destroyOnHidden
      width={440}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="deviceName" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="ipAddress" label="IP 地址" rules={[{ required: true, message: '请输入 IP 地址' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="deviceType" label="设备类型" rules={[{ required: true }]}>
          <Select options={[
            { value: 'router', label: '路由器' },
            { value: 'switch', label: '交换机' },
            { value: 'firewall', label: '防火墙' },
            { value: 'server', label: '服务器' },
            { value: 'generic', label: '通用设备' },
          ]} />
        </Form.Item>
        <Form.Item name="vendor" label="厂商">
          <Input placeholder="华为、Cisco、H3C..." />
        </Form.Item>
        <Form.Item name="model" label="型号">
          <Input placeholder="S5735-L48T4X" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
