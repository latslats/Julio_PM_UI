import { Outlet } from 'react-router-dom'
import Sidebar from '../navigation/Sidebar'
import Header from '../navigation/Header'
import { useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"

const MainLayout = () => {
  // Initialize with a default, then update in useEffect
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Update sidebar state on window resize
  useEffect(() => {
    // Set initial state based on screen size
    setSidebarOpen(window.innerWidth >= 1024);
    
    const handleResize = () => {
      if (window.innerWidth < 1024 && sidebarOpen) {
        setSidebarOpen(false);
      } else if (window.innerWidth >= 1024 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Add Toaster for displaying notifications */}
      <Toaster /> 
    </div>
  )
}

export default MainLayout
