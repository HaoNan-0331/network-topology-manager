import { Menu } from 'antd'
import { ApartmentOutlined, DesktopOutlined, RobotOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const items = [
  { key: '/topology', icon: <ApartmentOutlined />, label: '拓扑管理' },
  { key: '/devices', icon: <DesktopOutlined />, label: '设备管理' },
  { key: '/ai', icon: <RobotOutlined />, label: 'AI 助手' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={items}
      onClick={({ key }) => navigate(key)}
      style={{ height: '100%', borderRight: 0 }}
    />
  )
}
