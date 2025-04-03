import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiClock, FiCheckCircle, FiAlertCircle, FiActivity, FiPlus, FiArrowRight } from 'react-icons/fi'
import { format } from 'date-fns'

// Components
import ProjectCard from '../components/projects/ProjectCard'
import TaskItem from '../components/tasks/TaskItem'
import TimeTrackingWidget from '../components/timeTracking/TimeTrackingWidget'

const Dashboard = () => {
  const { projects, tasks, timeEntries, loading, projectStats } = useProjects()
  const [recentProjects, setRecentProjects] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState([])
  const [activeTimeEntry, setActiveTimeEntry] = useState(null)
  const [stats, setStats] = useState({
    totalProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    trackedHoursToday: 0
  })

  useEffect(() => {
    if (!loading) {
      // Get recent projects (last 4)
      const sortedProjects = [...projects].sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      ).slice(0, 4)
      setRecentProjects(sortedProjects)

      // Get upcoming tasks (due soon, not completed)
      const now = new Date()
      const upcoming = tasks
        .filter(task => task.status !== 'completed' && task.dueDate && new Date(task.dueDate) >= now)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
      setUpcomingTasks(upcoming)

      // Find active time entry if any
      const active = timeEntries.find(entry => entry.endTime === null)
      setActiveTimeEntry(active)

      // Calculate stats
      const completed = tasks.filter(task => task.status === 'completed').length
      const pending = tasks.filter(task => task.status !== 'completed').length
      
      // Calculate hours tracked today
      const today = new Date().setHours(0, 0, 0, 0)
      const todayEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.startTime).setHours(0, 0, 0, 0)
        return entryDate === today
      })
      
      const trackedMinutes = todayEntries.reduce((total, entry) => {
        const start = new Date(entry.startTime)
        const end = entry.endTime ? new Date(entry.endTime) : new Date()
        return total + (end - start) / 60000 // convert ms to minutes
      }, 0)
      
      setStats({
        totalProjects: projects.length,
        completedTasks: completed,
        pendingTasks: pending,
        trackedHoursToday: Math.round(trackedMinutes / 6) / 10 // round to 1 decimal
      })
    }
  }, [projects, tasks, timeEntries, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with welcome message */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-primary-500/5 to-accent-500/5 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-secondary-900">Welcome Back</h1>
          <p className="text-secondary-600 mt-1">Here's an overview of your work</p>
        </div>
        <div className="mt-3 sm:mt-0 text-sm font-medium text-secondary-500 bg-white px-4 py-2 rounded-lg shadow-sm">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-100 transition-all duration-300 hover:shadow-md hover:border-primary-200">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600">
              <FiActivity className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-secondary-900">{stats.totalProjects}</p>
              <p className="text-sm text-secondary-500">Active Projects</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-100 transition-all duration-300 hover:shadow-md hover:border-green-200">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
              <FiCheckCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-secondary-900">{stats.completedTasks}</p>
              <p className="text-sm text-secondary-500">Completed Tasks</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-100 transition-all duration-300 hover:shadow-md hover:border-amber-200">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <FiAlertCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-secondary-900">{stats.pendingTasks}</p>
              <p className="text-sm text-secondary-500">Pending Tasks</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-100 transition-all duration-300 hover:shadow-md hover:border-accent-200">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600">
              <FiClock className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-secondary-900">{stats.trackedHoursToday}</p>
              <p className="text-sm text-secondary-500">Hours Today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-secondary-900">Recent Projects</h2>
              <Link to="/projects" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center transition-colors">
                View All
                <FiArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {recentProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {recentProjects.map(project => {
                  // Enhance project with stats from projectStats
                  const stats = projectStats[project.id] || { totalTasks: 0, completedTasks: 0, totalHours: 0, progress: 0 };
                  const enhancedProject = {
                    ...project,
                    totalTasks: stats.totalTasks,
                    completedTasks: stats.completedTasks,
                    totalHours: stats.totalHours,
                    progress: stats.progress
                  };
                  return <ProjectCard key={project.id} project={enhancedProject} />;
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-secondary-50/50 rounded-xl border border-dashed border-secondary-200">
                <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mx-auto mb-3">
                  <FiActivity className="h-8 w-8" />
                </div>
                <p className="text-secondary-600 mb-4">No projects yet</p>
                <Link 
                  to="/projects" 
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 shadow-sm transition-colors"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Time Tracking Widget */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-100 h-full">
            <h2 className="text-xl font-semibold text-secondary-900 mb-6">Time Tracking</h2>
            <TimeTrackingWidget />
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-secondary-900">Upcoming Tasks</h2>
          <Link to="/projects" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center transition-colors">
            View All Tasks
            <FiArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        {upcomingTasks.length > 0 ? (
          <div className="divide-y divide-secondary-100">
            {upcomingTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-secondary-50/50 rounded-xl border border-dashed border-secondary-200">
            <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mx-auto mb-3">
              <FiCheckCircle className="h-8 w-8" />
            </div>
            <p className="text-secondary-600">No upcoming tasks</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
