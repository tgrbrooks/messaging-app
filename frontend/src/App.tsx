import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Messages from './pages/Messages'

function App() {
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/rpc/health')
        const data = await response.json()
        setHealth(data)
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }

    checkHealth()
  }, [])

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/messages" replace /> : <Login onLogin={() => setIsAuthenticated(true)} />
        } />
        <Route path="/messages" element={
          isAuthenticated ? <Messages /> : <Navigate to="/login" replace />
        } />
        <Route path="/home" element={<Home health={health} />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App 