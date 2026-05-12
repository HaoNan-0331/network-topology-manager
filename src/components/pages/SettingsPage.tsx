import { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Select, message, Divider, Space, Spin } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../stores/authStore'
import CommandWhitelistEditor from '../settings/CommandWhitelistEditor'
import ExecModeSwitch from '../settings/ExecModeSwitch'
import type { AIConfig } from '../../types/electron'

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'custom', label: '自定义' },
]

export default function SettingsPage() {
  const [form] = Form.useForm()
  const [configLoading, setConfigLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [originalApiKey, setOriginalApiKey] = useState('')
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const config = await window.api.ai.getConfig()
      if (config) {
        form.setFieldsValue(config)
        setOriginalApiKey(config.apiKey)
      }
    } catch (e: any) {
      message.error(e.message)
    }
    setConfigLoading(false)
  }

  const handleSaveConfig = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload: Partial<AIConfig> = {
        provider: values.provider,
        baseUrl: values.baseUrl,
        modelName: values.modelName,
      }

      // Only include apiKey if user actually changed it
      if (values.apiKey && values.apiKey !== originalApiKey) {
        payload.apiKey = values.apiKey
      }

      await window.api.ai.saveConfig(payload as AIConfig)
      message.success('AI 配置已保存')

      // Reload to get updated masked apiKey
      const config = await window.api.ai.getConfig()
      if (config) {
        form.setFieldsValue(config)
        setOriginalApiKey(config.apiKey)
      }
    } catch (e: any) {
      if (e.errorFields) return // form validation error
      message.error(e.message)
    }
    setSaving(false)
  }

  const handleLogout = () => {
    logout()
  }

  if (configLoading) {
    return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  }

  return (
    <div style={{ maxWidth: 900, padding: 16 }}>
      {/* AI Model Config */}
      <Card title="AI 模型配置" size="small" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ provider: 'openai' }}
        >
          <Form.Item label="提供商" name="provider" rules={[{ required: true, message: '请选择提供商' }]}>
            <Select options={providerOptions} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="API Key" name="apiKey">
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>
          <Form.Item label="Base URL" name="baseUrl">
            <Input placeholder="如 https://api.openai.com/v1（可留空使用默认值）" />
          </Form.Item>
          <Form.Item label="模型名称" name="modelName" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input placeholder="如 gpt-4o" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSaveConfig} loading={saving}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Command Whitelist */}
      <div style={{ marginBottom: 16 }}>
        <CommandWhitelistEditor />
      </div>

      {/* Exec Mode */}
      <div style={{ marginBottom: 16 }}>
        <ExecModeSwitch />
      </div>

      {/* Logout */}
      <Divider />
      <Space>
        <Button icon={<LogoutOutlined />} danger onClick={handleLogout}>
          退出登录
        </Button>
      </Space>
    </div>
  )
}
