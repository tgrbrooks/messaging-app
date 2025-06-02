import { Routes, Route } from 'react-router-dom'
import { NetworkProvider } from './context/NetworkContext'
import Login from './pages/Login'
import Messages from './pages/Messages'

function App() {
  return (
    <NetworkProvider>
        <Routes>
          <Route path="/login" element={
            <Login />
          } />
          <Route path="/messages" element={
            <Messages />
          } />
          <Route path="/" element={<Login />} />
        </Routes>
    </NetworkProvider>
  )
}

export default App 