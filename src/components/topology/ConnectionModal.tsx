import { Modal, Input, Form } from 'antd'
import { useEffect } from 'react'

interface ConnectionModalProps {
  open: boolean
  sourceDeviceName?: string
  targetDeviceName?: string
  onConfirm: (sourceInterface: string, targetInterface: string) => void
  onCancel: () => void
}

interface FormValues {
  sourceInterface: string
  targetInterface: string
}

export default function ConnectionModal({
  open,
  sourceDeviceName,
  targetDeviceName,
  onConfirm,
  onCancel,
}: ConnectionModalProps) {
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [open, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onConfirm(values.sourceInterface, values.targetInterface)
    } catch {
      // validation failed, keep modal open
    }
  }

  return (
    <Modal
      title="连接接口配置"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="确认"
      cancelText="取消"
      destroyOnClose
      width={440}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label={`源接口（${sourceDeviceName ?? '源设备'}）`}
          name="sourceInterface"
          rules={[{ required: true, message: '请输入源接口名称' }]}
        >
          <Input placeholder="例: GigabitEthernet0/0/1" />
        </Form.Item>
        <Form.Item
          label={`目标接口（${targetDeviceName ?? '目标设备'}）`}
          name="targetInterface"
          rules={[{ required: true, message: '请输入目标接口名称' }]}
        >
          <Input placeholder="例: GigabitEthernet0/0/1" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
