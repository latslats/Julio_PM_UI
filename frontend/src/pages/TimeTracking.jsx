import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { useNotification } from '../context/NotificationContext'
import { FiPlay, FiClock, FiCalendar, FiFilter, FiSearch, FiChevronDown, FiTrash2, FiX, FiChevronLeft } from 'react-icons/fi'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, parseISO, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isWithinInterval } from 'date-fns'
import TimeTrackingWidget from '../components/timeTracking/TimeTrackingWidget'
import RunningTimersWidget from '../components/timeTracking/RunningTimersWidget'

const TimeTracking = () => {
  const { projects, tasks, timeEntries, loading, startTimeTracking, deleteTimeEntry } = useProjects()
  const { showNotification } = useNotification()
  const [weekDays, setWeekDays] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedTaskToStart, setSelectedTaskToStart] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null })
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'completed', 'active'

  useEffect(() => {
    console.log('TimeTracking component mounted')
    console.log('Projects:', projects)
    console.log('Tasks:', tasks)
    console.log('Time Entries:', timeEntries)
    console.log('Loading state:', loading)
    
    const now = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 })
    const end = endOfWeek(now, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })
    setWeekDays(days)
  }, [])

  const formatDuration = (totalSeconds) => {
    if (totalSeconds == null || totalSeconds < 0) return '0h 0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getEntryInfo = (entry) => {
    const task = tasks.find(t => t.id === entry.taskId)
    const project = task ? projects.find(p => p.id === task.projectId) : null
    return { task, project }
  }

  const timeStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let todaySeconds = 0;
    let weekSeconds = 0;
    let monthSeconds = 0;

    const dailySeconds = {};
    weekDays.forEach(day => {
      dailySeconds[format(day, 'yyyy-MM-dd')] = 0;
    });

    timeEntries.forEach(entry => {
      const entryDate = parseISO(entry.startTime);
      const duration = entry.duration ? parseFloat(entry.duration) : 0;

      if (duration > 0) {
        const dayKey = format(entryDate, 'yyyy-MM-dd');
        if (dayKey in dailySeconds) {
          dailySeconds[dayKey] += duration;
        }

        if (isToday(entryDate)) {
          todaySeconds += duration;
        }
        if (entryDate >= weekStart && entryDate <= weekEnd) {
          weekSeconds += duration;
        }
        if (entryDate >= monthStart && entryDate <= monthEnd) {
          monthSeconds += duration;
        }
      }
    });

    return {
      today: formatDuration(todaySeconds),
      week: formatDuration(weekSeconds),
      month: formatDuration(monthSeconds),
      daily: weekDays.map(day => formatDuration(dailySeconds[format(day, 'yyyy-MM-dd')] || 0))
    };
  }, [timeEntries, weekDays]);

  // Get date range based on selection
  const getDateRangeInterval = useMemo(() => {
    const now = new Date();
    let start, end;
    
    switch (dateRange) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        start = new Date(subDays(now, 1).setHours(0, 0, 0, 0));
        end = new Date(subDays(now, 1).setHours(23, 59, 59, 999));
        break;
      case 'thisWeek':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'custom':
        start = customDateRange.start;
        end = customDateRange.end;
        break;
      default: // 'all'
        return null;
    }
    
    return { start, end };
  }, [dateRange, customDateRange]);

  const filteredTimeEntries = useMemo(() => {
    return timeEntries
      .filter(entry => {
        const { task, project } = getEntryInfo(entry);
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = (
          task?.title.toLowerCase().includes(searchTermLower) ||
          project?.name.toLowerCase().includes(searchTermLower) ||
          entry.notes?.toLowerCase().includes(searchTermLower)
        );
        const matchesProject = !selectedProjectId || project?.id === selectedProjectId;
        
        // Date range filtering
        let matchesDateRange = true;
        if (getDateRangeInterval) {
          const entryDate = parseISO(entry.startTime);
          matchesDateRange = isWithinInterval(entryDate, getDateRangeInterval);
        }
        
        // Status filtering
        let matchesStatus = true;
        if (filterStatus !== 'all') {
          if (filterStatus === 'completed') {
            matchesStatus = entry.endTime !== null;
          } else if (filterStatus === 'active') {
            matchesStatus = entry.endTime === null;
          }
        }
        
        return matchesSearch && matchesProject && matchesDateRange && matchesStatus;
      })
      .sort((a, b) => parseISO(b.startTime) - parseISO(a.startTime));
  }, [timeEntries, tasks, projects, searchTerm, selectedProjectId, getDateRangeInterval, filterStatus]);

  // Handle filter button click
  const handleFilterClick = () => {
    setShowFilterModal(true);
  };
  
  // Handle date range change
  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
  };
  
  // Handle custom date range change
  const handleCustomDateChange = (field, value) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: value ? new Date(value) : null
    }));
  };
  
  // Handle time entry deletion with confirmation
  const handleDeleteTimeEntry = (entryId) => {
    if (window.confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
      deleteTimeEntry(entryId);
    }
  };
  
  console.log('Rendering TimeTracking, loading state:', loading)
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading time tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-900 mb-1">
            <FiChevronLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-secondary-900">Time Tracking</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select 
              value={selectedTaskToStart}
              onChange={(e) => setSelectedTaskToStart(e.target.value)}
              className="input py-1.5 text-sm appearance-none"
            >
              <option value="">Select a task...</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title} ({projects.find(p => p.id === task.projectId)?.name || 'Unknown'})
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => selectedTaskToStart && startTimeTracking(selectedTaskToStart)}
            className="btn btn-primary flex items-center"
            disabled={!selectedTaskToStart}
          >
            <FiPlay className="mr-1.5 h-4 w-4" />
            Start Timer
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-medium text-secondary-900 mb-4">Weekly Overview</h2>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day)

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
                  {timeStats.daily[index]}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-secondary-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-secondary-50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-secondary-500 uppercase mb-1">Today</h3>
            <p className="text-2xl font-semibold text-secondary-900">{timeStats.today}</p>
          </div>

          <div className="bg-secondary-50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-secondary-500 uppercase mb-1">This Week</h3>
            <p className="text-2xl font-semibold text-secondary-900">{timeStats.week}</p>
          </div>

          <div className="bg-secondary-50 rounded-lg p-4">
            <h3 className="text-xs font-medium text-secondary-500 uppercase mb-1">This Month</h3>
            <p className="text-2xl font-semibold text-secondary-900">{timeStats.month}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeTrackingWidget />
        <RunningTimersWidget />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-secondary-900">Recent Time Entries</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="input pr-8 py-1.5 text-sm appearance-none"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <FiChevronDown className="h-4 w-4 text-secondary-400" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-4 w-4 text-secondary-400" />
              </div>
              <select 
                className="input pl-9 pr-8 py-1.5 text-sm"
                value={dateRange}
                onChange={handleDateRangeChange}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <button 
              onClick={handleFilterClick}
              className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100"
              title="Additional Filters"
            >
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

        {filteredTimeEntries.length > 0 ? (
          <div className="divide-y divide-secondary-100">
            {filteredTimeEntries.map(entry => {
              const { task, project } = getEntryInfo(entry)

              return (
                <div key={entry.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: project?.color ? `${project.color}20` : '#e0f2fe',
                        color: project?.color || '#0ea5e9'
                      }}
                    >
                      <FiClock className="h-5 w-5" />
                    </div>

                    <div className="ml-3">
                      <h3 className="font-medium text-secondary-900">{task?.title}</h3>
                      <div className="flex items-center text-xs text-secondary-500 mt-0.5">
                        <span>{project?.name}</span>
                        <span className="mx-1.5">•</span>
                        <span>
                          {format(new Date(entry.startTime), 'h:mm a')} - {entry.endTime ? format(new Date(entry.endTime), 'h:mm a') : 'Now'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-secondary-900">
                      {formatDuration(entry.duration)}
                    </div>
                    <div className="text-xs text-secondary-500 mt-0.5">
                      {entry.notes || 'No notes'}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDeleteTimeEntry(entry.id)}
                    className="ml-4 p-1 text-secondary-400 hover:text-red-500"
                    title="Delete Entry"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
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
            <div className="flex flex-col space-y-2 items-center">
              <select 
                value={selectedTaskToStart}
                onChange={(e) => setSelectedTaskToStart(e.target.value)}
                className="input py-1.5 text-sm appearance-none w-full"
              >
                <option value="">Select a task...</option>
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title} ({projects.find(p => p.id === task.projectId)?.name || 'Unknown'})
                  </option>
                ))}
              </select>
              <button 
                onClick={() => selectedTaskToStart && startTimeTracking(selectedTaskToStart)}
                className="btn btn-primary inline-flex items-center w-full"
                disabled={!selectedTaskToStart}
              >
                <FiPlay className="mr-1.5 h-4 w-4" />
                Start Timer
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-secondary-100">
              <h3 className="text-lg font-medium text-secondary-900">Filter Time Entries</h3>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Entry Status
                </label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input w-full"
                >
                  <option value="all">All Entries</option>
                  <option value="completed">Completed Only</option>
                  <option value="active">Active Only</option>
                </select>
              </div>
              
              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-secondary-700">
                    Custom Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-secondary-500 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        className="input w-full" 
                        value={customDateRange.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary-500 mb-1">End Date</label>
                      <input 
                        type="date" 
                        className="input w-full" 
                        value={customDateRange.end ? format(customDateRange.end, 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                        min={customDateRange.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-secondary-100 flex justify-end space-x-2">
              <button 
                onClick={() => {
                  setFilterStatus('all');
                  if (dateRange === 'custom') {
                    setCustomDateRange({ start: null, end: null });
                  }
                }}
                className="btn bg-white text-secondary-800 border border-secondary-200 hover:bg-secondary-50"
              >
                Reset Filters
              </button>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="btn btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeTracking
