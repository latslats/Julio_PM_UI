import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiClock, FiCheckCircle, FiAlertCircle, FiActivity, FiPlus, FiArrowRight } from 'react-icons/fi'
import { format } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { motion } from "framer-motion"

// Components
import ProjectCard from '../components/projects/ProjectCard'
import TaskItem from '../components/tasks/TaskItem'
import TimeTrackingWidget from '../components/timeTracking/TimeTrackingWidget'

const Dashboard = () => {
  const { projects, tasks, timeEntries, loading, projectStats } = useProjects()
  const [recentProjects, setRecentProjects] = useState([])
  const [activeTimeEntry, setActiveTimeEntry] = useState(null)
  const [currentView, setCurrentView] = useState('overview') // State for segmented control
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

  // Derived state for "My Tasks" view - sorted non-completed tasks
  const myTasks = useMemo(() => {
    if (loading) return [];
    
    return tasks
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        // Sort by status first ('in progress' comes first)
        const statusOrder = { 'in progress': 0, 'pending': 1, 'not started': 2 }; // Adjust as needed
        const statusComparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusComparison !== 0) return statusComparison;
        
        // Then sort by due date (earliest first)
        const dateA = a.dueDate ? new Date(a.dueDate) : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate) : Infinity;
        return dateA - dateB;
      });
  }, [tasks, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" aria-hidden="true"></div>
          <p className="mt-3 text-secondary-600">Loading your dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header with welcome message */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-primary-500/5 to-accent-500/5 p-6 rounded-2xl"
      >
        <div>
          <h1 className="text-2xl font-semibold text-secondary-900">Welcome Back</h1>
          <p className="text-secondary-600 mt-1">Here's an overview of your work</p>
        </div>
        <div className="mt-3 sm:mt-0 text-sm font-medium text-secondary-500 bg-white px-4 py-2 rounded-lg shadow-sm">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 transition-transform duration-300 hover:scale-110">
                <FiActivity className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-secondary-900">{stats.totalProjects}</p>
                <p className="text-sm text-secondary-500">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 transition-transform duration-300 hover:scale-110">
                <FiCheckCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-secondary-900">{stats.completedTasks}</p>
                <p className="text-sm text-secondary-500">Completed Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 transition-transform duration-300 hover:scale-110">
                <FiAlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-secondary-900">{stats.pendingTasks}</p>
                <p className="text-sm text-secondary-500">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 transition-transform duration-300 hover:scale-110">
                <FiClock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-secondary-900">{stats.trackedHoursToday}</p>
                <p className="text-sm text-secondary-500">Hours Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Segmented Control (Toggle Group) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex justify-center"
      >
        <ToggleGroup 
          type="single" 
          defaultValue={currentView}
          variant="outline"
          onValueChange={(value) => {
            if (value) setCurrentView(value); // Update view state if a value is selected
          }}
          className="bg-white p-1 rounded-lg shadow-sm"
        >
          <ToggleGroupItem value="overview" aria-label="Show overview dashboard">
             Overview
          </ToggleGroupItem>
          <ToggleGroupItem value="my-tasks" aria-label="Show my tasks list">
             My Tasks
          </ToggleGroupItem>
          <ToggleGroupItem value="activity" aria-label="Show activity feed" disabled> {/* Disabled for now */}
             Activity
          </ToggleGroupItem>
        </ToggleGroup>
      </motion.div>

      {/* Conditional Content based on View */}
      <motion.div 
        key={currentView}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8"
      >
        {currentView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xl font-semibold">Recent Projects</CardTitle>
                  <Button variant="link" asChild className="p-0 h-auto text-sm transition-transform duration-200 hover:translate-x-1">
                    <Link to="/projects" aria-label="View all projects">
                      View All
                      <FiArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {recentProjects.map(project => {
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
                      <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mx-auto mb-3 animate-pulse">
                        <FiActivity className="h-8 w-8" aria-hidden="true" />
                      </div>
                      <p className="text-secondary-600 mb-4">No projects yet</p>
                      <Button asChild className="transition-all duration-300 hover:shadow-md">
                        <Link to="/projects" aria-label="Create a new project">
                          <FiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                          Create Project
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Tasks & Time Tracker */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Upcoming Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {myTasks.filter(t => t.dueDate && new Date(t.dueDate) >= new Date()).slice(0, 5).length > 0 ? (
                    <ul className="space-y-4">
                      {myTasks
                        .filter(t => t.dueDate && new Date(t.dueDate) >= new Date())
                        .slice(0, 5)
                        .map(task => (
                          <li key={task.id}>
                            <p className="font-medium text-secondary-800">{task.name}</p>
                            <p className="text-sm text-secondary-500">Due: {format(new Date(task.dueDate), 'PP')}</p>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="text-center py-6 bg-secondary-50/50 rounded-xl border border-dashed border-secondary-200">
                      <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mx-auto mb-3 animate-pulse">
                        <FiCheckCircle className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="text-secondary-600">No upcoming tasks</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <TimeTrackingWidget />
            </div>
          </div>
        )}

        {currentView === 'my-tasks' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-secondary-800">My Tasks</h2>
            <Card>
              <CardContent className="pt-6">
                {myTasks.length > 0 ? (
                  <div className="space-y-4 divide-y divide-secondary-100">
                    {myTasks.map(task => (
                      <TaskItem key={task.id} task={task} className="pt-4 first:pt-0" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-secondary-500">
                    <p>No active tasks found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'activity' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-secondary-800">Activity Feed</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-secondary-600">Activity Feed view will be implemented here (requires backend support).</p>
                {/* Placeholder for activity feed */}
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default Dashboard
