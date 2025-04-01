import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ProjectProvider } from './context/ProjectContext'
import { NotificationProvider } from './context/NotificationContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </NotificationProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
