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

const TimeTrackingContext = createContext()

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext)
  if (!context) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider')
  }
  return context
}

export const TimeTrackingProvider = ({ children }) => {
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { showNotification } = useNotification()

  const fetchTimeEntries = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/time-entries')
      setTimeEntries(response.data)
      return { success: true, data: response.data }
    } catch (err) {
      console.error("Error fetching time entries:", err)
      const errorMessage = err.response?.data?.message || `HTTP error! status: ${err.response?.status}`
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveTimers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/time-entries', {
        params: { active: true }
      })

      const activeTimersData = response.data

      setTimeEntries(prev => {
        const completedEntries = prev.filter(entry => entry.endTime !== null)
        return [...activeTimersData, ...completedEntries]
      })

      return { success: true, data: activeTimersData }
    } catch (err) {
      console.error("Error fetching active timers:", err)
      const errorMessage = err.response?.data?.message || `Failed to fetch active timers: ${err.response?.status}`
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeEntries()
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

  const startTimeTracking = async (taskId) => {
    console.log(`Starting time tracking for task: ${taskId}`)
    setLoading(true)

    try {
      const result = await apiRequest('/time-entries/start', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      })

      if (result.success) {
        console.log('Time tracking started successfully:', result.data)
        setTimeEntries(prev => [result.data, ...prev])
        return { success: true, data: result.data }
      } else {
        console.error('Failed to start time tracking:', result.message)
        setError(result.message || 'Failed to start time tracking')
        return result
      }
    } catch (err) {
      console.error('Error starting time tracking:', err)
      setError(err.message || 'Failed to start time tracking')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const stopTimeTracking = async (timeEntryId) => {
    console.log(`Stopping time tracking for entry: ${timeEntryId}`)
    setLoading(true)

    try {
      const result = await apiRequest(`/time-entries/stop/${timeEntryId}`, {
        method: 'PUT',
      })

      if (result.success) {
        console.log('Time tracking stopped successfully:', result.data)
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te))
        return { success: true, data: result.data }
      } else {
        console.error('Failed to stop time tracking:', result.message)
        setError(result.message || 'Failed to stop time tracking')
        return result
      }
    } catch (err) {
      console.error('Error stopping time tracking:', err)
      setError(err.message || 'Failed to stop time tracking')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const pauseTimeTracking = async (timeEntryId) => {
    console.log(`Pausing time tracking for entry: ${timeEntryId}`)
    
    try {
      // Optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: true } : te
      ))

      const result = await apiRequest(`/time-entries/pause/${timeEntryId}`, {
        method: 'PUT',
      })

      if (result.success) {
        console.log('Time tracking paused successfully:', result.data)
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te))
        return { success: true, data: result.data }
      } else {
        console.error('Failed to pause time tracking:', result.message)
        // Revert optimistic update
        setTimeEntries(prev => prev.map(te => 
          te.id === timeEntryId ? { ...te, isPaused: false } : te
        ))
        setError(result.message || 'Failed to pause time tracking')
        return result
      }
    } catch (err) {
      console.error('Error pausing time tracking:', err)
      // Revert optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: false } : te
      ))
      setError(err.message || 'Failed to pause time tracking')
      return { success: false, message: err.message }
    }
  }

  const resumeTimeTracking = async (timeEntryId) => {
    console.log(`Resuming time tracking for entry: ${timeEntryId}`)
    
    try {
      // Optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: false, lastResumedAt: new Date().toISOString() } : te
      ))

      const result = await apiRequest(`/time-entries/resume/${timeEntryId}`, {
        method: 'PUT',
      })

      if (result.success) {
        console.log('Time tracking resumed successfully:', result.data)
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te))
        return { success: true, data: result.data }
      } else {
        console.error('Failed to resume time tracking:', result.message)
        // Revert optimistic update
        setTimeEntries(prev => prev.map(te => 
          te.id === timeEntryId ? { ...te, isPaused: true } : te
        ))
        setError(result.message || 'Failed to resume time tracking')
        return result
      }
    } catch (err) {
      console.error('Error resuming time tracking:', err)
      // Revert optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: true } : te
      ))
      setError(err.message || 'Failed to resume time tracking')
      return { success: false, message: err.message }
    }
  }

  const deleteTimeEntry = async (id) => {
    setLoading(true)
    try {
      const result = await apiRequest(`/time-entries/${id}`, {
        method: 'DELETE',
      })

      if (result.success) {
        setTimeEntries(prev => prev.filter(te => te.id !== id))
        showNotification('success', 'Time entry deleted successfully')
        return { success: true }
      } else {
        showNotification('error', `Failed to delete time entry: ${result.message || 'Unknown error'}`)
        return result
      }
    } catch (err) {
      console.error('Error deleting time entry:', err)
      showNotification('error', `Failed to delete time entry: ${err.message || 'Unknown error'}`)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateTimeEntry = async (id, timeEntryData) => {
    setLoading(true)
    try {
      const result = await apiRequest(`/time-entries/${id}`, {
        method: 'PUT',
        body: timeEntryData,
      })

      if (result.success) {
        setTimeEntries(prev => prev.map(te => te.id === id ? result.data : te))
        showNotification('success', 'Time entry updated successfully')
        return { success: true, data: result.data }
      } else {
        showNotification('error', `Failed to update time entry: ${result.message || 'Unknown error'}`)
        return result
      }
    } catch (err) {
      console.error('Error updating time entry:', err)
      showNotification('error', `Failed to update time entry: ${err.message || 'Unknown error'}`)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const createManualTimeEntry = async (timeEntryData) => {
    setLoading(true)
    try {
      const startResult = await apiRequest('/time-entries/start', {
        method: 'POST',
        body: JSON.stringify({ taskId: timeEntryData.taskId }),
      })

      if (!startResult.success) {
        showNotification('error', `Failed to create time entry: ${startResult.message || 'Unknown error'}`)
        return startResult
      }

      const timeEntryId = startResult.data.id

      const updateResult = await apiRequest(`/time-entries/${timeEntryId}`, {
        method: 'PUT',
        body: {
          startTime: timeEntryData.startTime,
          endTime: timeEntryData.endTime,
          duration: timeEntryData.duration,
          notes: timeEntryData.notes
        },
      })

      if (updateResult.success) {
        setTimeEntries(prev => {
          const filtered = prev.filter(entry => entry.id !== timeEntryId)
          return [updateResult.data, ...filtered]
        })

        showNotification('success', 'Manual time entry added successfully')
        return { success: true, data: updateResult.data }
      } else {
        showNotification('error', `Failed to update time entry: ${updateResult.message || 'Unknown error'}`)
        return updateResult
      }
    } catch (err) {
      console.error('Error adding manual time entry:', err)
      showNotification('error', `Failed to add manual time entry: ${err.message || 'Unknown error'}`)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  const activeTimeEntries = useMemo(() => {
    return timeEntries.filter(entry => entry.endTime === null)
  }, [timeEntries])

  const completedTimeEntries = useMemo(() => {
    return timeEntries.filter(entry => entry.endTime !== null)
  }, [timeEntries])

  const totalTrackedHours = useMemo(() => {
    return timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600
  }, [timeEntries])

  const getTimeEntriesByTask = useMemo(() => {
    const taskEntriesMap = new Map()
    
    // Pre-compute entries by task for better performance
    timeEntries.forEach(entry => {
      if (!taskEntriesMap.has(entry.taskId)) {
        taskEntriesMap.set(entry.taskId, [])
      }
      taskEntriesMap.get(entry.taskId).push(entry)
    })
    
    return (taskId) => taskEntriesMap.get(taskId) || []
  }, [timeEntries])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    timeEntries,
    loading,
    error,
    startTimeTracking,
    stopTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    deleteTimeEntry,
    updateTimeEntry,
    createManualTimeEntry,
    fetchActiveTimers,
    fetchTimeEntries,
    activeTimeEntries,
    completedTimeEntries,
    totalTrackedHours,
    getTimeEntriesByTask,
  }), [
    timeEntries,
    loading,
    error,
    startTimeTracking,
    stopTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    deleteTimeEntry,
    updateTimeEntry,
    createManualTimeEntry,
    fetchActiveTimers,
    fetchTimeEntries,
    activeTimeEntries,
    completedTimeEntries,
    totalTrackedHours,
    getTimeEntriesByTask,
  ])

  return (
    <TimeTrackingContext.Provider value={contextValue}>
      {children}
    </TimeTrackingContext.Provider>
  )
}