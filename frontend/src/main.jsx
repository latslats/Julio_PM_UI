import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ProjectProvider } from './context/ProjectContext'
import { NotificationProvider } from './context/NotificationContext'
import { WaitingItemProvider } from './context/WaitingItemContext'
import { UIProvider } from './context/UIContext'
import { TooltipProvider } from './components/ui/tooltip'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <NotificationProvider>
          <UIProvider>
            <ProjectProvider>
              <WaitingItemProvider>
                <App />
              </WaitingItemProvider>
            </ProjectProvider>
          </UIProvider>
        </NotificationProvider>
      </TooltipProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
