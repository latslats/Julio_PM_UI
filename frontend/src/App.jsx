import { Routes, Route } from 'react-router-dom'

// Layouts
import MainLayout from './components/layouts/MainLayout'

// Pages
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Reports from './pages/Reports'
import WaitingItems from './pages/WaitingItems'
import WaitingItemDetail from './pages/WaitingItemDetail'
import SettingsPage from './pages/SettingsPage'
import TimeEntriesPage from './pages/TimeEntriesPage' // Import TimeEntriesPage
import NotFound from './pages/NotFound'

const App = () => {
  return (
    <Routes>
      {/* Main Routes - No Authentication Required */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="waiting-items" element={<WaitingItems />} />
        <Route path="waiting-items/:id" element={<WaitingItemDetail />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="time-entries" element={<TimeEntriesPage />} /> {/* Add Time Entries Route */}
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
