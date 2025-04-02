import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ProjectProvider } from './context/ProjectContext'
import { NotificationProvider } from './context/NotificationContext'
import { WaitingItemProvider } from './context/WaitingItemContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <ProjectProvider>
          <WaitingItemProvider>
            <App />
          </WaitingItemProvider>
        </ProjectProvider>
      </NotificationProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
