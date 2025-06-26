/**
 * Unified Time Utilities
 * 
 * This module provides consistent time calculation and formatting functions
 * across all components to ensure time tracking works consistently between
 * the Overview tab (TimeTrackingWidget) and My Tasks tab (TaskCard).
 * 
 * Key principles:
 * - Use `entry.duration` as the primary field (TimeTrackingWidget reference)
 * - Calculate real-time elapsed time for non-paused timers
 * - Consistent formatting across all components
 */

/**
 * Formats seconds into HH:MM:SS format
 * Used consistently across all time-related components
 * 
 * @param {number} seconds - Total seconds to format
 * @returns {string} Formatted time string in HH:MM:SS format
 */
export const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':')
}

/**
 * Formats seconds into a compact format (e.g., "2h 30m" or "45m")
 * Used for shorter displays where space is limited
 * 
 * @param {number} seconds - Total seconds to format
 * @returns {string} Formatted compact time string
 */
export const formatTimeCompact = (seconds) => {
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

/**
 * Calculates the current elapsed time for a time entry
 * This is the DEFINITIVE calculation logic that should be used everywhere
 * 
 * Based on TimeTrackingWidget logic (the working reference):
 * - For running timers: stored duration + time since last resume
 * - For paused timers: just the stored duration
 * 
 * @param {Object} timeEntry - The time entry object
 * @param {number} timeEntry.duration - Stored duration in seconds
 * @param {boolean} timeEntry.isPaused - Whether the timer is paused
 * @param {string} timeEntry.lastResumedAt - ISO timestamp of last resume
 * @returns {number} Current elapsed seconds (floored to integer)
 */
export const calculateElapsedTime = (timeEntry) => {
  if (!timeEntry) return 0

  let currentElapsedTime = 0
  
  if (!timeEntry.isPaused && timeEntry.lastResumedAt) {
    // Timer is running - use stored duration + time since resume
    const storedDuration = parseFloat(timeEntry.duration) || 0
    const now = new Date().getTime()
    const lastResume = new Date(timeEntry.lastResumedAt).getTime()
    const timeSinceResume = (now - lastResume) / 1000
    currentElapsedTime = storedDuration + Math.max(0, timeSinceResume)
  } else {
    // Timer is paused - just use the stored duration
    currentElapsedTime = parseFloat(timeEntry.duration) || 0
  }

  return Math.floor(currentElapsedTime)
}

/**
 * Calculates total time spent on a task from multiple time entries
 * Includes both completed entries and any active entry
 * 
 * @param {string} taskId - The task ID to calculate time for
 * @param {Array} timeEntries - Array of all time entries
 * @param {Object} activeTimeEntry - Current active time entry (if any)
 * @param {number} currentElapsedTime - Current elapsed time for active entry
 * @returns {number} Total time spent in seconds
 */
export const calculateTotalTimeSpent = (taskId, timeEntries, activeTimeEntry = null, currentElapsedTime = 0) => {
  const taskTimeEntries = timeEntries.filter(entry => entry.taskId === taskId)

  // Sum up durations from completed time entries
  const completedTime = taskTimeEntries
    .filter(entry => entry.endTime !== null)
    .reduce((sum, entry) => sum + parseFloat(entry.duration || 0), 0)

  // If there's an active time entry for this task, add the current elapsed time
  let totalTime = completedTime
  if (activeTimeEntry && activeTimeEntry.taskId === taskId && currentElapsedTime > 0) {
    totalTime += currentElapsedTime
  }

  return totalTime
}

/**
 * Creates a timer update function that can be used with setInterval
 * This function encapsulates the timer logic and state updates
 * 
 * @param {Object} timeEntry - The time entry to track
 * @param {Function} setElapsedTime - State setter for elapsed time
 * @returns {Function} Function that calculates and updates elapsed time
 */
export const createTimerUpdater = (timeEntry, setElapsedTime) => {
  return () => {
    const elapsed = calculateElapsedTime(timeEntry)
    setElapsedTime(elapsed)
  }
}

/**
 * Calculates progress percentage based on estimated hours
 * 
 * @param {number} elapsedSeconds - Time spent in seconds
 * @param {number} estimatedHours - Estimated hours for the task
 * @returns {number} Progress percentage (0-100+)
 */
export const calculateTimeProgress = (elapsedSeconds, estimatedHours) => {
  if (!estimatedHours || elapsedSeconds <= 0) return 0
  
  const estimatedSeconds = estimatedHours * 3600
  return Math.min((elapsedSeconds / estimatedSeconds) * 100, 100)
}

/**
 * Checks if a time entry represents an overtime situation
 * 
 * @param {number} elapsedSeconds - Time spent in seconds
 * @param {number} estimatedHours - Estimated hours for the task
 * @returns {boolean} True if over the estimated time
 */
export const isOvertime = (elapsedSeconds, estimatedHours) => {
  if (!estimatedHours) return false
  
  const estimatedSeconds = estimatedHours * 3600
  return elapsedSeconds > estimatedSeconds
}

/**
 * Formats overtime amount as a human-readable string
 * 
 * @param {number} elapsedSeconds - Time spent in seconds
 * @param {number} estimatedHours - Estimated hours for the task
 * @returns {string} Overtime amount (e.g., "2.5h over")
 */
export const formatOvertime = (elapsedSeconds, estimatedHours) => {
  if (!isOvertime(elapsedSeconds, estimatedHours)) return ''
  
  const estimatedSeconds = estimatedHours * 3600
  const overtimeSeconds = elapsedSeconds - estimatedSeconds
  const overtimeHours = overtimeSeconds / 3600
  
  return `${overtimeHours.toFixed(1)}h over`
}