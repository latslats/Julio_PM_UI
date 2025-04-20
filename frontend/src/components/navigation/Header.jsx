import { FiMenu, FiSettings, FiBarChart2, FiBell } from 'react-icons/fi'
import { Button } from "../../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Link } from 'react-router-dom'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu"
import logo from "../../assets/taskflow_logo.png"

const Header = () => {
  return (
    <header className="bg-white shadow-soft z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex-1">
          {/* Intentionally empty or for potential future elements like a menu button */}
        </div>

        <div className="flex items-center justify-center">
          <Link to="/" className="flex items-center">
            <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center mr-2">
              <img src={logo} alt="Pugress Logo" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-xl font-semibold text-secondary-900">Pugress Tracker</span>
          </Link>
        </div>
        
        <div className="flex-1 flex justify-end items-center space-x-3">
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
