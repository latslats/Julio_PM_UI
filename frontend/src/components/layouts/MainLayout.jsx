import { Outlet } from 'react-router-dom'
// import Sidebar from '../navigation/Sidebar' // Removed Sidebar import
import Header from '../navigation/Header'
import { useState, useEffect } from 'react'
import { Toaster } from "../../components/ui/toaster" // Corrected path alias

const MainLayout = () => {
  // Sidebar state logic is no longer needed
  // const [sidebarOpen, setSidebarOpen] = useState(false);
  
  /* Sidebar resize logic removed
  useEffect(() => {
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
  */
  
  return (
    // Removed outer flex container, let this div be the main container
    <div className="flex h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex-col overflow-hidden">
      {/* Sidebar component removed */}
      {/* <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} /> */}
      
      {/* This div now directly holds header and main content */}
      {/* Removed flex-1 and transition from this div as it's the main column now */}
      <Header /> {/* Removed toggleSidebar prop */}
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      
      {/* Add Toaster for displaying notifications */}
      <Toaster /> 
    </div>
  )
}

export default MainLayout
