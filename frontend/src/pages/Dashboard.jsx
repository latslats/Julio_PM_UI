import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { useWaitingItems } from '../context/WaitingItemContext'
import { FiClock, FiCheckCircle, FiAlertCircle, FiActivity, FiPlus, FiArrowRight, FiFilter, FiChevronDown, FiChevronUp, FiCoffee, FiSettings, FiBarChart2, FiFolder } from 'react-icons/fi'
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
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
  const { 
    projects, 
    tasks, 
    timeEntries, 
    loading, 
    projectStats, 
    stopTimeTracking, 
    startTimeTracking, 
    pauseTimeTracking, 
    resumeTimeTracking, 
    fetchActiveTimers 
  } = useProjects()

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
      // Calculate stats for each project
      const projectsWithStats = projects.map(project => {
        const projectTasks = tasks.filter(task => task.projectId === project.id);
        const completed = projectTasks.filter(task => task.status === 'completed').length;
        const total = projectTasks.length;
        
        const projectTimeEntries = timeEntries.filter(entry => 
          projectTasks.some(task => task.id === entry.taskId) && entry.duration
        );
        const totalTrackedSeconds = projectTimeEntries.reduce((sum, entry) => sum + parseFloat(entry.duration || 0), 0);
        const totalHours = parseFloat((totalTrackedSeconds / 3600).toFixed(1)); // Round to 1 decimal place

        return {
          ...project,
          totalTasks: total,
          completedTasks: completed,
          totalHours: totalHours
        };
      });

      // Get recent projects (last 4) with stats
      const sortedProjects = [...projectsWithStats].sort((a, b) =>
        // Sort by createdAt or updatedAt - choose one, e.g., createdAt for newest projects
        new Date(b.createdAt) - new Date(a.createdAt) // Or use b.updatedAt if preferred
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
  }, [activeTab, fetchWaitingItems, fetchStats]); // Added dependencies
  

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
        const dateA = a.dueDate ? parseISO(a.dueDate) : Infinity; // Use parseISO for safety
        const dateB = b.dueDate ? parseISO(b.dueDate) : Infinity; // Use parseISO for safety
        return dateA - dateB;
      });
  }, [tasks, loading]);

  // Get upcoming tasks
  const upcomingTasks = useMemo(() => {
    return myTasks
      .filter(t => t.dueDate && isAfter(parseISO(t.dueDate), new Date())) // Use isAfter and parseISO
      .slice(0, 5);
  }, [myTasks]);

  // Filter waiting items for display
  
  const filteredWaitingItems = useMemo(() => {
    // Return early if waiting features are not available or still loading, or no items exist
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
          const dateA = a.deadlineDate ? parseISO(a.deadlineDate) : Infinity; // Use parseISO
          const dateB = b.deadlineDate ? parseISO(b.deadlineDate) : Infinity; // Use parseISO
          return dateA - dateB;
        });
    } catch (error) {
      console.error("Error filtering waiting items:", error);
      return [];
    }
  }, [waitingItems, waitingLoading, hideCompletedItems, waitingFeaturesAvailable]);
  

  // Get status class for badge
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) { // Added null check and toLowerCase
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // Added border
      case 'in-progress': // Consistent naming
        return 'bg-blue-100 text-blue-800 border-blue-300'; // Added border
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'; // Added border
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300'; // Added border
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'; // Added border
    }
  };

  // Get priority class for badge
  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) { // Added null check and toLowerCase
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'; // Added border
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-300'; // Added border
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300'; // Added border
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'; // Added border
    }
  };

  // Handler for tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const handleAddWaitingClick = () => {
    setShowAddWaitingModal(true);
  };

  const handleWaitingFormClose = () => {
    setShowAddWaitingModal(false);
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
    <div className="relative">
      {/* Background Logo */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
        <img src={logo} alt="TaskFlow Logo" className="w-1/2 max-w-md" />
      </div>
      
      {/* Main Dashboard Content */}
      <div className="relative z-10">
        <div className="flex flex-col space-y-6">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
              <p className="text-secondary-500 mt-1">Your project overview and quick actions</p>
            </div>
            
            <div className="flex mt-4 md:mt-0 space-x-2">
              <Button asChild variant="outline" size="sm" className="hidden md:flex">
                <Link to="/settings" className="flex items-center">
                  <FiSettings className="mr-1.5 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="hidden md:flex">
                <Link to="/reports" className="flex items-center">
                  <FiBarChart2 className="mr-1.5 h-4 w-4" />
                  <span>Reports</span>
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<FiFolder />} 
              value={stats.totalProjects}
              label="Projects"
              bgColor="bg-blue-50"
              textColor="text-blue-600"
            />
            <StatCard 
              icon={<FiActivity />} 
              value={stats.pendingTasks}
              label="Active Tasks"
              bgColor="bg-purple-50"
              textColor="text-purple-600"
            />
            <StatCard 
              icon={<FiCheckCircle />} 
              value={stats.completedTasks}
              label="Completed"
              bgColor="bg-green-50"
              textColor="text-green-600"
            />
            <StatCard 
              icon={<FiClock />} 
              value={stats.trackedHoursToday}
              label="Hours Today"
              bgColor="bg-amber-50"
              textColor="text-amber-600"
            />
          </div>
          
          {/* Main Content with Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">My Tasks</TabsTrigger>
              <TabsTrigger value="waitingOn">Waiting On</TabsTrigger> 
              <TabsTrigger value="timeTracking">Time Tracking</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Recent Projects */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">Recent Projects</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/projects" className="flex items-center text-sm">
                            <span>View All</span>
                            <FiArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {recentProjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {recentProjects.map(project => (
                            <ProjectCard key={project.id} project={project} compact />
                          ))}
                        </div>
                      ) : (
                        <EmptyState 
                          icon={<FiFolder className="h-8 w-8" />}
                          title="No projects yet"
                          description="Create your first project to get started"
                          action={
                            <Link to="/projects">
                              <Button>Create Project</Button>
                            </Link>
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Upcoming Tasks */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
                        <Button variant="ghost" size="sm" className="text-sm">
                          <span>View Calendar</span>
                          <FiArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {upcomingTasks.length > 0 ? (
                        <div className="space-y-3">
                          {upcomingTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState 
                          icon={<FiCoffee className="h-8 w-8" />}
                          title="No upcoming tasks"
                          description="You're all caught up!"
                          compact
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                  {/* Time Tracking */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold">Time Tracking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimeTrackingWidget 
                        timeEntries={timeEntries}
                        tasks={tasks}
                        projects={projects}
                        stopTimeTracking={stopTimeTracking}
                        startTimeTracking={startTimeTracking}
                        pauseTimeTracking={pauseTimeTracking}
                        resumeTimeTracking={resumeTimeTracking}
                        loading={loading}
                        fetchActiveTimers={fetchActiveTimers}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Waiting On (Preview) */}
                  
                  {waitingFeaturesAvailable && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold">Waiting On</CardTitle>
                          <Button variant="ghost" size="sm" asChild>
                            <span className="cursor-pointer flex items-center text-sm" onClick={() => setActiveTab("waitingOn")}>
                              <span>See All</span>
                              <FiArrowRight className="ml-1 h-4 w-4" />
                            </span>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {filteredWaitingItems && filteredWaitingItems.length > 0 ? (
                          <div className="space-y-3">
                            {filteredWaitingItems.slice(0, 3).map(item => (
                              <WaitingItemCard 
                                key={item.id} 
                                item={item} 
                                getStatusClass={getStatusClass} 
                                getPriorityClass={getPriorityClass} 
                                compact 
                              />
                            ))}
                          </div>
                        ) : (
                          <EmptyState 
                            icon={<FiAlertCircle className="h-8 w-8" />}
                            title="No waiting items"
                            description="Track things you're waiting on others for"
                            action={
                              <Button onClick={handleAddWaitingClick}>
                                Add Item
                              </Button>
                            }
                            compact
                          />
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                </div>
              </div>
            </TabsContent>
            
            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>My Tasks</CardTitle>
                    <div className="flex items-center mt-2 sm:mt-0">
                      <Button variant="ghost" size="sm" className="text-sm" asChild>
                        <Link to="/projects" className="flex items-center">
                          <FiFilter className="mr-1.5 h-4 w-4" />
                          <span>Filter</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {myTasks.length > 0 ? (
                    <div className="space-y-3">
                      {myTasks.map(task => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<FiCoffee className="h-8 w-8" />}
                      title="No active tasks"
                      description="You're all caught up!"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Waiting On Tab */}
            
            <TabsContent value="waitingOn" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Waiting On</CardTitle>
                    <div className="flex items-center mt-2 sm:mt-0 space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setShowWaitingStats(!showWaitingStats)}>
                        {showWaitingStats ? (
                          <>
                            <FiChevronUp className="mr-1.5 h-4 w-4" />
                            <span>Hide Stats</span>
                          </>
                        ) : (
                          <>
                            <FiChevronDown className="mr-1.5 h-4 w-4" />
                            <span>Show Stats</span>
                          </>
                        )}
                      </Button>
                      <Button size="sm" onClick={handleAddWaitingClick}>
                        <FiPlus className="mr-1.5 h-4 w-4" />
                        <span>Add Item</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Section */}
                  
                  {showWaitingStats && waitingFeaturesAvailable && (
                    <WaitingItemStats stats={waitingStats} />
                  )}
                  
                  
                  {/* Filter Toggle */}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary-500 font-medium">
                      {filteredWaitingItems.length} items
                    </span>
                    <ToggleGroup type="single" defaultValue={hideCompletedItems ? "active" : "all"} onValueChange={(value) => setHideCompletedItems(value === "active")}>
                      <ToggleGroupItem value="active" size="sm" className="text-xs">
                        Active Only
                      </ToggleGroupItem>
                      <ToggleGroupItem value="all" size="sm" className="text-xs">
                        Show All
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  
                  
                  {/* Waiting Items List */}
                  
                  {filteredWaitingItems && filteredWaitingItems.length > 0 ? (
                    <div className="space-y-3">
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
                      icon={<FiAlertCircle className="h-8 w-8" />}
                      title={hideCompletedItems ? "No active waiting items" : "No waiting items"}
                      description="Track things you're waiting on others for"
                      action={
                        <Button onClick={handleAddWaitingClick}>
                          Add Item
                        </Button>
                      }
                    />
                  )}
                  
                 </CardContent> 
               </Card> 
             </TabsContent> 
            
            {/* Time Tracking Tab */}
            <TabsContent value="timeTracking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeTrackingWidget 
                    timeEntries={timeEntries}
                    tasks={tasks}
                    projects={projects}
                    stopTimeTracking={stopTimeTracking}
                    startTimeTracking={startTimeTracking}
                    pauseTimeTracking={pauseTimeTracking}
                    resumeTimeTracking={resumeTimeTracking}
                    loading={loading}
                    fetchActiveTimers={fetchActiveTimers}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Waiting Item Form Modal */}
      
      {showAddWaitingModal && (
        <WaitingItemForm onClose={handleWaitingFormClose} />
      )}
      
    </div>
  )
}

// Keep these helper components
const StatCard = ({ icon, value, label, bgColor, textColor }) => (
  <Card className="overflow-hidden">
    <div className="flex h-full">
      <div className={`${bgColor} ${textColor} flex items-center justify-center p-4`}>
        <div className="text-xl">{icon}</div>
      </div>
      <div className="flex-1 p-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-secondary-500">{label}</div>
      </div>
    </div>
  </Card>
)

const EmptyState = ({ icon, title, description, action, compact = false }) => (
  <div className={`text-center ${compact ? 'py-4' : 'py-8'}`}>
    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-secondary-100 text-secondary-500">
      {icon}
    </div>
    <h3 className={`mt-2 text-sm font-medium text-secondary-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
    <p className={`mt-1 text-secondary-500 ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export default Dashboard
