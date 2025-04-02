import { NavLink } from 'react-router-dom'
import { FiHome, FiFolder, FiClock, FiBarChart2, FiSettings, FiX, FiAlertCircle } from 'react-icons/fi'

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <FiHome className="w-5 h-5" /> },
    { name: 'Projects', path: '/projects', icon: <FiFolder className="w-5 h-5" /> },
    { name: 'Time Tracking', path: '/time-tracking', icon: <FiClock className="w-5 h-5" /> },
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
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 focus:outline-none lg:hidden"
            >
              <FiX className="h-5 w-5" />
            </button>
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
          
          {/* Sidebar footer */}
          <div className="p-4 border-t border-secondary-100">
            <div className="bg-secondary-50 rounded-xl p-3">
              <h3 className="text-sm font-medium text-secondary-900">Need help?</h3>
              <p className="mt-1 text-xs text-secondary-600">
                Check our documentation or contact support for assistance.
              </p>
              <button className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:outline-none">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
