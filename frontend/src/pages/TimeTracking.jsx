import { useState, useEffect } from 'react'
import { useProjects } from '../context/ProjectContext'
import { FiPlay, FiPause, FiClock, FiCalendar, FiFilter, FiSearch } from 'react-icons/fi'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns'

const TimeTracking = () => {
  const { projects, tasks, timeEntries, loading, startTimeTracking } = useProjects()
  const [activeTimeEntry, setActiveTimeEntry] = useState(null)
  const [weekDays, setWeekDays] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  useEffect(() => {
    if (!loading) {
      // Find active time entry if any
      const active = timeEntries.find(entry => entry.endTime === null)
      setActiveTimeEntry(active)
      
      // Get days of current week
      const now = new Date()
      const start = startOfWeek(now, { weekStartsOn: 1 }) // Start on Monday
      const end = endOfWeek(now, { weekStartsOn: 1 }) // End on Sunday
      const days = eachDayOfInterval({ start, end })
      setWeekDays(days)
    }
  }, [timeEntries, loading])
  
  // Sample time entries for demonstration
  const demoTimeEntries = [
    {
      id: 'entry1',
      taskId: 'task1',
      startTime: new Date(new Date().setHours(9, 30)).toISOString(),
      endTime: new Date(new Date().setHours(11, 45)).toISOString(),
      duration: 8100000, // 2h 15m in ms
      notes: 'Completed initial design mockups'
    },
    {
      id: 'entry2',
      taskId: 'task2',
      startTime: new Date(new Date().setHours(13, 0)).toISOString(),
      endTime: new Date(new Date().setHours(15, 30)).toISOString(),
      duration: 9000000, // 2h 30m in ms
      notes: 'Implemented responsive navigation'
    },
    {
      id: 'entry3',
      taskId: 'task3',
      startTime: new Date(new Date().setHours(16, 0)).toISOString(),
      endTime: new Date(new Date().setHours(17, 15)).toISOString(),
      duration: 4500000, // 1h 15m in ms
      notes: 'Optimized image assets'
    }
  ]
  
  const allTimeEntries = timeEntries.length > 0 ? timeEntries : demoTimeEntries
  
  // Format duration in hours and minutes
  const formatDuration = (durationMs) => {
    const hours = Math.floor(durationMs / 3600000)
    const minutes = Math.floor((durationMs % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }
  
  // Get task and project info for a time entry
  const getEntryInfo = (entry) => {
    const task = tasks.find(t => t.id === entry.taskId) || {
      id: entry.taskId,
      title: 'Sample Task',
      projectId: 'demo1'
    }
    
    const project = projects.find(p => p.id === task.projectId) || {
      id: 'demo1',
      name: 'Website Redesign',
      color: '#0ea5e9'
    }
    
    return { task, project }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading time tracking data...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-secondary-900">Time Tracking</h1>
        <button 
          onClick={() => startTimeTracking('task2')} 
          className="btn btn-primary flex items-center"
        >
          <FiPlay className="mr-1.5 h-4 w-4" />
          Start Timer
        </button>
      </div>
      
      {/* Weekly Overview */}
      <div className="card">
        <h2 className="text-lg font-medium text-secondary-900 mb-4">Weekly Overview</h2>
        
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day)
            
            // Calculate total hours for this day (demo data)
            const hoursWorked = isCurrentDay ? 6 : index % 2 === 0 ? 8 : 7
            
            return (
              <div 
                key={index}
                className={`p-3 rounded-lg text-center ${
                  isCurrentDay 
                    ? 'bg-primary-50 border border-primary-200' 
                    : 'bg-secondary-50'
                }`}
              >
                <p className={`text-xs font-medium ${
                  isCurrentDay ? 'text-primary-700' : 'text-secondary-500'
                }`}>
                  {format(day, 'EEE')}
                </p>
                <p className={`text-lg font-semibold ${
                  isCurrentDay ? 'text-primary-700' : 'text-secondary-900'
                }`}>
                  {format(day, 'd')}
                </p>
                <p className={`text-xs mt-1 ${
                  isCurrentDay ? 'text-primary-600' : 'text-secondary-600'
                }`}>
                  {hoursWorked}h
                </p>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-secondary-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-secondary-50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-secondary-500 uppercase mb-1">Today</h3>
            <p className="text-2xl font-semibold text-secondary-900">6h 0m</p>
          </div>
          
          <div className="bg-secondary-50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-secondary-500 uppercase mb-1">This Week</h3>
            <p className="text-2xl font-semibold text-secondary-900">32h 15m</p>
          </div>
          
          <div className="bg-secondary-50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-secondary-500 uppercase mb-1">This Month</h3>
            <p className="text-2xl font-semibold text-secondary-900">126h 30m</p>
          </div>
        </div>
      </div>
      
      {/* Time Entries */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-secondary-900">Recent Time Entries</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-secondary-400" />
              </div>
              <select className="input pl-9 pr-8 py-1.5 text-sm">
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>Last Week</option>
                <option>This Month</option>
              </select>
            </div>
            
            <button className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100">
              <FiFilter className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-secondary-400" />
          </div>
          <input
            type="text"
            placeholder="Search time entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full mb-4"
          />
        </div>
        
        {allTimeEntries.length > 0 ? (
          <div className="divide-y divide-secondary-100">
            {allTimeEntries.map(entry => {
              const { task, project } = getEntryInfo(entry)
              
              return (
                <div key={entry.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: project.color ? `${project.color}20` : '#e0f2fe',
                        color: project.color || '#0ea5e9'
                      }}
                    >
                      <FiClock className="h-5 w-5" />
                    </div>
                    
                    <div className="ml-3">
                      <h3 className="font-medium text-secondary-900">{task.title}</h3>
                      <div className="flex items-center text-xs text-secondary-500 mt-0.5">
                        <span>{project.name}</span>
                        <span className="mx-1.5">•</span>
                        <span>
                          {format(new Date(entry.startTime), 'h:mm a')} - {entry.endTime ? format(new Date(entry.endTime), 'h:mm a') : 'Running'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-secondary-900">
                      {entry.endTime ? formatDuration(entry.duration || new Date(entry.endTime) - new Date(entry.startTime)) : 'Running'}
                    </div>
                    <div className="text-xs text-secondary-500 mt-0.5">
                      {entry.notes || 'No notes'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-secondary-50 rounded-lg">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
              <FiClock className="h-8 w-8" />
            </div>
            <h3 className="text-secondary-900 font-medium mb-1">No time entries yet</h3>
            <p className="text-secondary-600 text-sm mb-4">
              Start tracking time on your tasks to see entries here
            </p>
            <button className="btn btn-primary inline-flex items-center">
              <FiPlay className="mr-1.5 h-4 w-4" />
              Start Timer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimeTracking
