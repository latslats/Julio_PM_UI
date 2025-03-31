import { useState, useEffect, useMemo } from 'react'
import { useProjects } from '../context/ProjectContext'
import { FiPlay, FiPause, FiClock, FiCalendar, FiFilter, FiSearch, FiChevronDown, FiTrash2 } from 'react-icons/fi'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import TimeTrackingWidget from '../components/timeTracking/TimeTrackingWidget'

const TimeTracking = () => {
  const { projects, tasks, timeEntries, loading, startTimeTracking, deleteTimeEntry } = useProjects()
  const [weekDays, setWeekDays] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedTaskToStart, setSelectedTaskToStart] = useState('')

  useEffect(() => {
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
        return matchesSearch && matchesProject;
      })
      .sort((a, b) => parseISO(b.startTime) - parseISO(a.startTime));
  }, [timeEntries, tasks, projects, searchTerm, selectedProjectId]);

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
          onClick={() => selectedTaskToStart && startTimeTracking(selectedTaskToStart)}
          className="btn btn-primary flex items-center"
          disabled={!selectedTaskToStart || !!timeEntries.find(te => !te.endTime)}
        >
          <FiPlay className="mr-1.5 h-4 w-4" />
          Start Timer
        </button>
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

      <TimeTrackingWidget />

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
                    onClick={() => deleteTimeEntry(entry.id)}
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
