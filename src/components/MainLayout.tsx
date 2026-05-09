import { Layout } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopologyPage from './pages/TopologyPage'
import DevicesPage from './pages/DevicesPage'
import AIPage from './pages/AIPage'
import SettingsPage from './pages/SettingsPage'

const { Sider, Content } = Layout

export default function MainLayout() {
  return (
    <BrowserRouter>
      <Layout style={{ height: '100vh' }}>
        <Sider width={200} theme="light">
          <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
            <strong>拓扑管理</strong>
          </div>
          <Sidebar />
        </Sider>
        <Layout>
          <Content style={{ padding: 16, overflow: 'auto' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/topology" replace />} />
              <Route path="/topology" element={<TopologyPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/ai" element={<AIPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  )
}
