import { useState } from 'react'
import { FiMenu, FiSearch } from 'react-icons/fi'
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const Header = ({ toggleSidebar }) => {
  
  return (
    <header className="bg-white shadow-soft z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className="mr-2"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </Button>
          
          <div className="relative max-w-xs w-full hidden md:block">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Avatar className="h-8 w-8">
            {/* <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" /> */}
            <AvatarFallback className="bg-primary-100 text-primary-700 text-xs font-medium">
              JV
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

export default Header
