import { useState, useEffect, useRef, useCallback } from 'react'
import { calculateElapsedTime } from '@/lib/timeUtils'

/**
 * Global timer hook that manages a single interval for all active time entries
 * This replaces multiple individual timers to improve performance
 * 
 * Usage:
 * const { elapsedTimes, registerTimer, unregisterTimer } = useGlobalTimer(activeTimeEntries)
 */

let globalTimer = null
let timerSubscribers = new Set()
let currentElapsedTimes = {}

const useGlobalTimer = (activeTimeEntries = []) => {
  const [elapsedTimes, setElapsedTimes] = useState({})
  const subscriberId = useRef(Symbol('timer-subscriber'))
  const lastActiveEntries = useRef([])

  // Function to update elapsed times for all active entries
  const updateAllElapsedTimes = useCallback(() => {
    const newElapsedTimes = {}
    
    // Get current active entries from all subscribers
    const allActiveEntries = Array.from(timerSubscribers).reduce((acc, subscriber) => {
      if (subscriber.getActiveEntries) {
        acc.push(...subscriber.getActiveEntries())
      }
      return acc
    }, [])

    // Remove duplicates by entry ID (with null safety)
    const uniqueEntries = allActiveEntries.reduce((acc, entry) => {
      if (entry && entry.id && !acc.find(e => e && e.id === entry.id)) {
        acc.push(entry)
      }
      return acc
    }, [])

    // Calculate elapsed time for each unique active entry
    // Use calculateElapsedTime for both running and paused entries
    // as it handles paused state correctly by returning stored duration
    uniqueEntries.forEach(entry => {
      newElapsedTimes[entry.id] = calculateElapsedTime(entry)
    })

    // Update global state
    currentElapsedTimes = newElapsedTimes
    
    // Notify all subscribers
    timerSubscribers.forEach(subscriber => {
      if (subscriber.updateElapsedTimes) {
        subscriber.updateElapsedTimes(newElapsedTimes)
      }
    })
  }, [])

  // Check if there are any running (non-paused) timers across all subscribers
  const hasRunningTimers = useCallback(() => {
    return Array.from(timerSubscribers).some(subscriber => {
      if (subscriber.getActiveEntries) {
        return subscriber.getActiveEntries().some(entry => entry && !entry.isPaused)
      }
      return false
    })
  }, [])

  // Start global timer if not already running and there are running timers
  const startGlobalTimer = useCallback(() => {
    if (globalTimer) return
    
    // Only start the interval timer if there are actively running timers
    if (hasRunningTimers()) {
      console.log('🕐 Starting global timer')
      globalTimer = setInterval(updateAllElapsedTimes, 1000)
    }
  }, [updateAllElapsedTimes, hasRunningTimers])

  // Stop global timer if no running timers or no subscribers
  const stopGlobalTimer = useCallback(() => {
    if (globalTimer && (!hasRunningTimers() || timerSubscribers.size === 0)) {
      console.log('🛑 Stopping global timer')
      clearInterval(globalTimer)
      globalTimer = null
      if (timerSubscribers.size === 0) {
        currentElapsedTimes = {}
      }
    }
  }, [hasRunningTimers])

  // Register this component as a timer subscriber
  useEffect(() => {
    const subscriber = {
      id: subscriberId.current,
      getActiveEntries: () => activeTimeEntries.filter(entry => entry), // Include ALL active entries (running and paused)
      updateElapsedTimes: (newElapsedTimes) => {
        setElapsedTimes(newElapsedTimes)
      }
    }

    timerSubscribers.add(subscriber)
    
    // Always do initial calculation for all entries (paused and running)
    updateAllElapsedTimes()

    // Start interval timer only if there are running entries
    if (activeTimeEntries.some(entry => entry && !entry.isPaused)) {
      startGlobalTimer()
    } else {
      // Stop timer if all entries are paused
      setTimeout(stopGlobalTimer, 0)
    }

    return () => {
      timerSubscribers.delete(subscriber)
      setTimeout(stopGlobalTimer, 0) // Defer to next tick
    }
  }, [activeTimeEntries, startGlobalTimer, stopGlobalTimer, updateAllElapsedTimes])

  // Update when active entries change
  useEffect(() => {
    if (activeTimeEntries.length > 0) {
      // Update all elapsed times first
      updateAllElapsedTimes()
      
      // Start timer only if there are running entries
      if (activeTimeEntries.some(entry => entry && !entry.isPaused)) {
        startGlobalTimer()
      } else {
        // All entries are paused, stop the interval timer
        setTimeout(stopGlobalTimer, 0)
      }
    } else {
      // No active entries for this component, clear local state
      setElapsedTimes({})
      setTimeout(stopGlobalTimer, 0)
    }
    
    // Store reference to detect changes
    lastActiveEntries.current = activeTimeEntries
  }, [activeTimeEntries, startGlobalTimer, stopGlobalTimer, updateAllElapsedTimes])

  // Helper function to get elapsed time for a specific entry
  const getElapsedTime = useCallback((entryId) => {
    return elapsedTimes[entryId] || 0
  }, [elapsedTimes])

  // Helper function to check if timer is running
  const isTimerRunning = useCallback((entryId) => {
    return entryId in elapsedTimes
  }, [elapsedTimes])

  return {
    elapsedTimes,
    getElapsedTime,
    isTimerRunning,
    globalTimerActive: globalTimer !== null
  }
}

export default useGlobalTimer