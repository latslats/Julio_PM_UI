import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { useTasks } from '../context/TaskContext'
import { useTimeTracking } from '../context/TimeTrackingContext'
import { useWaitingItems } from '../context/WaitingItemContext'
import { useUI } from '../context/UIContext'
import { FiClock, FiAlertCircle } from 'react-icons/fi'
import { format, formatDistanceToNow, isAfter, parseISO, startOfDay, endOfDay } from 'date-fns'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import logo from "../assets/taskflow_logo.png"
import { formatTime, calculateElapsedTime } from '@/lib/timeUtils'
import { useTaskManagement } from '../hooks/useTaskManagement'
import { useTimeCalculations } from '../hooks/useTimeCalculations'
import { useProjectStats } from '../hooks/useProjectStats'
import useGlobalTimer from '../hooks/useGlobalTimer'
import { useDebounceMultiple } from '../hooks/useDebounce'
import { DragDropContext } from 'react-beautiful-dnd'

// Components
import BulkActions from '../components/tasks/BulkActions'
import TimeTrackingWidget from '../components/timeTracking/TimeTrackingWidget'
import WaitingItemForm from '../components/waitingItems/WaitingItemForm'
import QuickEntry from '../components/common/QuickEntry'

// Enhanced Dashboard Components
import EnhancedStatsCards from '../components/dashboard/EnhancedStatsCards'
import MiniProgressCharts from '../components/dashboard/MiniProgressCharts'
import ProductivityInsights from '../components/dashboard/ProductivityInsights'
import TaskMenu from '../components/dashboard/TaskMenu'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import FocusModeView from '../components/dashboard/FocusModeView'
import ProjectsTabContent from '../components/dashboard/ProjectsTabContent'
import TasksTabContent from '../components/dashboard/TasksTabContent'
import WaitingItemsTabContent from '../components/dashboard/WaitingItemsTabContent'

