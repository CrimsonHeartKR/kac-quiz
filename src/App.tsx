import { BrowserRouter, Routes, Route } from 'react-router-dom'
import JoinPage from './pages/JoinPage'
import WaitPage from './pages/WaitPage'
import PlayPage from './pages/PlayPage'
import HostSelectPage from './pages/HostSelectPage'
import HostLobbyPage from './pages/HostLobbyPage'
import HostPlayPage from './pages/HostPlayPage'
import ProjectorPage from './pages/ProjectorPage'
import AdminPage from './pages/AdminPage'
import AdminEditorPage from './pages/AdminEditorPage'
import AdminLoginPage from './pages/AdminLoginPage'
import PreviewPage from './pages/PreviewPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/wait" element={<WaitPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/host" element={<HostSelectPage />} />
        <Route path="/host/lobby" element={<HostLobbyPage />} />
        <Route path="/host/play" element={<HostPlayPage />} />
        <Route path="/projector" element={<ProjectorPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/editor" element={<AdminEditorPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/preview" element={<PreviewPage />} />
      </Routes>
    </BrowserRouter>
  )
}
