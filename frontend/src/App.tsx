import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Messages from './pages/Messages'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={
          <Login />
        } />
        <Route path="/messages" element={
          <Messages />
        } />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App 