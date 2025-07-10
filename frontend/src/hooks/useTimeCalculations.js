import { useMemo } from 'react'
import { startOfDay, endOfDay } from 'date-fns'
import { calculateTotalTimeSpent } from '@/lib/timeUtils'

/**
 * Custom hook for time-related calculations
 * Provides memoized calculations for time tracking metrics
 * 
 * @param {Array} timeEntries - Array of time entries
 * @param {Array} tasks - Array of tasks
 * @param {Array} projects - Array of projects
 * @returns {Object} Time calculation results
 */
export const useTimeCalculations = (timeEntries = [], tasks = [], projects = []) => {
  
  // Calculate total tracked hours across all entries
  const totalTrackedHours = useMemo(() => {
    return timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600
  }, [timeEntries])

  // Calculate hours tracked today
  const trackedHoursToday = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    
    const todayEntries = timeEntries.filter(entry => {
      if (!entry.startTime || !entry.endTime) return false
      
      const entryStart = new Date(entry.startTime)
      const entryEnd = new Date(entry.endTime)
      
      const startedToday = entryStart >= todayStart && entryStart <= todayEnd
      const isValidDuration = entryEnd >= entryStart
      
      return startedToday && isValidDuration
    })

    const trackedMinutes = todayEntries.reduce((total, entry) => {
      const start = new Date(entry.startTime)
      const end = new Date(entry.endTime)
      const durationMs = end - start
      const durationMins = durationMs / 60000
      const durationHours = durationMins / 60
      
      // Filter out suspicious entries
      if (durationMins <= 0 || durationHours > 8) {
        return total
      }
      
      return total + durationMins
    }, 0)

    return Math.round(trackedMinutes / 60 * 10) / 10
  }, [timeEntries])

  // Calculate time spent per task
  const timeByTask = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const taskTimeEntries = timeEntries.filter(entry => entry.taskId === task.id)
      const totalTime = taskTimeEntries
        .filter(entry => entry.endTime !== null)
        .reduce((sum, entry) => sum + parseFloat(entry.duration || 0), 0)
      
      acc[task.id] = totalTime
      return acc
    }, {})
  }, [timeEntries, tasks])

  // Calculate time spent per project
  const timeByProject = useMemo(() => {
    return projects.reduce((acc, project) => {
      const projectTasks = tasks.filter(task => task.projectId === project.id)
      const projectTimeEntries = timeEntries.filter(entry =>
        projectTasks.some(task => task.id === entry.taskId) && entry.duration
      )
      const totalHours = projectTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600
      
      acc[project.id] = parseFloat(totalHours.toFixed(1))
      return acc
    }, {})
  }, [timeEntries, tasks, projects])

  // Calculate active vs completed time entries
  const timeEntryStats = useMemo(() => {
    const active = timeEntries.filter(entry => entry.endTime === null)
    const completed = timeEntries.filter(entry => entry.endTime !== null)
    
    return {
      active: active.length,
      completed: completed.length,
      total: timeEntries.length,
      activePercentage: timeEntries.length > 0 ? Math.round((active.length / timeEntries.length) * 100) : 0
    }
  }, [timeEntries])

  // Calculate average session duration
  const averageSessionDuration = useMemo(() => {
    const completedEntries = timeEntries.filter(entry => entry.endTime !== null && entry.duration > 0)
    
    if (completedEntries.length === 0) return 0
    
    const totalDuration = completedEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    return totalDuration / completedEntries.length / 3600 // in hours
  }, [timeEntries])

  // Calculate productivity metrics
  const productivityMetrics = useMemo(() => {
    const completedTasks = tasks.filter(task => task.status === 'completed').length
    const totalTasks = tasks.length
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    
    const activeTimers = timeEntries.filter(entry => entry.endTime === null && !entry.isPaused).length
    
    return {
      completionRate: Math.round(completionRate),
      completedTasks,
      totalTasks,
      activeTimers,
      trackedHoursToday,
      averageSessionHours: Math.round(averageSessionDuration * 10) / 10
    }
  }, [tasks, timeEntries, trackedHoursToday, averageSessionDuration])

  // Helper function to get total time for a specific task
  const getTotalTimeForTask = useMemo(() => {
    return (taskId, activeTimeEntry = null, currentElapsedTime = 0) => {
      return calculateTotalTimeSpent(taskId, timeEntries, activeTimeEntry, currentElapsedTime)
    }
  }, [timeEntries])

  // Helper function to check if a task is over estimated time
  const isTaskOvertime = useMemo(() => {
    return (taskId, estimatedHours) => {
      if (!estimatedHours) return false
      
      const totalTime = timeByTask[taskId] || 0
      const estimatedSeconds = estimatedHours * 3600
      return totalTime > estimatedSeconds
    }
  }, [timeByTask])

  return {
    // Basic metrics
    totalTrackedHours,
    trackedHoursToday,
    averageSessionDuration,
    
    // Time breakdowns
    timeByTask,
    timeByProject,
    timeEntryStats,
    
    // Productivity metrics
    productivityMetrics,
    
    // Helper functions
    getTotalTimeForTask,
    isTaskOvertime
  }
}