import { createContext, useState, useContext, useEffect, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNotification } from './NotificationContext'
import { useTasks } from './TaskContext'
import { useTimeTracking } from './TimeTrackingContext'
import axios from 'axios'

// Define the base URL for the API - Use relative path for proxy
const API_BASE_URL = '/api' // Rely on Nginx proxy in Docker

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const ProjectContext = createContext()

export const useProjects = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider')
  }
  return context
}

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { showNotification } = useNotification()
  const { tasks } = useTasks()
  const { timeEntries } = useTimeTracking()

  // --- Data Fetching ---
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get('/projects')
        setProjects(response.data)
      } catch (err) {
        console.error("Error fetching projects:", err)
        const errorMessage = err.response?.data?.message || `HTTP error! status: ${err.response?.status}`
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])


  // --- Helper Functions ---
  const apiRequest = async (url, options = {}) => {
    try {
      const { method = 'GET', body, headers, ...restOptions } = options
      const config = {
        method,
        url,
        headers: { ...headers },
        ...restOptions,
      }

      if (body) {
        config.data = body
      }

      const response = await api(config)
      return { success: true, data: response.data }
    } catch (err) {
      console.error('API Request Error:', err)
      if (err.response) {
        const errorMessage = err.response.data?.message || `HTTP error! status: ${err.response.status}`
        return { success: false, message: errorMessage, status: err.response.status }
      } else if (err.request) {
        return { success: false, message: 'No response received from server' }
      } else {
        return { success: false, message: err.message }
      }
    }
  }

  // --- Project CRUD ---
  const createProject = async (projectData) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/projects`, {
        method: 'POST',
        body: projectData,
      });

      if (result.success) {
        setProjects(prev => [result.data, ...prev]);
        showNotification('success', `Project "${projectData.name}" created successfully`);
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to create project: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error creating project:', err);
      showNotification('error', `Failed to create project: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  const updateProject = async (id, projectData) => {
    // Only send fields that are being updated (backend handles this)
    setLoading(true);
    try {
      const result = await apiRequest(`/projects/${id}`, {
        method: 'PUT',
        body: projectData,
      });

      if (result.success) {
        setProjects(prev => prev.map(p => p.id === id ? result.data : p));
        showNotification('success', `Project "${projectData.name || 'Unknown'}" updated successfully`);
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to update project: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error updating project:', err);
      showNotification('error', `Failed to update project: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  const deleteProject = async (id) => {
    setLoading(true);
    try {
      // Get project name before deletion for notification
      const projectToDelete = projects.find(p => p.id === id);
      const projectName = projectToDelete?.name || 'Unknown';

      const result = await apiRequest(`/projects/${id}`, {
        method: 'DELETE',
      });

      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
        showNotification('success', `Project "${projectName}" deleted successfully`);
        return { success: true };
      } else {
        showNotification('error', `Failed to delete project: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      showNotification('error', `Failed to delete project: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }



  // --- Calculated Values (Memoized) ---
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

  const totalTrackedHours = useMemo(() => {
    return timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600
  }, [timeEntries])

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


  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    projects,
    tasks,
    timeEntries,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    projectStats,
    totalTrackedHours,
    recentActivity
  }), [
    projects,
    tasks,
    timeEntries,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    projectStats,
    totalTrackedHours,
    recentActivity
  ])

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  )
}
