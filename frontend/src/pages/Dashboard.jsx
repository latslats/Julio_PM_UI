import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { useWaitingItems } from '../context/WaitingItemContext'
import { FiClock, FiCheckCircle, FiAlertCircle, FiActivity, FiPlus, FiArrowRight, FiFilter, FiChevronDown, FiChevronUp, FiCoffee, FiSettings, FiBarChart2, FiFolder, FiTarget, FiPlay, FiPause, FiSquare, FiRefreshCw, FiX } from 'react-icons/fi'
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
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
  
  // Focus Mode states
  const [focusModeActive, setFocusModeActive] = useState(false)
  const [pomodoroActive, setPomodoroActive] = useState(false)
  const [pomodoroSettings, setPomodoroSettings] = useState({
    workDuration: 25 * 60, // 25 minutes in seconds
    breakDuration: 5 * 60,  // 5 minutes in seconds
    longBreakDuration: 15 * 60, // 15 minutes in seconds
    sessionsBeforeLongBreak: 4
  })
  const [pomodoroState, setPomodoroState] = useState({
    isBreak: false,
    currentSession: 1,
    timeRemaining: pomodoroSettings.workDuration,
    timerActive: false
  })
  const pomodoroTimerRef = useRef(null)

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

  // Cleanup Pomodoro timer on component unmount
  useEffect(() => {
    return () => {
      if (pomodoroTimerRef.current) {
        clearInterval(pomodoroTimerRef.current);
      }
    };
  }, []);
  
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
  
  // Focus Mode handlers
  const toggleFocusMode = () => {
    setFocusModeActive(prev => !prev);
    
    // If turning off focus mode, also turn off pomodoro
    if (focusModeActive) {
      stopPomodoroTimer();
      setPomodoroActive(false);
    }
  };
  
  // Pomodoro timer functions
  const togglePomodoroMode = () => {
    if (!pomodoroActive) {
      // Starting pomodoro
      setPomodoroActive(true);
      setPomodoroState(prev => ({
        ...prev,
        isBreak: false,
        currentSession: 1,
        timeRemaining: pomodoroSettings.workDuration,
        timerActive: true
      }));
      startPomodoroTimer();
    } else {
      // Stopping pomodoro
      stopPomodoroTimer();
      setPomodoroActive(false);
    }
  };
  
  const startPomodoroTimer = () => {
    // Clear any existing timer
    if (pomodoroTimerRef.current) {
      clearInterval(pomodoroTimerRef.current);
    }
    
    // Start a new timer that ticks every second
    pomodoroTimerRef.current = setInterval(() => {
      setPomodoroState(prev => {
        // If timer is not active, don't update
        if (!prev.timerActive) return prev;
        
        const newTimeRemaining = prev.timeRemaining - 1;
        
        // If timer reached zero
        if (newTimeRemaining <= 0) {
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Error playing notification sound:', e));
          
          // Determine what's next (work or break)
          if (prev.isBreak) {
            // If we were on a break, go back to work
            const nextSession = prev.currentSession + 1;
            const isSessionComplete = nextSession > pomodoroSettings.sessionsBeforeLongBreak;
            
            return {
              isBreak: false,
              currentSession: isSessionComplete ? 1 : nextSession,
              timeRemaining: pomodoroSettings.workDuration,
              timerActive: true // Auto-start the next work session
            };
          } else {
            // If we were working, go to a break
            const isLongBreakDue = prev.currentSession >= pomodoroSettings.sessionsBeforeLongBreak;
            const breakDuration = isLongBreakDue 
              ? pomodoroSettings.longBreakDuration 
              : pomodoroSettings.breakDuration;
              
            return {
              isBreak: true,
              currentSession: prev.currentSession,
              timeRemaining: breakDuration,
              timerActive: true // Auto-start the break
            };
          }
        }
        
        // Normal tick, just update remaining time
        return {
          ...prev,
          timeRemaining: newTimeRemaining
        };
      });
    }, 1000);
  };
  
  const stopPomodoroTimer = () => {
    if (pomodoroTimerRef.current) {
      clearInterval(pomodoroTimerRef.current);
      pomodoroTimerRef.current = null;
    }
    
    setPomodoroState(prev => ({
      ...prev,
      timerActive: false
    }));
  };
  
  const pauseResumePomodoroTimer = () => {
    setPomodoroState(prev => ({
      ...prev,
      timerActive: !prev.timerActive
    }));
  };
  
  const resetPomodoroTimer = () => {
    stopPomodoroTimer();
    setPomodoroState({
      isBreak: false,
      currentSession: 1,
      timeRemaining: pomodoroSettings.workDuration,
      timerActive: false
    });
  };
  
  // Format time as MM:SS
  const formatPomodoroTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
      {/* Background Logo - More subtle */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
        <img src={logo} alt="TaskFlow Logo" className="w-1/3 max-w-md" />
      </div>
      
      {/* Main Dashboard Content */}
      <div className="relative z-10">
        <div className="flex flex-col space-y-8">
          {/* Dashboard Header - Refined spacing and typography */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-secondary-900">Dashboard</h1>
              <p className="text-secondary-500/80 mt-1.5 text-sm">Your project overview and quick actions</p>
            </div>
            
            <div className="flex mt-5 md:mt-0 space-x-3">
              <Button 
                variant={focusModeActive ? "default" : "outline"} 
                size="sm" 
                className="flex items-center"
                onClick={toggleFocusMode}
              >
                <FiTarget className="mr-1.5 h-4 w-4" />
                <span className="font-normal">{focusModeActive ? "Exit Focus Mode" : "Focus Mode"}</span>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden md:flex">
                <Link to="/settings" className="flex items-center">
                  <FiSettings className="mr-1.5 h-4 w-4 opacity-70" />
                  <span className="font-normal">Settings</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden md:flex">
                <Link to="/reports" className="flex items-center">
                  <FiBarChart2 className="mr-1.5 h-4 w-4 opacity-70" />
                  <span className="font-normal">Reports</span>
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Conditional rendering based on Focus Mode */}
          {!focusModeActive ? (
            <>
              {/* Stats Overview - Cleaner, more minimal cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard 
                  icon={<FiFolder />} 
                  value={stats.totalProjects}
                  label="Projects"
                  bgColor="bg-blue-50/50"
                  textColor="text-blue-600/80"
                />
                <StatCard 
                  icon={<FiActivity />} 
                  value={stats.pendingTasks}
                  label="Active Tasks"
                  bgColor="bg-purple-50/50"
                  textColor="text-purple-600/80"
                />
                <StatCard 
                  icon={<FiCheckCircle />} 
                  value={stats.completedTasks}
                  label="Completed"
                  bgColor="bg-green-50/50"
                  textColor="text-green-600/80"
                />
                <StatCard 
                  icon={<FiClock />} 
                  value={stats.trackedHoursToday}
                  label="Hours Today"
                  bgColor="bg-amber-50/50"
                  textColor="text-amber-600/80"
                />
              </div>
              
              {/* Main Content with Tabs - More subtle and refined */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="mb-8 bg-secondary-50/70 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg text-sm font-normal">Overview</TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-lg text-sm font-normal">My Tasks</TabsTrigger>
                  <TabsTrigger value="waitingOn" className="rounded-lg text-sm font-normal">Waiting On</TabsTrigger>
                </TabsList>
          ) : (
            /* Focus Mode UI */
            <div className="space-y-8">
              {/* Pomodoro Timer */}
              <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-8 border border-secondary-100/80 shadow-sm">
                <div className="flex items-center space-x-4 mb-6">
                  <h2 className="text-xl font-medium text-secondary-900">
                    {pomodoroState.isBreak 
                      ? `Break ${Math.ceil(pomodoroState.currentSession / pomodoroSettings.sessionsBeforeLongBreak)}` 
                      : `Focus Session ${pomodoroState.currentSession}`}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={pomodoroActive ? "default" : "outline"} 
                      size="sm" 
                      onClick={togglePomodoroMode}
                      className={`${pomodoroActive ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    >
                      {pomodoroActive ? "Stop Pomodoro" : "Start Pomodoro"}
                    </Button>
                  </div>
                </div>
                
                {pomodoroActive && (
                  <div className="flex flex-col items-center">
                    <div className="text-5xl font-mono font-medium mb-4 tracking-wider">
                      {formatPomodoroTime(pomodoroState.timeRemaining)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={pauseResumePomodoroTimer}
                        className="h-10 w-10 rounded-full"
                      >
                        {pomodoroState.timerActive ? <FiPause /> : <FiPlay />}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={resetPomodoroTimer}
                        className="h-10 w-10 rounded-full"
                      >
                        <FiRefreshCw />
                      </Button>
                    </div>
                    <div className="mt-4 text-sm text-secondary-500">
                      {pomodoroState.isBreak 
                        ? "Take a break! Stretch, hydrate, or rest your eyes." 
                        : "Focus on your task. Minimize distractions."}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Active Tasks with Time Tracking */}
              <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-secondary-900">Current Tasks</CardTitle>
                    <div className="text-xs text-secondary-500">
                      {myTasks.filter(t => t.status !== 'completed').length} active tasks
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  {myTasks.filter(t => t.status !== 'completed').length > 0 ? (
                    <div className="space-y-4">
                      {myTasks
                        .filter(t => t.status !== 'completed')
                        .map(task => (
                          <div key={task.id} className="p-4 bg-white rounded-lg border border-secondary-100 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-base font-medium text-secondary-900">{task.title}</h3>
                                <div className="flex items-center mt-1 space-x-2 text-xs text-secondary-500">
                                  {task.dueDate && (
                                    <span className="flex items-center">
                                      <FiClock className="mr-1 h-3 w-3" />
                                      {format(parseISO(task.dueDate), 'MMM d')}
                                    </span>
                                  )}
                                  {task.priority === 'high' && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                                      High Priority
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {activeTimeEntries.find(entry => entry.taskId === task.id) ? (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => {
                                        const entry = activeTimeEntries.find(e => e.taskId === task.id);
                                        if (entry) {
                                          if (entry.isPaused) {
                                            resumeTimeTracking(entry.id);
                                          } else {
                                            pauseTimeTracking(entry.id);
                                          }
                                        }
                                      }}
                                      className="h-8 w-8 p-0 rounded-full"
                                    >
                                      {activeTimeEntries.find(entry => entry.taskId === task.id)?.isPaused 
                                        ? <FiPlay className="h-4 w-4" /> 
                                        : <FiPause className="h-4 w-4" />}
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => {
                                        const entry = activeTimeEntries.find(e => e.taskId === task.id);
                                        if (entry) {
                                          stopTimeTracking(entry.id);
                                        }
                                      }}
                                      className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-600"
                                    >
                                      <FiSquare className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => startTimeTracking(task.id)}
                                    className="h-8 px-3 rounded-full"
                                  >
                                    <FiPlay className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Start</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Show active timer if any */}
                            {activeTimeEntries.find(entry => entry.taskId === task.id) && (
                              <div className="mt-3 text-sm font-mono text-primary-600">
                                {formatTime(elapsedTimes[activeTimeEntries.find(entry => entry.taskId === task.id)?.id] || 0)}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<FiCoffee className="h-7 w-7" />}
                      title="No active tasks"
                      description="You're all caught up!"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {!focusModeActive && (
            <>
              {/* Overview Tab - Refined with iOS-inspired minimalism */}
              <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-8">
                  {/* Recent Projects - Cleaner card design */}
                  <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium text-secondary-900">Recent Projects</CardTitle>
                        <Button variant="ghost" size="sm" asChild className="text-primary/80 hover:text-primary">
                          <Link to="/projects" className="flex items-center text-xs">
                            <span>View All</span>
                            <FiArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
                      {recentProjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {recentProjects.map(project => (
                            <ProjectCard key={project.id} project={project} compact />
                          ))}
                        </div>
                      ) : (
                        <EmptyState 
                          icon={<FiFolder className="h-7 w-7" />}
                          title="No projects yet"
                          description="Create your first project to get started"
                          action={
                            <Link to="/projects">
                              <Button size="sm" variant="outline" className="mt-2">Create Project</Button>
                            </Link>
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                  

                </div>
                
                {/* Right Column */}
                <div className="space-y-8">
                  {/* Time Tracking - Cleaner card design */}
                  <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-6">
                      <CardTitle className="text-base font-medium text-secondary-900">Time Tracking</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
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
                  
                  {/* Waiting On (Preview) - Cleaner card design */}
                  
                  {waitingFeaturesAvailable && (
                    <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                      <CardHeader className="pb-3 pt-5 px-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium text-secondary-900">Waiting On</CardTitle>
                          <Button variant="ghost" size="sm" asChild className="text-primary/80 hover:text-primary">
                            <span className="cursor-pointer flex items-center text-xs" onClick={() => setActiveTab("waitingOn")}>
                              <span>See All</span>
                              <FiArrowRight className="ml-1 h-3.5 w-3.5" />
                            </span>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-6 pb-5">
                        {filteredWaitingItems && filteredWaitingItems.length > 0 ? (
                          <div className="space-y-2">
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
                            icon={<FiAlertCircle className="h-7 w-7" />}
                            title="No waiting items"
                            description="Track things you're waiting on others for"
                            action={
                              <Button size="sm" variant="outline" className="mt-2" onClick={handleAddWaitingClick}>
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
            
            {/* Tasks Tab - Refined with iOS-inspired minimalism */}
            <TabsContent value="tasks" className="space-y-8">
              {/* Active Tasks */}
              <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base font-medium text-secondary-900">Active Tasks</CardTitle>
                    <div className="flex items-center mt-2 sm:mt-0">
                      <Button variant="ghost" size="sm" className="text-xs text-primary/80 hover:text-primary" asChild>
                        <Link to="/projects" className="flex items-center">
                          <FiFilter className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                          <span>Filter</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  {myTasks.length > 0 ? (
                    <div className="space-y-2">
                      {myTasks.map(task => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<FiCoffee className="h-7 w-7" />}
                      title="No active tasks"
                      description="You're all caught up!"
                    />
                  )}
                </CardContent>
              </Card>
              
              {/* Upcoming Tasks */}
              <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-secondary-900">Upcoming Tasks</CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary/80 hover:text-primary text-xs">
                      <span>View Calendar</span>
                      <FiArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  {upcomingTasks.length > 0 ? (
                    <div className="space-y-2">
                      {upcomingTasks.map(task => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon={<FiCoffee className="h-7 w-7" />}
                      title="No upcoming tasks"
                      description="You're all caught up!"
                      compact
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Waiting On Tab - Refined with iOS-inspired minimalism */}
            
            <TabsContent value="waitingOn" className="space-y-8">
              <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base font-medium text-secondary-900">Waiting On</CardTitle>
                    <div className="flex items-center mt-2 sm:mt-0 space-x-3">
                      {/* Toggle Stats Button - Icon Only */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setShowWaitingStats(!showWaitingStats)}
                        title={showWaitingStats ? "Hide Stats" : "Show Stats"}
                        className="h-8 w-8 text-primary/70 hover:text-primary"
                      >
                        <FiBarChart2 className="h-3.5 w-3.5" />
                      </Button>
                      {/* Add Item Button */}
                      <Button size="sm" variant="outline" onClick={handleAddWaitingClick} className="text-xs">
                        <FiPlus className="mr-1.5 h-3.5 w-3.5" />
                        <span>Add Item</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-5 space-y-5">
                  {/* Stats Section with Animation */}
                  <AnimatePresence>
                    {showWaitingStats && waitingFeaturesAvailable && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{ overflow: 'hidden' }} // Prevents content spill during animation
                      >
                        <WaitingItemStats stats={waitingStats} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  
                  {/* Filter Toggle - More subtle and refined */}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-secondary-500/80">
                      {filteredWaitingItems.length} items
                    </span>
                    <ToggleGroup 
                      type="single" 
                      defaultValue={hideCompletedItems ? "active" : "all"} 
                      onValueChange={(value) => setHideCompletedItems(value === "active")}
                      className="bg-secondary-50/70 p-0.5 rounded-lg"
                    >
                      <ToggleGroupItem value="active" size="sm" className="text-xs px-3 py-1 rounded">
                        Active Only
                      </ToggleGroupItem>
                      <ToggleGroupItem value="all" size="sm" className="text-xs px-3 py-1 rounded">
                        Show All
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  
                  
                  {/* Waiting Items List */}
                  
                  {filteredWaitingItems && filteredWaitingItems.length > 0 ? (
                    <div className="space-y-2">
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
                      icon={<FiAlertCircle className="h-7 w-7" />}
                      title={hideCompletedItems ? "No active waiting items" : "No waiting items"}
                      description="Track things you're waiting on others for"
                      action={
                        <Button size="sm" variant="outline" className="mt-2" onClick={handleAddWaitingClick}>
                          Add Item
                        </Button>
                      }
                    />
                  )}
                  
                 </CardContent> 
               </Card> 
             </TabsContent>
            </>
          )}
          
          {!focusModeActive && (
            </Tabs>
          )}
        </div>
      </div>
      
      {/* Waiting Item Form Modal - More subtle and refined */}
      
      {showAddWaitingModal && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 overflow-hidden border border-secondary-100/80">
            <WaitingItemForm onClose={handleWaitingFormClose} />
          </div>
        </div>
      )}
      
    </div>
  )
}

// Keep these helper components - Refined with iOS-inspired minimalism
const StatCard = ({ icon, value, label, bgColor, textColor }) => (
  <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
    <div className="flex h-full">
      <div className={`${bgColor} ${textColor} flex items-center justify-center p-3.5 rounded-r-xl`}>
        <div className="text-lg">{icon}</div>
      </div>
      <div className="flex-1 p-4">
        <div className="text-xl font-medium tracking-tight">{value}</div>
        <div className="text-xs text-secondary-500/80 mt-0.5">{label}</div>
      </div>
    </div>
  </Card>
)

const EmptyState = ({ icon, title, description, action, compact = false }) => (
  <div className={`text-center ${compact ? 'py-4' : 'py-6'}`}>
    <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-secondary-50 text-secondary-400 border border-secondary-100/50">
      {icon}
    </div>
    <h3 className={`mt-3 font-medium text-secondary-800 ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h3>
    <p className={`mt-1 text-secondary-500/80 ${compact ? 'text-[10px]' : 'text-xs'}`}>{description}</p>
    {action && <div className="mt-3">{action}</div>}
  </div>
)

export default Dashboard
