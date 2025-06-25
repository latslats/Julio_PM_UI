import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { useWaitingItems } from '../context/WaitingItemContext'
import { useUI } from '../context/UIContext'
import { FiClock, FiCheckCircle, FiAlertCircle, FiActivity, FiPlus, FiArrowRight, FiFilter, FiChevronDown, FiChevronUp, FiCoffee, FiSettings, FiBarChart2, FiFolder, FiTarget, FiPlay, FiPause, FiSquare, FiSearch, FiX } from 'react-icons/fi'
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import logo from "../assets/taskflow_logo.png"

// Components
import ProjectCard from '../components/projects/ProjectCard'
import TaskCard from '../components/tasks/TaskCard'
import TaskItem from '../components/tasks/TaskItem'
import BulkActions from '../components/tasks/BulkActions'
import TimeTrackingWidget from '../components/timeTracking/TimeTrackingWidget'
import WaitingItemCard from '../components/waitingItems/WaitingItemCard'
import WaitingItemForm from '../components/waitingItems/WaitingItemForm'
import WaitingItemStats from '../components/waitingItems/WaitingItemStats'
import QuickEntry from '../components/common/QuickEntry'

const Dashboard = () => {
  const {
    projects,
    tasks,
    timeEntries,
    loading,
    projectStats,
    createProject,
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


  const [activeTimeEntry, setActiveTimeEntry] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  
  // Projects tab state variables
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client: '',
    color: '#0ea5e9',
    startDate: '',
    dueDate: ''
  })
  const [stats, setStats] = useState({
    totalProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    trackedHoursToday: 0
  })
  // Define activeTimeEntries for Focus Mode
  const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null)
  // Track elapsed time for active entries in Focus Mode
  const [elapsedTimes, setElapsedTimes] = useState({})
  const [showWaitingStats, setShowWaitingStats] = useState(true)
  const [showAddWaitingModal, setShowAddWaitingModal] = useState(false)
  const [hideCompletedItems, setHideCompletedItems] = useState(true)
  const [waitingFeaturesAvailable, setWaitingFeaturesAvailable] = useState(false)

  // Focus Mode states
  const [focusModeActive, setFocusModeActive] = useState(false)

  // UI state
  const { 
    densityMode, 
    viewMode, 
    showCompleted, 
    focusMode, 
    setFocusMode,
    bulkSelectMode,
    selectedTasks,
    toggleBulkSelectMode
  } = useUI()
  const [showQuickEntry, setShowQuickEntry] = useState(false)

  // Refs to prevent multiple simultaneous API calls
  const waitingItemsLoaded = useRef(false);
  const waitingFetchAttempts = useRef(0);
  const MAX_FETCH_ATTEMPTS = 2;

  // Effect for main dashboard data
  useEffect(() => {
    if (!loading) {
      // Find active time entry if any
      const active = timeEntries.find(entry => entry.endTime === null)
      setActiveTimeEntry(active)

      // Calculate stats
      const completed = tasks.filter(task => task.status === 'completed').length
      const activeTasks = tasks.filter(task => task.status !== 'completed').length

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
        pendingTasks: activeTasks,
        trackedHoursToday: Math.round(trackedMinutes / 6) / 10 // round to 1 decimal
      })
    }
  }, [projects, tasks, timeEntries, loading])


  // Calculate elapsed time for active time entries (for Focus Mode)
  useEffect(() => {
    let intervals = [];

    // Clear previous state if no active entries
    if (activeTimeEntries.length === 0) {
      setElapsedTimes({});
      return () => {};
    }

    // Initialize elapsed times for all active entries
    activeTimeEntries.forEach(entry => {
      const calculateElapsed = () => {
        let currentElapsedTime = parseFloat(entry.totalPausedDuration) || 0;
        if (!entry.isPaused && entry.lastResumedAt) {
          const now = new Date().getTime();
          const lastResume = new Date(entry.lastResumedAt).getTime();
          currentElapsedTime += (now - lastResume) / 1000;
        }

        setElapsedTimes(prev => ({
          ...prev,
          [entry.id]: Math.floor(currentElapsedTime)
        }));
      };

      // Calculate once immediately
      calculateElapsed();

      // If entry is running (not paused), update every second
      if (!entry.isPaused) {
        const interval = setInterval(calculateElapsed, 1000);
        intervals.push(interval);
      }
    });

    // Cleanup function to clear all intervals
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [activeTimeEntries]);

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


  // Derived state for "My Tasks" view - grouped by status
  const myTasks = useMemo(() => {
    if (loading) return { inProgress: [], notStarted: [] };

    const nonCompletedTasks = tasks.filter(task => task.status !== 'completed');
    
    const inProgressTasks = nonCompletedTasks
      .filter(task => task.status === 'in-progress')
      .sort((a, b) => {
        // Sort by due date (earliest first)
        const dateA = a.dueDate ? parseISO(a.dueDate) : Infinity;
        const dateB = b.dueDate ? parseISO(b.dueDate) : Infinity;
        return dateA - dateB;
      });

    const notStartedTasks = nonCompletedTasks
      .filter(task => task.status === 'not-started')
      .sort((a, b) => {
        // Sort by due date (earliest first)
        const dateA = a.dueDate ? parseISO(a.dueDate) : Infinity;
        const dateB = b.dueDate ? parseISO(b.dueDate) : Infinity;
        return dateA - dateB;
      });

    return {
      inProgress: inProgressTasks,
      notStarted: notStartedTasks
    };
  }, [tasks, loading]);

  // Legacy myTasks array for other parts that still expect a flat array
  const myTasksFlat = useMemo(() => {
    return [...myTasks.inProgress, ...myTasks.notStarted];
  }, [myTasks]);

  // Get unique client names for the filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = new Set(projects.map(p => p.client).filter(Boolean))
    return ['all', ...Array.from(clients).sort()]
  }, [projects]);

  // Filter projects based on search term and selected client
  const filteredProjects = useMemo(() => {
    if (loading) return [];

    return projects
      .filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedClient === 'all' || project.client === selectedClient)
      )
      .map(project => {
        // Enhance project with stats from projectStats
        const stats = projectStats[project.id] || { totalTasks: 0, completedTasks: 0, totalHours: 0, progress: 0 };
        return {
          ...project,
          totalTasks: stats.totalTasks,
          completedTasks: stats.completedTasks,
          totalHours: stats.totalHours,
          progress: stats.progress
        };
      });
  }, [projects, projectStats, searchTerm, selectedClient, loading]);

  // Get upcoming tasks
  const upcomingTasks = useMemo(() => {
    return myTasksFlat
      .filter(t => t.dueDate && isAfter(parseISO(t.dueDate), new Date())) // Use isAfter and parseISO
      .slice(0, 5);
  }, [myTasksFlat]);

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
    setFocusMode(prev => !prev);
  };

  // QuickEntry handlers
  const openQuickEntry = () => {
    setShowQuickEntry(true);
  };

  const closeQuickEntry = () => {
    setShowQuickEntry(false);
  };


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle shortcuts
      switch (event.key) {
        case 'n':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            openQuickEntry();
          }
          break;
        case 'f':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            toggleFocusMode();
          }
          break;
        case 'Escape':
          if (showQuickEntry) {
            closeQuickEntry();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickEntry]);

  // Format time as HH:MM:SS for time tracking
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
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
          {/* Enhanced Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-secondary-900">Dashboard</h1>
              <p className="text-secondary-500/80 mt-1.5 text-sm">Your project overview and quick actions</p>
            </div>

            <div className="flex mt-5 md:mt-0 space-x-2">
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

          {/* Conditional rendering based on Focus Mode */}
          {focusModeActive ? (
            /* Focus Mode UI */
            <div className="space-y-8">
              {/* Focus Mode Header */}
              <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-8 border border-secondary-100/80 shadow-sm">
                <div className="flex items-center space-x-4 mb-4">
                  <h2 className="text-xl font-medium text-secondary-900">Focus Mode</h2>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-secondary-600 text-center">
                  Distraction-free environment to focus on your current tasks
                </p>
              </div>

              {/* Active Tasks with Time Tracking */}
              <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-secondary-900">Current Tasks</CardTitle>
                    <div className="text-xs text-secondary-500">
                      {myTasksFlat.length} active tasks
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  {myTasksFlat.length > 0 ? (
                    <div className="space-y-4">
                      {myTasksFlat.map(task => (
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
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
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
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
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
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startTimeTracking(task.id);
                                    }}
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
          ) : (
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
                  <TabsTrigger value="projects" className="rounded-lg text-sm font-normal">Projects</TabsTrigger>
                  <TabsTrigger value="waitingOn" className="rounded-lg text-sm font-normal">Waiting On</TabsTrigger>
                </TabsList>

                {/* Overview Tab - Refined with iOS-inspired minimalism */}
                <TabsContent value="overview" className="space-y-8">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
                </TabsContent>

                {/* Projects Tab - Refined with iOS-inspired minimalism */}
                <TabsContent value="projects" className="space-y-8">
                  <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-base font-medium text-secondary-900">Projects</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setShowCreateModal(true)} className="text-xs">
                          <FiPlus className="mr-1.5 h-3.5 w-3.5" />
                          New Project
                        </Button>
                      </div>
                      
                      {/* Search and Filter */}
                      <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiSearch className="h-4 w-4 text-secondary-400" />
                          </div>
                          <Input 
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 text-sm"
                          />
                        </div>
                        <div className="relative sm:w-48">
                          <Select 
                            value={selectedClient}
                            onValueChange={(value) => setSelectedClient(value)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="All Clients" />
                            </SelectTrigger>
                            <SelectContent>
                              {uniqueClients.map(client => (
                                <SelectItem key={client} value={client}>
                                  {client === 'all' ? 'All Clients' : client}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
                      {filteredProjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {filteredProjects.map(project => (
                            <ProjectCard key={project.id} project={project} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-secondary-50 rounded-xl border border-secondary-200">
                          <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
                            <FiFolder className="h-8 w-8" />
                          </div>
                          <h3 className="text-secondary-900 font-medium mb-1">No projects found</h3>
                          <p className="text-secondary-600 text-sm mb-4">
                            {searchTerm || selectedClient !== 'all' ? 'Try adjusting your search or filter' : 'Create your first project to get started'}
                          </p>
                          {!searchTerm && selectedClient === 'all' && (
                            <Button 
                              onClick={() => setShowCreateModal(true)}
                              className="inline-flex items-center"
                              size="sm"
                            >
                              <FiPlus className="mr-1.5 h-4 w-4" />
                              Create Project
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

            {/* Tasks Tab - Enhanced with status grouping */}
            <TabsContent value="tasks" className="space-y-6">
              {/* In Progress Tasks Section */}
              {myTasks.inProgress.length > 0 && (
                <Card className="overflow-hidden border-blue-100/80 shadow-sm">
                  <CardHeader className="pb-3 pt-5 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <CardTitle className="text-base font-medium text-blue-900">
                          In Progress ({myTasks.inProgress.length})
                        </CardTitle>
                      </div>
                      <div className="flex items-center mt-2 sm:mt-0">
                        <div className="text-xs text-blue-600/70">Active work in progress</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    <div className="grid gap-3">
                      {myTasks.inProgress.map(task => (
                        <TaskCard key={task.id} task={task} compact={densityMode === 'compact'} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fresh Tasks Section */}
              {myTasks.notStarted.length > 0 && (
                <Card className="overflow-hidden border-gray-100/80 shadow-sm">
                  <CardHeader className="pb-3 pt-5 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <CardTitle className="text-base font-medium text-gray-900">
                          Fresh Tasks ({myTasks.notStarted.length})
                        </CardTitle>
                      </div>
                      <div className="flex items-center mt-2 sm:mt-0">
                        <div className="text-xs text-gray-600/70">Ready to start</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    <div className="grid gap-3">
                      {myTasks.notStarted.map(task => (
                        <TaskCard key={task.id} task={task} compact={densityMode === 'compact'} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State - When no tasks */}
              {myTasksFlat.length === 0 && (
                <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
                  <CardContent className="px-6 py-8">
                    <EmptyState
                      icon={<FiCoffee className="h-7 w-7" />}
                      title="No active tasks"
                      description="You're all caught up!"
                    />
                  </CardContent>
                </Card>
              )}

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
                    <div className="grid gap-3">
                      {upcomingTasks.map(task => (
                        <TaskCard key={task.id} task={task} compact={densityMode === 'compact'} />
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
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Waiting Item Form Modal - More subtle and refined */}

      {showAddWaitingModal && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 overflow-hidden border border-secondary-100/80">
            <WaitingItemForm 
              onClose={handleWaitingFormClose} 
              projects={projects}
              onSubmit={handleWaitingFormClose}
            />
          </div>
        </div>
      )}

      {/* Quick Entry Modal */}
      <QuickEntry 
        isOpen={showQuickEntry}
        onClose={closeQuickEntry}
        defaultProjectId={projects.length > 0 ? projects[0].id : null}
      />

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedTasks={selectedTasks}
        tasks={tasks}
        onActionComplete={() => {
          // Refresh data after bulk actions
          fetchActiveTimers?.()
        }}
      />

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
              e.preventDefault()
              
              // Reset previous errors
              setFormErrors({});
              
              // Validate form
              const errors = {};
              if (!newProject.name.trim()) {
                errors.name = 'Project name is required';
              } else if (newProject.name.length > 100) {
                errors.name = 'Project name must be less than 100 characters';
              }
              
              // Validate dates if provided
              if (newProject.startDate && newProject.dueDate) {
                const start = new Date(newProject.startDate);
                const due = new Date(newProject.dueDate);
                if (due < start) {
                  errors.dueDate = 'Due date cannot be before start date';
                }
              }
              
              // If there are validation errors, show them and stop submission
              if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                return;
              }
              
              // Submit form if validation passes
              setFormLoading(true);
              try {
                const result = await createProject(newProject);
                if (result.success) {
                  setShowCreateModal(false);
                  setNewProject({
                    name: '',
                    description: '',
                    client: '',
                    color: '#0ea5e9',
                    startDate: '',
                    dueDate: ''
                  });
                } else {
                  // Handle API error
                  setFormErrors({ api: result.message || 'Failed to create project' });
                }
              } catch (err) {
                setFormErrors({ api: err.message || 'An unexpected error occurred' });
              } finally {
                setFormLoading(false);
              }
            }}>
              <div className="space-y-4 py-4"> 
                <div>
                  <Label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                    Project Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={newProject.name}
                    onChange={(e) => {
                      setNewProject({...newProject, name: e.target.value});
                      // Clear error when user starts typing
                      if (formErrors.name) {
                        setFormErrors({...formErrors, name: null});
                      }
                    }}
                    className={`w-full ${formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    required
                    disabled={formLoading}
                    placeholder="Enter project name"
                    maxLength={100}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    className="w-full h-24"
                    disabled={formLoading}
                    placeholder="Describe the project (optional)"
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-secondary-500 text-right">
                    {newProject.description.length}/500
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="client" className="block text-sm font-medium text-secondary-700 mb-1">
                    Client
                  </Label>
                  <Input
                    id="client"
                    type="text"
                    value={newProject.client}
                    onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                    className="w-full"
                    placeholder="Client name (optional)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="color" className="block text-sm font-medium text-secondary-700 mb-1">
                    Color
                  </Label>
                  <Input
                    id="color"
                    type="color"
                    value={newProject.color}
                    onChange={(e) => setNewProject({...newProject, color: e.target.value})}
                    className="h-10 w-full rounded-md border border-secondary-200 p-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="block text-sm font-medium text-secondary-700 mb-1">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => {
                        setNewProject({...newProject, startDate: e.target.value});
                        // Clear date errors when user changes dates
                        if (formErrors.dueDate) {
                          setFormErrors({...formErrors, dueDate: null});
                        }
                      }}
                      className="w-full"
                      disabled={formLoading}
                      min={new Date().toISOString().split('T')[0]} // Today as min date
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dueDate" className="block text-sm font-medium text-secondary-700 mb-1">
                      Due Date
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newProject.dueDate}
                      onChange={(e) => {
                        setNewProject({...newProject, dueDate: e.target.value});
                        // Clear date errors when user changes dates
                        if (formErrors.dueDate) {
                          setFormErrors({...formErrors, dueDate: null});
                        }
                      }}
                      className={`w-full ${formErrors.dueDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={formLoading}
                      min={newProject.startDate || new Date().toISOString().split('T')[0]} // Start date or today as min date
                    />
                    {formErrors.dueDate && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Display API error if any */}
              {formErrors.api && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <p>{formErrors.api}</p>
                </div>
              )}
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormErrors({});
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex items-center justify-center min-w-[120px]"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
