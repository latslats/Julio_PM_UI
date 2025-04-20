import { FiMenu, FiSearch, FiSettings, FiBarChart2, FiBell } from 'react-icons/fi'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link } from 'react-router-dom'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

const Header = ({ toggleSidebar }) => {
  return (
    <header className="bg-white shadow-soft z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
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
        
        <div className="flex items-center space-x-3">
          {/* Quick access buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-secondary-500">
                <FiBell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2 font-medium text-sm">Notifications</div>
              <div className="p-4 text-center text-xs text-secondary-500">
                No new notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Settings & Reports quick access */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="bg-primary-100 text-primary-700 text-xs font-medium">
                  JV
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center cursor-pointer">
                  <FiSettings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/reports" className="flex items-center cursor-pointer">
                  <FiBarChart2 className="mr-2 h-4 w-4" />
                  <span>Reports</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Header
