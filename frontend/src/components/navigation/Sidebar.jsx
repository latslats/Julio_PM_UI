import { NavLink } from 'react-router-dom'
import { FiHome, FiFolder, FiBarChart2, FiSettings, FiX, FiAlertCircle } from 'react-icons/fi'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <FiHome className="w-5 h-5" /> },
    { name: 'Projects', path: '/projects', icon: <FiFolder className="w-5 h-5" /> },
    { name: 'Waiting On', path: '/waiting-items', icon: <FiAlertCircle className="w-5 h-5" /> },
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
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-medium transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-secondary-100">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500"></div>
              <span className="ml-2 text-xl font-semibold text-secondary-900">TaskFlow</span>
            </div>
            {/* Refactored Close Button */}
            <Button 
              onClick={toggleSidebar}
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Close sidebar"
            >
              <FiX className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-secondary-700 hover:bg-secondary-50'
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
          
          {/* Sidebar footer - Refactored with Card */}
          <div className="mt-auto p-4 border-t border-secondary-100">
            <Card className="bg-secondary-50/70 border-secondary-100 shadow-none">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Need help?</CardTitle>
                <CardDescription className="text-xs">
                  Check our documentation or contact support.
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-3 pt-0">
                <Button size="sm" className="w-full text-xs">
                  View Documentation
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
