import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ProjectProvider } from './context/ProjectContext'
import { NotificationProvider } from './context/NotificationContext'
import { WaitingItemProvider } from './context/WaitingItemContext'
import { TooltipProvider } from './components/ui/tooltip'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <NotificationProvider>
          <ProjectProvider>
            <WaitingItemProvider>
              <App />
            </WaitingItemProvider>
          </ProjectProvider>
        </NotificationProvider>
      </TooltipProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
