import { useState, useEffect, useCallback } from 'react'
import { calculateElapsedTime } from '@/lib/timeUtils'
import type { TimeEntry, ApiResponse, UseTimeTrackerReturn } from '@/types'

interface UseTimeTrackerParams {
  timeEntries?: TimeEntry[]
  startTimeTracking: (taskId: string) => Promise<ApiResponse<TimeEntry>>
  stopTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
  pauseTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
  resumeTimeTracking: (timeEntryId: string) => Promise<ApiResponse<TimeEntry>>
}

/**
 * Custom hook for managing time tracking functionality
 * Handles real-time timer updates, elapsed time calculations, and timer state
 */
export const useTimeTracker = ({
  timeEntries = [],
  startTimeTracking,
  stopTimeTracking,
  pauseTimeTracking,
  resumeTimeTracking
}: UseTimeTrackerParams): UseTimeTrackerReturn => {
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({})

  // Get active time entries (those without endTime)
  const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null)

  // Update elapsed times for active entries
  useEffect(() => {
    let intervals = []

    // Clear previous state if no active entries
    if (activeTimeEntries.length === 0) {
      setElapsedTimes({})
      return () => {}
    }

    // Initialize elapsed times for all active entries
    activeTimeEntries.forEach(entry => {
      const updateElapsedTime = () => {
        const elapsed = calculateElapsedTime(entry)
        setElapsedTimes(prev => ({
          ...prev,
          [entry.id]: elapsed
        }))
      }

      // Calculate once immediately
      updateElapsedTime()

      // If entry is running (not paused), update every second
      if (!entry.isPaused) {
        const interval = setInterval(updateElapsedTime, 1000)
        intervals.push(interval)
      }
    })

    // Cleanup function to clear all intervals
    return () => {
      intervals.forEach(interval => clearInterval(interval))
    }
  }, [activeTimeEntries])

  // Helper function to check if a task has an active timer
  const hasActiveTimer = useCallback((taskId: string): boolean => {
    return activeTimeEntries.some(entry => entry.taskId === taskId)
  }, [activeTimeEntries])

  // Helper function to get active timer for a task
  const getActiveTimer = useCallback((taskId: string): TimeEntry | undefined => {
    return activeTimeEntries.find(entry => entry.taskId === taskId)
  }, [activeTimeEntries])

  // Helper function to get elapsed time for a specific timer
  const getElapsedTime = useCallback((entryId: string): number => {
    return elapsedTimes[entryId] || 0
  }, [elapsedTimes])

  // Enhanced start tracking with error handling
  const startTracking = useCallback(async (taskId: string): Promise<ApiResponse<TimeEntry>> => {
    try {
      const result = await startTimeTracking(taskId)
      return result
    } catch (error: any) {
      console.error('Error starting time tracking:', error)
      return { success: false, message: error.message }
    }
  }, [startTimeTracking])

  // Enhanced stop tracking with error handling
  const stopTracking = useCallback(async (entryId: string): Promise<ApiResponse<TimeEntry>> => {
    try {
      const result = await stopTimeTracking(entryId)
      return result
    } catch (error: any) {
      console.error('Error stopping time tracking:', error)
      return { success: false, message: error.message }
    }
  }, [stopTimeTracking])

  // Enhanced pause tracking with error handling
  const pauseTracking = useCallback(async (entryId: string): Promise<ApiResponse<TimeEntry>> => {
    try {
      const result = await pauseTimeTracking(entryId)
      return result
    } catch (error: any) {
      console.error('Error pausing time tracking:', error)
      return { success: false, message: error.message }
    }
  }, [pauseTimeTracking])

  // Enhanced resume tracking with error handling
  const resumeTracking = useCallback(async (entryId: string): Promise<ApiResponse<TimeEntry>> => {
    try {
      const result = await resumeTimeTracking(entryId)
      return result
    } catch (error: any) {
      console.error('Error resuming time tracking:', error)
      return { success: false, message: error.message }
    }
  }, [resumeTimeTracking])

  // Toggle pause/resume for a timer
  const toggleTimer = useCallback(async (entryId: string): Promise<ApiResponse<TimeEntry>> => {
    const entry = activeTimeEntries.find(e => e.id === entryId)
    if (!entry) return { success: false, message: 'Timer not found' }

    if (entry.isPaused) {
      return await resumeTracking(entryId)
    } else {
      return await pauseTracking(entryId)
    }
  }, [activeTimeEntries, resumeTracking, pauseTracking])

  return {
    // State
    activeTimeEntries,
    elapsedTimes,
    
    // Helper functions
    hasActiveTimer,
    getActiveTimer,
    getElapsedTime,
    
    // Actions
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    toggleTimer,
    
    // Computed values
    activeTimersCount: activeTimeEntries.length,
    isAnyTimerRunning: activeTimeEntries.some(entry => !entry.isPaused)
  }
}