import { createContext, useState, useContext, useEffect, useMemo } from 'react'
import { useNotification } from './NotificationContext'
import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const TaskContext = createContext()

export const useTasks = () => {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider')
  }
  return context
}

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { showNotification } = useNotification()

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/tasks')
      setTasks(response.data)
      return { success: true, data: response.data }
    } catch (err) {
      console.error("Error fetching tasks:", err)
      const errorMessage = err.response?.data?.message || `HTTP error! status: ${err.response?.status}`
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

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

  const createTask = async (taskData) => {
    setLoading(true)
    try {
      const result = await apiRequest('/tasks', {
        method: 'POST',
        body: taskData,
      })

      if (result.success) {
        setTasks(prev => [result.data, ...prev])
        showNotification('success', `Task "${taskData.title}" created successfully`)
        return { success: true, data: result.data }
      } else {
        showNotification('error', `Failed to create task: ${result.message || 'Unknown error'}`)
        return result
      }
    } catch (err) {
      console.error('Error creating task:', err)
      showNotification('error', `Failed to create task: ${err.message || 'Unknown error'}`)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateTask = async (id, taskData) => {
    setLoading(true)
    try {
      const result = await apiRequest(`/tasks/${id}`, {
        method: 'PUT',
        body: taskData,
      })

      if (result.success) {
        setTasks(prev => prev.map(t => t.id === id ? result.data : t))
        showNotification('success', `Task "${taskData.title || 'Unknown'}" updated successfully`)
        return { success: true, data: result.data }
      } else {
        showNotification('error', `Failed to update task: ${result.message || 'Unknown error'}`)
        return result
      }
    } catch (err) {
      console.error('Error updating task:', err)
      showNotification('error', `Failed to update task: ${err.message || 'Unknown error'}`)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (id) => {
    setLoading(true)
    try {
      const taskToDelete = (tasks || []).find(t => t.id === id)
      const taskTitle = taskToDelete?.title || 'Unknown'

      const result = await apiRequest(`/tasks/${id}`, {
        method: 'DELETE',
      })

      if (result.success) {
        setTasks(prev => prev.filter(t => t.id !== id))
        showNotification('success', `Task "${taskTitle}" deleted successfully`)
        return { success: true }
      } else {
        showNotification('error', `Failed to delete task: ${result.message || 'Unknown error'}`)
        return result
      }
    } catch (err) {
      console.error('Error deleting task:', err)
      showNotification('error', `Failed to delete task: ${err.message || 'Unknown error'}`)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const getTasksByProject = useMemo(() => {
    const projectTasksMap = new Map()
    
    // Pre-compute tasks by project for better performance
    tasks.forEach(task => {
      if (!projectTasksMap.has(task.projectId)) {
        projectTasksMap.set(task.projectId, [])
      }
      projectTasksMap.get(task.projectId).push(task)
    })
    
    return (projectId) => projectTasksMap.get(projectId) || []
  }, [tasks])

  const getTasksByStatus = useMemo(() => {
    const statusTasksMap = new Map()
    
    // Pre-compute tasks by status for better performance
    tasks.forEach(task => {
      if (!statusTasksMap.has(task.status)) {
        statusTasksMap.set(task.status, [])
      }
      statusTasksMap.get(task.status).push(task)
    })
    
    return (status) => statusTasksMap.get(status) || []
  }, [tasks])

  const getTaskStats = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {})
  }, [tasks])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks,
    getTasksByProject,
    getTasksByStatus,
    getTaskStats,
  }), [
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks,
    getTasksByProject,
    getTasksByStatus,
    getTaskStats,
  ])

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  )
}