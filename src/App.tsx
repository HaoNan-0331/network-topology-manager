import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import Login from './components/Login'
import InitAdmin from './components/InitAdmin'
import { useAuthStore } from './stores/authStore'

export default function App() {
  const [loading, setLoading] = useState(true)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isFirstRun = useAuthStore((s) => s.isFirstRun)
  const checkFirstRun = useAuthStore((s) => s.checkFirstRun)

  useEffect(() => { checkFirstRun().finally(() => setLoading(false)) }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isFirstRun) {
    return <InitAdmin onSuccess={() => window.location.reload()} />
  }

  if (!isLoggedIn) {
    return <Login />
  }

  return <div style={{ padding: 40, textAlign: 'center' }}>主界面加载中...（Task 7 中实现）</div>
}
