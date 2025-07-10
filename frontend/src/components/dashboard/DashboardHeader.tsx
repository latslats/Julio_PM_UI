import React from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiPlus, FiTarget, FiSettings, FiBarChart2 } from 'react-icons/fi'
import { Button } from "../ui/button"
import type { DashboardHeaderProps } from '@/types'

const DashboardHeader: React.FC<DashboardHeaderProps> = React.memo(({ 
  bulkSelectMode, 
  toggleBulkSelectMode,
  focusModeActive,
  toggleFocusMode,
  openQuickEntry
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-base">Your project overview and productivity insights</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Bulk Selection Toggle */}
        <Button
          variant={bulkSelectMode ? "default" : "outline"}
          size="sm"
          className="flex items-center"
          onClick={toggleBulkSelectMode}
        >
          <FiCheckCircle className="mr-1.5 h-4 w-4" />
          <span className="font-normal">{bulkSelectMode ? "Exit Select" : "Multi-Select"}</span>
        </Button>
        
        <Button
          variant="default"
          size="sm"
          className="flex items-center"
          onClick={openQuickEntry}
        >
          <FiPlus className="mr-1.5 h-4 w-4" />
          <span className="font-normal">Quick Add</span>
        </Button>
        
        <Button
          variant={focusModeActive ? "default" : "outline"}
          size="sm"
          className="flex items-center"
          onClick={toggleFocusMode}
        >
          <FiTarget className="mr-1.5 h-4 w-4" />
          <span className="font-normal">{focusModeActive ? "Exit Focus" : "Focus Mode"}</span>
        </Button>
        
        <Button asChild variant="ghost" size="sm" className="hidden lg:flex">
          <Link to="/settings" className="flex items-center">
            <FiSettings className="mr-1.5 h-4 w-4 opacity-70" />
            <span className="font-normal">Settings</span>
          </Link>
        </Button>
        
        <Button asChild variant="ghost" size="sm" className="hidden lg:flex">
          <Link to="/reports" className="flex items-center">
            <FiBarChart2 className="mr-1.5 h-4 w-4 opacity-70" />
            <span className="font-normal">Reports</span>
          </Link>
        </Button>
      </div>
    </div>
  )
})

DashboardHeader.displayName = 'DashboardHeader'

export default DashboardHeader