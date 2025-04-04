import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { useWaitingItems } from '../context/WaitingItemContext'
import { FiClock, FiCheckCircle, FiAlertCircle, FiActivity, FiPlus, FiArrowRight, FiFilter, FiChevronDown, FiChevronUp, FiCoffee } from 'react-icons/fi'
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import logo from "../assets/taskflow_logo.png"

// Components
import ProjectCard from '../components/projects/ProjectCard'
import TaskItem from '../components/tasks/TaskItem'
import TimeTrackingWidget from '../components/timeTracking/TimeTrackingWidget'
import WaitingItemCard from '../components/waitingItems/WaitingItemCard'
import WaitingItemForm from '../components/waitingItems/WaitingItemForm'
import WaitingItemStats from '../components/waitingItems/WaitingItemStats'

const Dashboard = () => {
  const { projects, tasks, timeEntries, loading, projectStats } = useProjects()
  
  // Safely get waiting items context with error handling
  let waitingItemsContext = { waitingItems: [], loading: false };
  try {
    waitingItemsContext = useWaitingItems() || { waitingItems: [], loading: false };
  } catch (error) {
    console.error("Error loading waiting items context:", error);
  }
  
  const { 
    waitingItems = [], 
    loading: waitingLoading = false, 
    fetchWaitingItems = () => {}, 
    fetchStats = () => {}, 
    stats: waitingStats = { 
      byStatus: {}, 
      byPriority: {}, 
      avgWaitDays: 0, 
      total: 0 
    } 
  } = waitingItemsContext;
  
  const [recentProjects, setRecentProjects] = useState([])
  const [activeTimeEntry, setActiveTimeEntry] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState({
    totalProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    trackedHoursToday: 0
  })
  const [showWaitingStats, setShowWaitingStats] = useState(true)
  const [showAddWaitingModal, setShowAddWaitingModal] = useState(false)
  const [hideCompletedItems, setHideCompletedItems] = useState(true)
  const [waitingFeaturesAvailable, setWaitingFeaturesAvailable] = useState(false)
  
  // Refs to prevent multiple simultaneous API calls
  const waitingItemsLoaded = useRef(false);
  const waitingFetchAttempts = useRef(0);
  const MAX_FETCH_ATTEMPTS = 2;

  // Effect for main dashboard data
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

  // Fetch waiting items and stats when component mounts, with attempt limiting
  useEffect(() => {
    // Skip if already loaded or too many attempts
    if (waitingItemsLoaded.current || waitingFetchAttempts.current >= MAX_FETCH_ATTEMPTS) {
      return;
    }

    const loadWaitingItems = async () => {
      try {
        waitingFetchAttempts.current++;
        
        // Load data - avoid redundant calls
        await fetchWaitingItems();
        await fetchStats();
        
        // Mark as loaded if successful
        waitingItemsLoaded.current = true;
        setWaitingFeaturesAvailable(true);
      } catch (error) {
        console.error("Error fetching waiting items:", error);
        
        // Backoff before potential retry
        if (waitingFetchAttempts.current < MAX_FETCH_ATTEMPTS) {
          console.log(`Waiting items fetch failed. Will retry in ${waitingFetchAttempts.current * 2}s`);
        } else {
          setWaitingFeaturesAvailable(false);
          console.log("Waiting items fetch failed after maximum attempts. Disabling waiting features.");
        }
      }
    };

    // Only load if the tab becomes active or on first mount
    if (activeTab === "waitingOn" || waitingFetchAttempts.current === 0) {
      loadWaitingItems();
    }
  }, [activeTab]);  // Only re-run when tab changes

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

  // Get upcoming tasks
  const upcomingTasks = useMemo(() => {
    return myTasks
      .filter(t => t.dueDate && new Date(t.dueDate) >= new Date())
      .slice(0, 5);
  }, [myTasks]);

  // Filter waiting items for display
  const filteredWaitingItems = useMemo(() => {
    if (!waitingFeaturesAvailable || waitingLoading || !waitingItems?.length) return [];
    
    try {
      return waitingItems
        .filter(item => hideCompletedItems ? item.status !== 'completed' : true)
        .sort((a, b) => {
          // Sort by priority (high comes first)
          const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
          const priorityComparison = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
          if (priorityComparison !== 0) return priorityComparison;
          
          // Then sort by deadline (earliest first)
          const dateA = a.deadlineDate ? new Date(a.deadlineDate) : Infinity;
          const dateB = b.deadlineDate ? new Date(b.deadlineDate) : Infinity;
          return dateA - dateB;
        });
    } catch (error) {
      console.error("Error filtering waiting items:", error);
      return [];
    }
  }, [waitingItems, waitingLoading, hideCompletedItems, waitingFeaturesAvailable]);

  // Get status class for badge
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get priority class for badge
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddWaitingClick = () => {
    setShowAddWaitingModal(true);
  };

  const handleWaitingFormClose = () => {
    setShowAddWaitingModal(false);
  };

  // Handler for tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
  };

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
    <div className="relative pb-10">
      {/* Pug logo backdrop */}
      <div className="absolute inset-x-0 mx-auto top-[-70px] flex justify-center opacity-[0.07] pointer-events-none z-[1] overflow-hidden">
        <img src={logo} alt="Pugress Logo" className="w-[400px] object-contain" />
      </div>

      {/* Dashboard header with welcome message and date */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-primary-500/5 to-accent-500/5 p-6 rounded-2xl">
          <div>
            <h1 className="text-2xl font-semibold text-secondary-900">Welcome Back</h1>
            <p className="text-secondary-600 mt-1">Here's an overview of your work</p>
          </div>
          <div className="mt-3 sm:mt-0 text-sm font-medium text-secondary-500 bg-white px-4 py-2 rounded-lg shadow-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* Stats overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<FiActivity className="h-6 w-6" />}
          value={stats.totalProjects}
          label="Active Projects"
          bgColor="bg-primary-500/10"
          textColor="text-primary-600"
        />
        
        <StatCard 
          icon={<FiCheckCircle className="h-6 w-6" />}
          value={stats.completedTasks}
          label="Completed Tasks"
          bgColor="bg-green-500/10"
          textColor="text-green-600"
        />
        
        <StatCard 
          icon={<FiAlertCircle className="h-6 w-6" />}
          value={stats.pendingTasks}
          label="Pending Tasks"
          bgColor="bg-amber-500/10"
          textColor="text-amber-600"
        />
        
        <StatCard 
          icon={<FiClock className="h-6 w-6" />}
          value={stats.trackedHoursToday}
          label="Hours Today"
          bgColor="bg-accent-500/10"
          textColor="text-accent-600"
        />
      </div>

      {/* Dashboard content tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="myTasks">My Tasks</TabsTrigger>
          <TabsTrigger value="waitingOn">Waiting On</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Time tracking and task summary section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time tracking column */}
            <div className="space-y-6">
              <TimeTrackingWidget />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Upcoming Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingTasks.length > 0 ? (
                    <ul className="space-y-4">
                      {upcomingTasks.map(task => (
                        <li key={task.id}>
                          <p className="font-medium text-secondary-800">{task.name}</p>
                          <p className="text-sm text-secondary-500">Due: {format(new Date(task.dueDate), 'PP')}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState 
                      icon={<FiCheckCircle className="h-6 w-6" />}
                      title="No upcoming tasks"
                      description="Your schedule is clear"
                      compact
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Task summary column - Shows important waiting items and task summaries */}
            <div className="lg:col-span-2 space-y-6">
              {/* Task Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Task Progress</CardTitle>
                  <CardDescription>Overall progress on your active tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  {myTasks.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-amber-50 rounded-lg p-4 text-center">
                          <p className="text-lg font-bold text-amber-700">{myTasks.filter(t => t.status === 'not started').length}</p>
                          <p className="text-xs text-amber-600">Not Started</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <p className="text-lg font-bold text-blue-700">{myTasks.filter(t => t.status === 'in progress').length}</p>
                          <p className="text-xs text-blue-600">In Progress</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <p className="text-lg font-bold text-green-700">{stats.completedTasks}</p>
                          <p className="text-xs text-green-600">Completed</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium text-sm text-secondary-700 mb-2">Recent tasks:</p>
                        <div className="space-y-2">
                          {myTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="flex items-center justify-between p-2 bg-secondary-50 rounded-md">
                              <div className="overflow-hidden">
                                <p className="font-medium text-secondary-800 truncate">{task.name}</p>
                              </div>
                              <Badge variant={task.status === 'in progress' ? 'default' : 'outline'} className="ml-2 whitespace-nowrap">
                                {task.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-center">
                          <Button variant="outline" size="sm" asChild>
                            <Link to="#myTasks" onClick={() => setActiveTab("myTasks")}>
                              View All Tasks
                              <FiArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<FiCheckCircle className="h-8 w-8" />}
                      title="No active tasks"
                      description="You're all caught up!"
                    />
                  )}
                </CardContent>
              </Card>
              
              {waitingFeaturesAvailable && filteredWaitingItems.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-xl font-semibold">Waiting On</CardTitle>
                      <CardDescription>Items you're waiting on from others</CardDescription>
                    </div>
                    <Button variant="link" asChild className="p-0 h-auto text-sm transition-transform duration-200 hover:translate-x-1">
                      <Link to="#" onClick={() => setActiveTab("waitingOn")}>
                        View All
                        <FiArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredWaitingItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-secondary-100 rounded-lg">
                          <div className="overflow-hidden">
                            <p className="font-medium text-secondary-800 truncate">{item.requestType}</p>
                            <p className="text-xs text-secondary-500 truncate">From: {item.requestedFrom}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge className="mb-1" variant="outline" 
                              style={{ backgroundColor: `${getPriorityClass(item.priority)}10`, 
                                      borderColor: getPriorityClass(item.priority), 
                                      color: getPriorityClass(item.priority) }}>
                              {item.priority || 'Medium'}
                            </Badge>
                            <Badge variant="outline" 
                              style={{ backgroundColor: `${getStatusClass(item.status)}10`, 
                                      borderColor: getStatusClass(item.status), 
                                      color: getStatusClass(item.status) }}>
                              {item.status || 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          {/* Recent Projects Section (moved to bottom) */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div className="mb-2 sm:mb-0 sm:max-w-[60%]">
                  <CardTitle className="text-xl font-semibold mb-1">Recent Projects</CardTitle>
                  <CardDescription className="text-sm">Your most recently updated projects</CardDescription>
                </div>
                <Button variant="link" asChild className="p-0 h-auto text-sm sm:ml-auto transition-transform duration-200 hover:translate-x-1">
                  <Link to="/projects" aria-label="View all projects">
                    View All
                    <FiArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                <EmptyState 
                  icon={<FiActivity className="h-8 w-8" />}
                  title="No projects yet"
                  description="Get started by creating your first project"
                  action={
                    <Button asChild>
                      <Link to="/projects">
                        <FiPlus className="mr-2 h-4 w-4" />
                        Create Project
                      </Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* My Tasks Tab */}
        <TabsContent value="myTasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">My Tasks</CardTitle>
              <CardDescription>View and manage your active tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {myTasks.length > 0 ? (
                <div className="space-y-4 divide-y divide-secondary-100">
                  {myTasks.map(task => (
                    <TaskItem key={task.id} task={task} className="pt-4 first:pt-0" />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={<FiCheckCircle className="h-8 w-8" />}
                  title="No active tasks"
                  description="You're all caught up!"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Waiting On Tab (previously Activity) */}
        <TabsContent value="waitingOn">
          {waitingFeaturesAvailable ? (
            <div className="space-y-6">
              {/* Static Waiting Summary - No API Calls */}
              <Card>
                <CardContent className="pt-6">
                  {waitingStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Requests Card */}
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-primary-50 to-primary-100">
                              <FiActivity className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-secondary-500">Total Requests</h3>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-3xl font-semibold text-secondary-900">{waitingStats.total || 0}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* High Priority */}
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-red-50 to-red-100">
                              <FiAlertCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-secondary-500">High Priority</h3>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-3xl font-semibold text-secondary-900">{waitingStats.byPriority?.high || 0}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Average Wait Time */}
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-blue-50 to-blue-100">
                              <FiClock className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-secondary-500">Average Wait Time</h3>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-3xl font-semibold text-secondary-900">
                              {typeof waitingStats.avgWaitDays === 'number' ? waitingStats.avgWaitDays?.toFixed(1) : '0.0'} <span className="text-xl">days</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Completion Rate */}
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-green-50 to-green-100">
                              <FiCheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-secondary-500">Completion Rate</h3>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-3xl font-semibold text-secondary-900">
                              {waitingStats.total > 0 ? Math.round((waitingStats.byStatus?.completed || 0) / waitingStats.total * 100) : 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Waiting Items List */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-xl font-semibold">Waiting Requests</CardTitle>
                    <CardDescription>Items you're waiting on from external parties</CardDescription>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="hide-completed" className="text-sm text-secondary-500 cursor-pointer">
                        Hide Completed
                      </label>
                      <input 
                        type="checkbox" 
                        id="hide-completed" 
                        checked={hideCompletedItems} 
                        onChange={() => setHideCompletedItems(!hideCompletedItems)}
                        className="rounded text-primary-500 focus:ring-primary-500 cursor-pointer"
                      />
                    </div>
                    <Button size="sm" onClick={handleAddWaitingClick}>
                      <FiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                      New Request
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredWaitingItems.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredWaitingItems.map(item => (
                        <WaitingItemCard 
                          key={item.id} 
                          item={item} 
                          getStatusClass={getStatusClass}
                          getPriorityClass={getPriorityClass}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<FiClock className="h-8 w-8" />}
                      title={hideCompletedItems ? "No active waiting items" : "No waiting items found"}
                      description="Track things you're waiting for from others"
                      action={
                        <Button onClick={handleAddWaitingClick}>
                          <FiPlus className="mr-2 h-4 w-4" />
                          Add Waiting Item
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Waiting Items</CardTitle>
                <CardDescription>Track requests from external parties</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState 
                  icon={<FiCoffee className="h-8 w-8" />}
                  title="Waiting items functionality unavailable"
                  description="The waiting items service is currently unavailable"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Waiting Item Modal - Only show if features are available */}
      {waitingFeaturesAvailable && showAddWaitingModal && (
        <WaitingItemForm
          onClose={handleWaitingFormClose}
          onSubmit={() => setShowAddWaitingModal(false)}
          projects={projects}
        />
      )}
    </div>
  )
}

// Reusable stat card component
const StatCard = ({ icon, value, label, bgColor, textColor }) => (
  <Card className="transition-all duration-300 hover:shadow-md">
    <CardContent className="pt-6">
      <div className="flex items-center">
        <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center ${textColor} transition-transform duration-300 hover:scale-110`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-3xl font-bold text-secondary-900">{value}</p>
          <p className="text-sm text-secondary-500">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Reusable empty state component
const EmptyState = ({ icon, title, description, action, compact = false }) => (
  <div className={`text-center ${compact ? 'py-6' : 'py-8'} bg-secondary-50/50 rounded-xl border border-dashed border-secondary-200`}>
    <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mx-auto mb-3 ${!action && 'animate-pulse'}`}>
      {icon}
    </div>
    <p className="text-secondary-600 font-medium">{title}</p>
    {description && <p className="text-secondary-500 text-sm mt-1 mb-4">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default Dashboard
