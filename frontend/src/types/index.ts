// Core entity types
export interface Project {
  id: string
  name: string
  description?: string
  client?: string
  color: string
  startDate?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  dueDate?: string
  estimatedHours?: number
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  taskId: string
  startTime: string
  endTime?: string | null
  duration: number
  notes?: string
  isPaused: boolean
  lastResumedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WaitingItem {
  id: string
  title: string
  description?: string
  status: WaitingItemStatus
  priority: TaskPriority
  projectId?: string
  contactPerson?: string
  expectedDate?: string
  deadlineDate?: string
  createdAt: string
  updatedAt: string
}

// Enum types
export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type WaitingItemStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  status?: number
}

// Context types
export interface ProjectContextType {
  projects: Project[]
  loading: boolean
  error: string | null
  createProject: (projectData: Partial<Project>) => Promise<ApiResponse<Project>>
  updateProject: (id: string, projectData: Partial<Project>) => Promise<ApiResponse<Project>>
  deleteProject: (id: string) => Promise<ApiResponse>
  projectStats: Record<string, ProjectStats>
  totalTrackedHours: number
  recentActivity: string[]
}

export interface TaskContextType {
  tasks: Task[]
  loading: boolean
  error: string | null
  createTask: (taskData: Partial<Task>) => Promise<ApiResponse<Task>>
  updateTask: (id: string, taskData: Partial<Task>) => Promise<ApiResponse<Task>>
  deleteTask: (id: string) => Promise<ApiResponse>
  fetchTasks: () => Promise<ApiResponse<Task[]>>
  getTasksByProject: (projectId: string) => Task[]
  getTasksByStatus: (status: TaskStatus) => Task[]
  getTaskStats: () => Record<TaskStatus, number>
}

export interface TimeTrackingContextType {
  timeEntries: TimeEntry[]
  loading: boolean
  error: string | null
  startTimeTracking: (taskId: string) => Promise<ApiResponse<TimeEntry>>
  stopTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
  pauseTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
  resumeTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
  deleteTimeEntry: (id: string) => Promise<ApiResponse>
  updateTimeEntry: (id: string, timeEntryData: Partial<TimeEntry>) => Promise<ApiResponse<TimeEntry>>
  createManualTimeEntry: (timeEntryData: ManualTimeEntryData) => Promise<ApiResponse<TimeEntry>>
  fetchActiveTimers: () => Promise<ApiResponse<TimeEntry[]>>
  fetchTimeEntries: () => Promise<ApiResponse<TimeEntry[]>>
  activeTimeEntries: TimeEntry[]
  completedTimeEntries: TimeEntry[]
  totalTrackedHours: number
  getTimeEntriesByTask: (taskId: string) => TimeEntry[]
}

// Helper types
export interface ProjectStats {
  totalTasks: number
  completedTasks: number
  totalHours: number
  progress: number
}

export interface ManualTimeEntryData {
  taskId: string
  startTime: string
  endTime: string
  duration: number
  notes?: string
}

export interface TaskGroup {
  inProgress: Task[]
  notStarted: Task[]
}

export interface TimeCalculations {
  totalTrackedHours: number
  trackedHoursToday: number
  averageSessionDuration: number
  timeByTask: Record<string, number>
  timeByProject: Record<string, number>
  timeEntryStats: {
    active: number
    completed: number
    total: number
    activePercentage: number
  }
  productivityMetrics: {
    completionRate: number
    completedTasks: number
    totalTasks: number
    activeTimers: number
    trackedHoursToday: number
    averageSessionHours: number
  }
}

export interface TaskManagement {
  tasksByStatus: Record<TaskStatus, Task[]>
  tasksByPriority: Record<TaskPriority, Task[]>
  tasksByProject: Record<string, Task[]>
  dashboardTasks: TaskGroup
  activeTasks: Task[]
  overdueTasks: Task[]
  tasksDueSoon: Task[]
  highPriorityTasks: Task[]
  taskStats: {
    completed: number
    inProgress: number
    notStarted: number
    total: number
    completionRate: number
    overdueCount: number
    dueSoonCount: number
    highPriorityCount: number
  }
}

// Component prop types
export interface DashboardHeaderProps {
  bulkSelectMode: boolean
  toggleBulkSelectMode: () => void
  focusModeActive: boolean
  toggleFocusMode: () => void
  openQuickEntry: () => void
}

export interface FocusModeViewProps {
  myTasksFlat: Task[]
  timeEntries: TimeEntry[]
  startTimeTracking: (taskId: string) => Promise<ApiResponse<TimeEntry>>
  pauseTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
  resumeTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
  stopTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
}

export interface ProjectsTabContentProps {
  projects: Project[]
  projectStats: Record<string, ProjectStats>
  setShowCreateModal: (show: boolean) => void
}

export interface TasksTabContentProps {
  myTasks: TaskGroup
}

// UI component types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

// Hook return types
export interface UseTimeTrackerReturn {
  activeTimeEntries: TimeEntry[]
  elapsedTimes: Record<string, number>
  hasActiveTimer: (taskId: string) => boolean
  getActiveTimer: (taskId: string) => TimeEntry | undefined
  getElapsedTime: (entryId: string) => number
  startTracking: (taskId: string) => Promise<ApiResponse<TimeEntry>>
  stopTracking: (entryId: string) => Promise<ApiResponse<TimeEntry>>
  pauseTracking: (entryId: string) => Promise<ApiResponse<TimeEntry>>
  resumeTracking: (entryId: string) => Promise<ApiResponse<TimeEntry>>
  toggleTimer: (entryId: string) => Promise<ApiResponse<TimeEntry>>
  activeTimersCount: number
  isAnyTimerRunning: boolean
}

// Event types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void
}

// Form types
export interface CreateProjectForm {
  name: string
  description: string
  client: string
  color: string
  startDate: string
  dueDate: string
}

export interface CreateTaskForm {
  title: string
  description: string
  projectId: string
  priority: TaskPriority
  dueDate: string
  estimatedHours: number
}