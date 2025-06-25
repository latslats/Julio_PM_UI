import { createContext, useState, useContext, useEffect } from 'react'

const UIContext = createContext()

export const useUI = () => {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}

// Density mode configuration
export const DENSITY_MODES = {
  COMPACT: 'compact',
  STANDARD: 'standard', 
  COMFORTABLE: 'comfortable'
}

// Density mode styling configuration
export const DENSITY_CONFIG = {
  [DENSITY_MODES.COMPACT]: {
    cardPadding: 'p-3',
    cardSpacing: 'space-y-2',
    textSize: 'text-sm',
    iconSize: 'h-4 w-4',
    titleSize: 'text-sm',
    subtitleSize: 'text-xs',
    buttonSize: 'h-7 w-7',
    badgeSize: 'text-xs px-1.5 py-0.5',
    gridGap: 'gap-3'
  },
  [DENSITY_MODES.STANDARD]: {
    cardPadding: 'p-4',
    cardSpacing: 'space-y-3',
    textSize: 'text-sm',
    iconSize: 'h-4 w-4',
    titleSize: 'text-base',
    subtitleSize: 'text-sm',
    buttonSize: 'h-8 w-8',
    badgeSize: 'text-xs px-2 py-1',
    gridGap: 'gap-4'
  },
  [DENSITY_MODES.COMFORTABLE]: {
    cardPadding: 'p-6',
    cardSpacing: 'space-y-4',
    textSize: 'text-base',
    iconSize: 'h-5 w-5',
    titleSize: 'text-lg',
    subtitleSize: 'text-base',
    buttonSize: 'h-9 w-9',
    badgeSize: 'text-sm px-3 py-1.5',
    gridGap: 'gap-6'
  }
}

// View mode configuration
export const VIEW_MODES = {
  CARDS: 'cards',
  LIST: 'list',
  KANBAN: 'kanban'
}

// Local storage keys
const STORAGE_KEYS = {
  DENSITY_MODE: 'taskflow_density_mode',
  VIEW_MODE: 'taskflow_view_mode',
  SHOW_COMPLETED: 'taskflow_show_completed',
  AUTO_HIDE_ACTIONS: 'taskflow_auto_hide_actions'
}

export const UIProvider = ({ children }) => {
  // UI Preferences State
  const [densityMode, setDensityMode] = useState(DENSITY_MODES.STANDARD)
  const [viewMode, setViewMode] = useState(VIEW_MODES.CARDS)
  const [showCompleted, setShowCompleted] = useState(false)
  const [autoHideActions, setAutoHideActions] = useState(true)
  
  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState([])

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedDensity = localStorage.getItem(STORAGE_KEYS.DENSITY_MODE)
      const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE)
      const savedShowCompleted = localStorage.getItem(STORAGE_KEYS.SHOW_COMPLETED)
      const savedAutoHideActions = localStorage.getItem(STORAGE_KEYS.AUTO_HIDE_ACTIONS)

      if (savedDensity && Object.values(DENSITY_MODES).includes(savedDensity)) {
        setDensityMode(savedDensity)
      }

      if (savedViewMode && Object.values(VIEW_MODES).includes(savedViewMode)) {
        setViewMode(savedViewMode)
      }

      if (savedShowCompleted !== null) {
        setShowCompleted(JSON.parse(savedShowCompleted))
      }

      if (savedAutoHideActions !== null) {
        setAutoHideActions(JSON.parse(savedAutoHideActions))
      }
    } catch (error) {
      console.error('Error loading UI preferences:', error)
    }
  }, [])

  // Preference setters with localStorage persistence
  const updateDensityMode = (mode) => {
    if (Object.values(DENSITY_MODES).includes(mode)) {
      setDensityMode(mode)
      localStorage.setItem(STORAGE_KEYS.DENSITY_MODE, mode)
    }
  }

  const updateViewMode = (mode) => {
    if (Object.values(VIEW_MODES).includes(mode)) {
      setViewMode(mode)
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode)
    }
  }

  const updateShowCompleted = (show) => {
    setShowCompleted(show)
    localStorage.setItem(STORAGE_KEYS.SHOW_COMPLETED, JSON.stringify(show))
  }

  const updateAutoHideActions = (hide) => {
    setAutoHideActions(hide)
    localStorage.setItem(STORAGE_KEYS.AUTO_HIDE_ACTIONS, JSON.stringify(hide))
  }

  // Bulk selection helpers
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const selectAllTasks = (taskIds) => {
    setSelectedTasks(taskIds)
  }

  const clearTaskSelection = () => {
    setSelectedTasks([])
  }

  const toggleBulkSelectMode = () => {
    setBulkSelectMode(prev => !prev)
    if (bulkSelectMode) {
      clearTaskSelection()
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      // Cmd/Ctrl + shortcuts
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case '1':
            event.preventDefault()
            updateDensityMode(DENSITY_MODES.COMPACT)
            break
          case '2':
            event.preventDefault()
            updateDensityMode(DENSITY_MODES.STANDARD)
            break
          case '3':
            event.preventDefault()
            updateDensityMode(DENSITY_MODES.COMFORTABLE)
            break
          case 'a':
            event.preventDefault()
            if (bulkSelectMode) {
              // Would need task data to select all - handle in components
            }
            break
          case 'f':
            event.preventDefault()
            setFocusMode(prev => !prev)
            break
          default:
            break
        }
      }

      // Single key shortcuts
      switch (event.key) {
        case 'Escape':
          if (bulkSelectMode) {
            toggleBulkSelectMode()
          } else if (focusMode) {
            setFocusMode(false)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bulkSelectMode, focusMode])

  // Get current density configuration
  const densityConfig = DENSITY_CONFIG[densityMode]

  const value = {
    // Preferences
    densityMode,
    viewMode,
    showCompleted,
    autoHideActions,
    updateDensityMode,
    updateViewMode,
    updateShowCompleted,
    updateAutoHideActions,

    // UI State
    sidebarCollapsed,
    setSidebarCollapsed,
    focusMode,
    setFocusMode,
    bulkSelectMode,
    setBulkSelectMode,
    toggleBulkSelectMode,

    // Bulk Selection
    selectedTasks,
    toggleTaskSelection,
    selectAllTasks,
    clearTaskSelection,

    // Configuration
    densityConfig,
    DENSITY_MODES,
    VIEW_MODES
  }

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  )
}

export default UIProvider