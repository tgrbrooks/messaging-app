import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'

function App() {
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null)

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
        <Route path="/" element={<Home health={health} />} />
      </Routes>
    </div>
  )
}

export default App 