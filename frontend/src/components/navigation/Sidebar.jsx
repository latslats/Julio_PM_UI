import { NavLink } from 'react-router-dom'
import { FiHome, FiFolder, FiBarChart2, FiSettings, FiX, FiAlertCircle, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { Button } from "@/components/ui/button"
import { cn } from "../../lib/utils"
import logo from "../../assets/taskflow_logo.png"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useEffect, useState } from 'react'

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if mobile on component mount
    setIsMobile(!window.matchMedia('(min-width: 1024px)').matches);
    
    // Add listener for window resize
    const handleResize = () => {
      setIsMobile(!window.matchMedia('(min-width: 1024px)').matches);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <FiHome className="w-5 h-5" /> },
    { name: 'Projects', path: '/projects', icon: <FiFolder className="w-5 h-5" /> },
    { name: 'Waiting On', path: '/waiting-items', icon: <FiAlertCircle className="w-5 h-5" /> },
    { name: 'Time', path: '/time-entries', icon: <FiClock className="w-5 h-5" /> },
    { name: 'Reports', path: '/reports', icon: <FiBarChart2 className="w-5 h-5" /> },
    { name: 'Settings', path: '/settings', icon: <FiSettings className="w-5 h-5" /> },
  ]
  
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 bg-white shadow-medium transition-all duration-300 ease-in-out lg:static lg:h-screen ${
          isOpen ? 'w-64' : 'w-16'
        } ${
          !isOpen && isMobile ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-secondary-100">
            {isOpen ? (
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={logo} alt="Pugress Logo" className="h-8 w-8 object-contain" />
                </div>
                <span className="ml-2 text-xl font-semibold text-secondary-900">Pugress</span>
              </div>
            ) : (
              <div className="mx-auto h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
                <img src={logo} alt="Pugress Logo" className="h-8 w-8 object-contain" />
              </div>
            )}
            
            {/* Toggle button - visible only on large screens */}
            <Button 
              onClick={toggleSidebar}
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isOpen ? <FiChevronLeft className="h-5 w-5" /> : <FiChevronRight className="h-5 w-5" />}
            </Button>
            
            {/* Close button - visible only on mobile */}
            {isOpen && (
              <Button 
                onClick={toggleSidebar}
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Close sidebar"
              >
                <FiX className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Tooltip key={item.path} delayDuration={300}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-700"
                          : "text-secondary-700 hover:bg-secondary-50",
                        isOpen ? "px-3 text-sm font-medium" : "px-0 justify-center"
                      )
                    }
                  >
                    <span className={cn("", isOpen ? "mr-3" : "")}>{item.icon}</span>
                    {isOpen && <span>{item.name}</span>}
                  </NavLink>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">
                    {item.name}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>
          
          {/* Bottom toggle button on mobile */}
          <div className="mt-auto p-4 border-t border-secondary-100 lg:hidden flex justify-center">
            <Button 
              onClick={toggleSidebar}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isOpen ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
