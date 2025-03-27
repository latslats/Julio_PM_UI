import { useState } from 'react'
import { FiMenu, FiSearch } from 'react-icons/fi'

const Header = ({ toggleSidebar }) => {
  
  return (
    <header className="bg-white shadow-soft z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 focus:outline-none"
          >
            <FiMenu className="h-6 w-6" />
          </button>
          
          <div className="ml-4 relative max-w-xs w-full hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-secondary-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-secondary-200 rounded-lg text-sm placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary-400 to-accent-400"></div>
        </div>
      </div>
    </header>
  )
}

export default Header
