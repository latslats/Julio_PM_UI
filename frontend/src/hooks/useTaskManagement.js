import { useMemo, useCallback } from 'react'
import { parseISO } from 'date-fns'

/**
 * Custom hook for task management operations
 * Provides common task filtering, grouping, and management functions
 * 
 * @param {Array} tasks - Array of tasks
 * @param {Array} projects - Array of projects (optional)
 * @returns {Object} Task management utilities
 */
export const useTaskManagement = (tasks = [], projects = []) => {
  
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const status = task.status || 'not-started'
      if (!acc[status]) acc[status] = []
      acc[status].push(task)
      return acc
    }, {})
  }, [tasks])

  // Group tasks by priority
  const tasksByPriority = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const priority = task.priority || 'medium'
      if (!acc[priority]) acc[priority] = []
      acc[priority].push(task)
      return acc
    }, {})
  }, [tasks])

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const projectId = task.projectId
      if (!acc[projectId]) acc[projectId] = []
      acc[projectId].push(task)
      return acc
    }, {})
  }, [tasks])

  // Get active tasks (not completed)
  const activeTasks = useMemo(() => {
    return tasks.filter(task => task.status !== 'completed')
  }, [tasks])

  // Get tasks grouped for dashboard view
  const dashboardTasks = useMemo(() => {
    const inProgress = tasks
      .filter(task => task.status === 'in-progress')
      .sort((a, b) => {
        const dateA = a.dueDate ? parseISO(a.dueDate) : Infinity
        const dateB = b.dueDate ? parseISO(b.dueDate) : Infinity
        return dateA - dateB
      })

    const notStarted = tasks
      .filter(task => task.status === 'not-started')
      .sort((a, b) => {
        const dateA = a.dueDate ? parseISO(a.dueDate) : Infinity
        const dateB = b.dueDate ? parseISO(b.dueDate) : Infinity
        return dateA - dateB
      })

    return { inProgress, notStarted }
  }, [tasks])

  // Get overdue tasks
  const overdueTasks = useMemo(() => {
    const now = new Date()
    return tasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false
      const dueDate = parseISO(task.dueDate)
      return dueDate < now
    })
  }, [tasks])

  // Get tasks due soon (within next 7 days)
  const tasksDueSoon = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    return tasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false
      const dueDate = parseISO(task.dueDate)
      return dueDate >= now && dueDate <= nextWeek
    })
  }, [tasks])

  // Get high priority tasks
  const highPriorityTasks = useMemo(() => {
    return tasks.filter(task => 
      task.priority === 'high' && task.status !== 'completed'
    )
  }, [tasks])

  // Task statistics
  const taskStats = useMemo(() => {
    const completed = tasks.filter(task => task.status === 'completed').length
    const inProgress = tasks.filter(task => task.status === 'in-progress').length
    const notStarted = tasks.filter(task => task.status === 'not-started').length
    const total = tasks.length

    return {
      completed,
      inProgress,
      notStarted,
      total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      overdueCount: overdueTasks.length,
      dueSoonCount: tasksDueSoon.length,
      highPriorityCount: highPriorityTasks.length
    }
  }, [tasks, overdueTasks, tasksDueSoon, highPriorityTasks])

  // Helper function to get tasks for a specific project
  const getTasksForProject = useCallback((projectId) => {
    return tasks.filter(task => task.projectId === projectId)
  }, [tasks])

  // Helper function to get tasks by status
  const getTasksByStatus = useCallback((status) => {
    return tasks.filter(task => task.status === status)
  }, [tasks])

  // Helper function to get tasks by priority
  const getTasksByPriority = useCallback((priority) => {
    return tasks.filter(task => task.priority === priority)
  }, [tasks])

  // Helper function to check if a task is overdue
  const isTaskOverdue = useCallback((task) => {
    if (!task.dueDate || task.status === 'completed') return false
    const dueDate = parseISO(task.dueDate)
    return dueDate < new Date()
  }, [])

  // Helper function to check if a task is due soon
  const isTaskDueSoon = useCallback((task) => {
    if (!task.dueDate || task.status === 'completed') return false
    const dueDate = parseISO(task.dueDate)
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return dueDate >= now && dueDate <= nextWeek
  }, [])

  // Helper function to get task with project info
  const getTasksWithProjectInfo = useMemo(() => {
    return (tasks || []).map(task => {
      const project = (projects || []).find(p => p.id === task.projectId)
      return {
        ...task,
        projectName: project?.name || 'Unknown Project',
        projectColor: project?.color || '#0ea5e9'
      }
    })
  }, [tasks, projects])

  // Filter tasks by search term
  const filterTasksBySearch = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return tasks
    
    const lowercaseSearch = searchTerm.toLowerCase()
    return tasks.filter(task => 
      task.title?.toLowerCase().includes(lowercaseSearch) ||
      task.description?.toLowerCase().includes(lowercaseSearch)
    )
  }, [tasks])

  // Sort tasks by various criteria
  const sortTasks = useCallback((tasksToSort, sortBy = 'dueDate', sortOrder = 'asc') => {
    const sorted = [...tasksToSort].sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'dueDate':
          aValue = a.dueDate ? parseISO(a.dueDate) : new Date(0)
          bValue = b.dueDate ? parseISO(b.dueDate) : new Date(0)
          break
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority] || 2
          bValue = priorityOrder[b.priority] || 2
          break
        case 'status':
          const statusOrder = { 'in-progress': 3, 'not-started': 2, 'completed': 1 }
          aValue = statusOrder[a.status] || 2
          bValue = statusOrder[b.status] || 2
          break
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        default:
          return 0
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      }
    })
    
    return sorted
  }, [])

  return {
    // Grouped tasks
    tasksByStatus,
    tasksByPriority,
    tasksByProject,
    dashboardTasks,
    
    // Filtered tasks
    activeTasks,
    overdueTasks,
    tasksDueSoon,
    highPriorityTasks,
    
    // Enhanced tasks
    getTasksWithProjectInfo,
    
    // Statistics
    taskStats,
    
    // Helper functions
    getTasksForProject,
    getTasksByStatus,
    getTasksByPriority,
    isTaskOverdue,
    isTaskDueSoon,
    filterTasksBySearch,
    sortTasks
  }
}