const Dashboard = () => {
  const {
    projects,
    loading: projectsLoading,
    createProject
  } = useProjects()

  const {
    tasks,
    loading: tasksLoading
  } = useTasks()

  const {
    timeEntries,
    loading: timeEntriesLoading,
    stopTimeTracking,
    startTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    deleteTimeEntry,
    fetchActiveTimers
  } = useTimeTracking()

  const loading = projectsLoading || tasksLoading || timeEntriesLoading

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
    fetchWaitingItems: originalFetchWaitingItems = () => {},
    fetchStats: originalFetchStats = () => {},
    stats: waitingStats = {
      byStatus: {},
      byPriority: {},
      avgWaitDays: 0,
      total: 0
    }
  } = waitingItemsContext;

  // Debounced API calls to prevent multiple rapid requests
  const { 
    fetchWaitingItems: debouncedFetchWaitingItems, 
    fetchStats: debouncedFetchStats 
  } = useDebounceMultiple({
    fetchWaitingItems: originalFetchWaitingItems,
    fetchStats: originalFetchStats
  }, 500) // 500ms debounce delay


  const [activeTimeEntry, setActiveTimeEntry] = useState(null)
  const [activeTab, setActiveTab] = useState("main")
  
  // Modal state variables
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
  // Use global timer for elapsed time tracking
  const { elapsedTimes } = useGlobalTimer(activeTimeEntries)
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
      const active = (timeEntries || []).find(entry => entry.endTime === null)
      setActiveTimeEntry(active)

      // Calculate stats
      const completed = (tasks || []).filter(task => task.status === 'completed').length
      const activeTasks = (tasks || []).filter(task => task.status !== 'completed').length

      // Calculate hours tracked today using EXACT same logic as TimeEntriesPage
      const now = new Date()
      const todayStart = startOfDay(now)
      const todayEnd = endOfDay(now)
      
      console.log('🕐 Today range (using date-fns):', { todayStart, todayEnd })
      
      const todayEntries = (timeEntries || []).filter(entry => {
        if (!entry.startTime || !entry.endTime) return false // Must have both start AND end
        
        const entryStart = new Date(entry.startTime)
        const entryEnd = new Date(entry.endTime)
        
        // Use EXACT same filtering logic as TimeEntriesPage
        const startedToday = entryStart >= todayStart && entryStart <= todayEnd
        const isValidDuration = entryEnd >= entryStart
        
        return startedToday && isValidDuration
      })

      console.log('📊 Today\'s completed entries:', todayEntries.map(e => ({
        id: e.id,
        taskId: e.taskId,
        start: new Date(e.startTime).toLocaleString(),
        end: new Date(e.endTime).toLocaleString(),
        durationMs: new Date(e.endTime) - new Date(e.startTime),
        durationMins: (new Date(e.endTime) - new Date(e.startTime)) / 60000,
        rawStartTime: e.startTime,
        rawEndTime: e.endTime
      })))
      
      console.log('🔍 ALL time entries (for debugging):', timeEntries.map(e => ({
        id: e.id,
        start: e.startTime ? new Date(e.startTime).toLocaleString() : 'null',
        end: e.endTime ? new Date(e.endTime).toLocaleString() : 'null',
        hasEnd: !!e.endTime,
        isToday: e.startTime ? (new Date(e.startTime) >= todayStart && new Date(e.startTime) <= todayEnd) : false
      })))

      const trackedMinutes = todayEntries.reduce((total, entry) => {
        const start = new Date(entry.startTime)
        const end = new Date(entry.endTime)
        const durationMs = end - start
        const durationMins = durationMs / 60000
        const durationHours = durationMins / 60
        
        // More aggressive sanity checks for clearly incorrect data
        if (durationMins <= 0) {
          console.warn('⚠️ Ignoring zero/negative duration entry:', entry.id, durationMins, 'minutes')
          return total
        }
        
        if (durationHours > 8) {
          const task = (tasks || []).find(t => t.id === entry.taskId)
          const project = task ? (projects || []).find(p => p.id === task.projectId) : null
          console.warn('⚠️ Ignoring suspiciously long entry (>8h):', {
            entryId: entry.id,
            duration: durationHours.toFixed(2) + ' hours',
            taskTitle: task?.title || 'Unknown Task',
            projectName: project?.name || 'Unknown Project',
            startTime: new Date(entry.startTime).toLocaleString(),
            endTime: new Date(entry.endTime).toLocaleString()
          })
          return total
        }
        
        console.log('✅ Including entry:', entry.id, durationMins.toFixed(2), 'minutes')
        return total + durationMins
      }, 0)

      console.log('⏱️ Total tracked minutes today:', trackedMinutes, '→', (trackedMinutes / 60).toFixed(2), 'hours')

      setStats({
        totalProjects: projects.length,
        completedTasks: completed,
        pendingTasks: activeTasks,
        trackedHoursToday: Math.round(trackedMinutes / 60 * 10) / 10 // Fixed: convert minutes to hours properly
      })
    }
  }, [projects, tasks, timeEntries, loading])


  // Timer logic now handled by useGlobalTimer hook

  // Fetch waiting items and stats when component mounts, with attempt limiting
  useEffect(() => {
    // Skip if already loaded or too many attempts
    if (waitingItemsLoaded.current || waitingFetchAttempts.current >= MAX_FETCH_ATTEMPTS) {
      return;
    }

    const loadWaitingItems = async () => {
      try {
        waitingFetchAttempts.current++;

        // Load data with debouncing to avoid redundant calls
        await debouncedFetchWaitingItems();
        await debouncedFetchStats();

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
  }, [activeTab, debouncedFetchWaitingItems, debouncedFetchStats]); // Added debounced dependencies


  // Use custom hooks for better organization
  const {
    dashboardTasks: myTasks,
    activeTasks,
    taskStats
  } = useTaskManagement(tasks, projects)

  const {
    trackedHoursToday: calculatedTrackedHours
  } = useTimeCalculations(timeEntries, tasks, projects)

  const {
    projectStats,
    totalTrackedHours,
    recentActivity
  } = useProjectStats(projects, tasks, timeEntries)

  // Legacy myTasks array for other parts that still expect a flat array
  const myTasksFlat = useMemo(() => {
    return [...myTasks.inProgress, ...myTasks.notStarted]
  }, [myTasks])

  // Get unique client names for the filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = new Set(projects.map(p => p.client).filter(Boolean))
    return ['all', ...Array.from(clients).sort()]
  }, [projects]);



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

  // Drag and Drop handlers
  const handleTaskDrop = async (taskId) => {
    try {
      await startTimeTracking(taskId);
    } catch (error) {
      console.error('Error starting time tracking for dropped task:', error);
    }
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result
    
    console.log('🎯 Drag end result:', result)
    
    // If no destination or dropped in the same place, do nothing
    if (!destination) {
      console.log('⚠️ No destination, ignoring drop')
      return
    }
    
    // Check if dropped on the active sessions area
    if (destination.droppableId === 'active-sessions') {
      const taskId = draggableId.replace('task-', '')
      console.log('✅ Task dropped on active sessions:', taskId)
      handleTaskDrop(taskId)
    } else {
      console.log('ℹ️ Dropped on other area:', destination.droppableId)
    }
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="relative">
        {/* Background Logo - More subtle */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
          <img src={logo} alt="TaskFlow Logo" className="w-1/3 max-w-md" />
        </div>

        {/* Main Dashboard Content */}
        <div className="relative z-10">
          <div className="flex flex-col space-y-10">
          {/* Enhanced Dashboard Header */}
          <DashboardHeader
            bulkSelectMode={bulkSelectMode}
            toggleBulkSelectMode={toggleBulkSelectMode}
            focusModeActive={focusModeActive}
            toggleFocusMode={toggleFocusMode}
            openQuickEntry={openQuickEntry}
          />

          {/* Conditional rendering based on Focus Mode */}
          {focusModeActive ? (
            <FocusModeView
              myTasksFlat={myTasksFlat}
              timeEntries={timeEntries}
              startTimeTracking={startTimeTracking}
              pauseTimeTracking={pauseTimeTracking}
              resumeTimeTracking={resumeTimeTracking}
              stopTimeTracking={stopTimeTracking}
            />
          ) : (
            <>
              {/* Enhanced Stats Overview with trend indicators */}
              <EnhancedStatsCards
                projects={projects}
                tasks={tasks}
                timeEntries={timeEntries}
                trackedHoursToday={stats.trackedHoursToday}
              />

              {/* Main Content with Enhanced Tabs */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="mb-12 bg-background/80 backdrop-blur-sm p-1 rounded-2xl border border-border/30 shadow-lg shadow-black/5">
                  <TabsTrigger value="main" className="rounded-xl text-sm font-medium px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200 hover:bg-muted/50">
                    Main
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="rounded-xl text-sm font-medium px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200 hover:bg-muted/50">
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-xl text-sm font-medium px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200 hover:bg-muted/50">
                    My Tasks
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-xl text-sm font-medium px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200 hover:bg-muted/50">
                    Projects
                  </TabsTrigger>
                  <TabsTrigger value="waitingOn" className="rounded-xl text-sm font-medium px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200 hover:bg-muted/50">
                    Waiting On
                  </TabsTrigger>
                </TabsList>

                {/* Main Tab - Clean, focused work interface */}
                <TabsContent value="main" className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Time Tracking - Minimalist design */}
                    <div className="lg:col-span-2">
                      <Card className="border-border/30 shadow-xl shadow-black/5 backdrop-blur-sm">
                        <CardHeader className="pb-6 pt-8 px-8 border-b border-border/20">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Time Tracking</CardTitle>
                              <p className="text-sm text-muted-foreground/80">Focus on what matters most</p>
                            </div>
                            <div className="flex items-center gap-8 text-sm">
                              <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
                                <span className="text-muted-foreground">
                                  <span className="font-semibold text-foreground text-base">{stats.trackedHoursToday}h</span> today
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
                                <span className="text-muted-foreground">
                                  <span className="font-semibold text-foreground text-base">{activeTimeEntries.filter(entry => entry.endTime === null).length}</span> active
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-8">
                          <TimeTrackingWidget
                            timeEntries={timeEntries}
                            tasks={tasks}
                            projects={projects}
                            stopTimeTracking={stopTimeTracking}
                            startTimeTracking={startTimeTracking}
                            pauseTimeTracking={pauseTimeTracking}
                            resumeTimeTracking={resumeTimeTracking}
                            cleanupTimeEntry={deleteTimeEntry}
                            loading={loading}
                            fetchActiveTimers={fetchActiveTimers}
                            isDragDisabled={false}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Active Tasks - Elegant task management */}
                    <div className="lg:col-span-1">
                      <TaskMenu
                        projects={projects}
                        tasks={tasks}
                        startTimeTracking={startTimeTracking}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Dashboard Tab - Beautiful analytics and insights */}
                <TabsContent value="dashboard" className="space-y-12">
                  {/* Progress Charts - Elegant visual analytics */}
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Performance Analytics</h2>
                      <p className="text-sm text-muted-foreground/80">Visual insights into your productivity patterns</p>
                    </div>
                    <MiniProgressCharts
                      projects={projects}
                      tasks={tasks}
                      timeEntries={timeEntries}
                    />
                  </div>
                  
                  {/* Productivity Insights - AI-powered recommendations */}
                  <div className="space-y-8">
                    <div className="border-t border-border/20 pt-12">
                      <div className="text-center mb-10">
                        <h3 className="text-xl font-bold tracking-tight text-foreground mb-3">
                          Productivity Insights
                        </h3>
                        <p className="text-sm text-muted-foreground/80 max-w-2xl mx-auto">
                          AI-powered analysis of your work patterns with personalized recommendations to optimize your workflow
                        </p>
                      </div>
                      <ProductivityInsights
                        tasks={tasks}
                        timeEntries={timeEntries}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="space-y-8">
                  <ProjectsTabContent 
                    projects={projects}
                    projectStats={projectStats}
                    setShowCreateModal={setShowCreateModal}
                  />
                </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-6">
              <TasksTabContent myTasks={myTasks} />
            </TabsContent>

            {/* Waiting On Tab */}
            <TabsContent value="waitingOn" className="space-y-8">
              <WaitingItemsTabContent
                filteredWaitingItems={filteredWaitingItems}
                waitingStats={waitingStats}
                waitingFeaturesAvailable={waitingFeaturesAvailable}
                getStatusClass={getStatusClass}
                getPriorityClass={getPriorityClass}
                handleAddWaitingClick={handleAddWaitingClick}
              />
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
    </DragDropContext>
  )
}


export default Dashboard
