import { useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'

/**
 * Custom hook for project statistics and calculated values
 * Provides project-related calculations that depend on tasks and timeEntries
 * This avoids circular dependencies in the Context providers
 * 
 * @param {Array} projects - Array of projects
 * @param {Array} tasks - Array of tasks
 * @param {Array} timeEntries - Array of time entries
 * @returns {Object} Project statistics and calculated values
 */
export const useProjectStats = (projects = [], tasks = [], timeEntries = []) => {
  
  // Calculate project statistics
  const projectStats = useMemo(() => {
    return projects.reduce((acc, project) => {
      const projectTasks = tasks.filter(task => task.projectId === project.id)
      const completedTasks = projectTasks.filter(task => task.status === 'completed').length
      const projectTimeEntries = timeEntries.filter(entry =>
        projectTasks.some(task => task.id === entry.taskId) && entry.duration
      )
      const totalHours = projectTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600

      acc[project.id] = {
        totalTasks: projectTasks.length,
        completedTasks: completedTasks,
        totalHours: parseFloat(totalHours.toFixed(1)),
        progress: projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0
      }
      return acc
    }, {})
  }, [projects, tasks, timeEntries])

  // Calculate total tracked hours across all projects
  const totalTrackedHours = useMemo(() => {
    return timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600
  }, [timeEntries])

  // Calculate recent activity from projects and tasks
  const recentActivity = useMemo(() => {
    const activities = [
      ...projects.map(p => ({ ...p, type: 'project', date: p.createdAt || new Date(0) })),
      ...tasks.map(t => ({ ...t, type: 'task', date: t.createdAt || new Date(0) })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    return activities.slice(0, 5).map(activity => {
      let action = 'created'
      const timeAgo = formatDistanceToNow(new Date(activity.date), { addSuffix: true })
      switch (activity.type) {
        case 'project':
          return `Project "${activity.name}" ${action} ${timeAgo}`
        case 'task':
          const projectName = projects.find(p => p.id === activity.projectId)?.name || 'a project'
          return `Task "${activity.title}" ${action} in ${projectName} ${timeAgo}`
        default:
          return `Activity ${timeAgo}`
      }
    })
  }, [projects, tasks, timeEntries])

  // Helper function to get stats for a specific project
  const getProjectStats = useMemo(() => {
    return (projectId) => projectStats[projectId] || {
      totalTasks: 0,
      completedTasks: 0,
      totalHours: 0,
      progress: 0
    }
  }, [projectStats])

  // Helper function to get tasks for a specific project
  const getProjectTasks = useMemo(() => {
    return (projectId) => tasks.filter(task => task.projectId === projectId)
  }, [tasks])

  // Helper function to get time entries for a specific project
  const getProjectTimeEntries = useMemo(() => {
    return (projectId) => {
      const projectTasks = tasks.filter(task => task.projectId === projectId)
      return timeEntries.filter(entry =>
        projectTasks.some(task => task.id === entry.taskId)
      )
    }
  }, [tasks, timeEntries])

  return {
    projectStats,
    totalTrackedHours,
    recentActivity,
    getProjectStats,
    getProjectTasks,
    getProjectTimeEntries
  }
}