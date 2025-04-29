import { useState, useEffect } from 'react'
import { format, isPast, isToday, parseISO } from 'date-fns'
import { useProjects } from '../../context/ProjectContext'
import { useNotification } from '../../context/NotificationContext'
import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FiClock, FiPlay, FiCheckCircle, FiCheck, FiEdit2, FiTrash2, FiX, FiPause, FiLoader, FiList, FiRefreshCw } from 'react-icons/fi'
import { CalendarIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * TaskItem component displays a task with time tracking functionality
 * Enhanced with animations and improved accessibility
 *
 * @param {Object} task - The task data to display
 * @returns {JSX.Element} - The rendered task item
 */
const TaskItem = ({ task }) => {
  const {
    projects,
    updateTask,
    deleteTask,
    startTimeTracking,
    stopTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    resetTimeTracking,
    fetchActiveTimers,
    timeEntries
  } = useProjects()
  const { showNotification } = useNotification()
  const [isTracking, setIsTracking] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editableTask, setEditableTask] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Find project this task belongs to
  const project = projects.find(p => p.id === task.projectId) || {}

  // Check if task has an active time entry
  const activeTimeEntry = timeEntries.find(entry => entry.taskId === task.id && entry.endTime === null)

  // State to track elapsed time for active timer
  const [elapsedTime, setElapsedTime] = useState(0)

  // Calculate total time spent on this task (from completed time entries)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)

  // Calculate total time spent on this task
  useEffect(() => {
    const taskTimeEntries = timeEntries.filter(entry => entry.taskId === task.id)

    // Sum up durations from completed time entries
    const completedTime = taskTimeEntries
      .filter(entry => entry.endTime !== null)
      .reduce((sum, entry) => sum + parseFloat(entry.duration || 0), 0)

    // If there's an active time entry, add the current elapsed time
    let totalTime = completedTime
    if (activeTimeEntry && elapsedTime > 0) {
      totalTime += elapsedTime
    }

    setTotalTimeSpent(totalTime)
  }, [task.id, timeEntries, activeTimeEntry, elapsedTime])

  // Calculate and update elapsed time for active timer
  useEffect(() => {
    if (!activeTimeEntry) {
      setElapsedTime(0)
      return
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      let currentElapsedTime = parseFloat(activeTimeEntry.totalPausedDuration) || 0
      if (!activeTimeEntry.isPaused && activeTimeEntry.lastResumedAt) {
        const now = new Date().getTime()
        const lastResume = new Date(activeTimeEntry.lastResumedAt).getTime()
        currentElapsedTime += (now - lastResume) / 1000
      }
      setElapsedTime(Math.floor(currentElapsedTime))
    }

    // Calculate once immediately
    calculateElapsed()

    // If entry is running (not paused), update every second
    let interval
    if (!activeTimeEntry.isPaused) {
      interval = setInterval(calculateElapsed, 1000)
    }

    // Cleanup function to clear interval
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTimeEntry])

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':')
  }

  // Format time as HH.MM for display (e.g., 5.25h)
  const formatHoursMinutes = (seconds) => {
    const hours = seconds / 3600
    // If less than 0.1 hours (6 minutes), show as minutes
    if (hours < 0.1) {
      const minutes = Math.round(seconds / 60)
      return `${minutes}m`
    }
    return hours.toFixed(2) + 'h'
  }

  // Format due date with visual indication if it's overdue or due today
  const formatDueDate = () => {
    if (!task.dueDate) return null

    const dueDate = parseISO(task.dueDate)
    const isOverdue = isPast(dueDate) && !isToday(dueDate)
    const isDueToday = isToday(dueDate)

    return (
      <span className={`text-xs ${isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-secondary-500'}`}>
        {isOverdue ? 'Overdue: ' : isDueToday ? 'Today: ' : ''}
        {format(dueDate, 'MMM d')}
      </span>
    )
  }

  // Handle task status toggle
  const toggleTaskStatus = async () => {
    // Normalize current status to handle both 'completed' and 'Completed' formats
    const isCurrentlyCompleted = task.status === 'completed' || task.status === 'Completed';
    // Toggle between completed and in-progress
    const newStatus = isCurrentlyCompleted ? 'in-progress' : 'completed';
    await updateTask(task.id, { status: newStatus });
  }

  // Handle time tracking
  const toggleTimeTracking = async () => {
    try {
      setIsActionLoading(true);

      if (activeTimeEntry) {
        if (activeTimeEntry.isPaused) {
          // If paused, resume it
          const result = await resumeTimeTracking(activeTimeEntry.id);
          if (result.success) {
            showNotification('success', `Resumed tracking for "${task.title}"`);
            await fetchActiveTimers();
          } else {
            showNotification('error', `Failed to resume tracking: ${result.message || 'Unknown error'}`);
          }
        } else {
          // If running, pause it
          const result = await pauseTimeTracking(activeTimeEntry.id);
          if (result.success) {
            showNotification('success', `Paused tracking for "${task.title}"`);
            await fetchActiveTimers();
          } else {
            showNotification('error', `Failed to pause tracking: ${result.message || 'Unknown error'}`);
          }
        }
      } else {
        // Start a new timer for this task, even if other tasks have running timers
        const result = await startTimeTracking(task.id);
        if (result.success) {
          showNotification('success', `Started tracking for "${task.title}"`);
          setIsTracking(true);
          await fetchActiveTimers();
        } else {
          showNotification('error', `Failed to start tracking: ${result.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error toggling time tracking:', err);
      showNotification('error', `Error updating timer: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Handle completing time tracking (formerly stopping)
  const handleCompleteTracking = async () => {
    try {
      setIsActionLoading(true);

      if (activeTimeEntry) {
        const result = await stopTimeTracking(activeTimeEntry.id);
        if (result.success) {
          showNotification('success', `Completed time entry for "${task.title}"`);
          setIsTracking(false);
          await fetchActiveTimers();
        } else {
          showNotification('error', `Failed to complete time entry: ${result.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error completing time entry:', err);
      showNotification('error', `Error completing time entry: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Handle resetting time tracking
  const handleResetTracking = async () => {
    try {
      setIsActionLoading(true);

      if (activeTimeEntry) {
        const result = await resetTimeTracking(activeTimeEntry.id);
        if (result.success) {
          showNotification('success', `Reset timer for "${task.title}"`);
          await fetchActiveTimers();
        } else {
          showNotification('error', `Failed to reset timer: ${result.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error resetting timer:', err);
      showNotification('error', `Error resetting timer: ${err.message || 'Unknown error'}`);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Handle opening the edit modal
  const handleOpenEditModal = () => {
    setEditableTask({...task})
    setShowEditModal(true)
  }

  // Handle updating the task
  const handleUpdateTask = async (e) => {
    e.preventDefault()
    if (!editableTask) return

    const result = await updateTask(task.id, editableTask)
    if (result.success) {
      setShowEditModal(false)
    } else {
      console.error('Failed to update task:', result.message)
    }
  }

  // Handle deleting the task
  const handleDeleteTask = async () => {
    const result = await deleteTask(task.id)
    if (result.success) {
      setShowDeleteConfirm(false)
    } else {
      console.error('Failed to delete task:', result.message)
    }
  }

  return (
    <>
      <div
        className={`px-6 py-4 border-b border-secondary-100 hover:bg-secondary-50/70 ${
          task.status?.toLowerCase() === 'completed' ? 'bg-secondary-300/90' : ''
        }`}
      >
        <motion.div
          className="flex items-center justify-between group"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTaskStatus}
              className={`flex-shrink-0 h-5 w-5 rounded-full border transition-all duration-200 ${
                task.status === 'completed' || task.status === 'Completed'
                  ? 'bg-primary-500 border-primary-500 flex items-center justify-center'
                  : 'border-secondary-300 hover:border-primary-400'
              }`}
              aria-label={task.status === 'completed' || task.status === 'Completed' ? 'Mark task as incomplete' : 'Mark task as complete'}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: task.status === 'completed' || task.status === 'Completed' ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {(task.status === 'completed' || task.status === 'Completed') && <FiCheck className="h-3 w-3 text-white" aria-hidden="true" />}
              </motion.div>
            </Button>

            <div className="ml-3">
              <div className="flex items-center">
                <motion.p
                  className={`text-sm font-medium ${
                    task.status === 'completed' || task.status === 'Completed' ? 'text-secondary-500 line-through' : 'text-secondary-900'
                  }`}
                  animate={{
                    opacity: task.status === 'completed' || task.status === 'Completed' ? 0.7 : 1,
                    textDecoration: task.status === 'completed' || task.status === 'Completed' ? 'line-through' : 'none'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {task.title}
                </motion.p>

                <AnimatePresence>
                  {task.priority === 'high' && (
                    <motion.span
                      className="ml-2 px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-800"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      High
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center mt-1 space-x-2">
                <span className="text-xs text-secondary-500">
                  {project.name || 'Unknown Project'}
                </span>

                {formatDueDate()}

                <span className="text-xs text-secondary-500 flex items-center">
                  <FiClock className="mr-1 h-3 w-3" aria-hidden="true" />
                  {/* Show actual/estimated time */}
                  <span className={totalTimeSpent > (task.estimatedHours * 3600 || 0) ? "text-amber-600 font-medium" : ""}>
                    {formatHoursMinutes(totalTimeSpent)}
                  </span>
                  {task.estimatedHours && (
                    <span className="text-secondary-400">/{task.estimatedHours}h</span>
                  )}

                  {/* Show active timer status if running */}
                  {activeTimeEntry && (
                    <motion.span
                      className="ml-1 text-primary-600 font-medium"
                      animate={{
                        color: activeTimeEntry.isPaused ? '#4f46e5' : '#06b6d4',
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {activeTimeEntry.isPaused
                        ? '(paused)'
                        : (
                          <span className="inline-flex items-center">
                            (running:
                            <motion.span
                              animate={{ opacity: [1, 0.7, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                              className="ml-1"
                            >
                              {formatTime(elapsedTime)}
                            </motion.span>
                            )
                          </span>
                        )}
                    </motion.span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Link
              to={`/time-entries?taskId=${task.id}`}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
              title="View time entries"
              aria-label="View time entries for this task"
            >
              <FiList className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenEditModal}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
              title="Edit task"
              aria-label="Edit task"
            >
              <FiEdit2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-secondary-500 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
              title="Delete task"
              aria-label="Delete task"
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="flex space-x-1">
              {activeTimeEntry && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleResetTracking}
                    className="p-2 rounded-lg text-amber-600 hover:bg-amber-50"
                    title="Reset timer"
                    aria-label="Reset timer to zero"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                      </motion.div>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCompleteTracking}
                    className="p-2 rounded-lg text-green-600 hover:bg-green-50"
                    title="Complete time entry"
                    aria-label="Complete time entry"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
                      </motion.div>
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTimeTracking}
                className={`p-2 rounded-lg ${
                  activeTimeEntry
                    ? activeTimeEntry.isPaused
                      ? 'text-primary-600 hover:bg-primary-50' // Paused - show play
                      : 'text-secondary-600 hover:bg-secondary-50' // Running - show pause
                    : 'text-primary-600 hover:bg-primary-50' // Not tracking - show play
                }`}
                title={activeTimeEntry
                  ? activeTimeEntry.isPaused
                    ? 'Resume tracking'
                    : 'Pause tracking'
                  : 'Start tracking'}
                aria-label={activeTimeEntry
                  ? activeTimeEntry.isPaused
                    ? 'Resume time tracking'
                    : 'Pause time tracking'
                  : 'Start time tracking'}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : activeTimeEntry ? (
                  activeTimeEntry.isPaused ? (
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiPlay className="h-5 w-5" aria-hidden="true" />
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiPause className="h-5 w-5" aria-hidden="true" />
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FiPlay className="h-5 w-5" aria-hidden="true" />
                  </motion.div>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {showEditModal && editableTask && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-title"
          >
            <motion.div
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex justify-between items-center p-4 border-b border-secondary-100">
                <h3 id="edit-task-title" className="text-lg font-medium text-secondary-900">Edit Task</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEditModal(false)}
                  className="text-secondary-500 hover:text-secondary-700"
                  aria-label="Close edit task dialog"
                >
                  <FiX className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>

              <div className="p-4 max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleUpdateTask}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`edit-title-${task.id}`} className="text-sm font-medium">Title</Label>
                      <Input
                        id={`edit-title-${task.id}`}
                        type="text"
                        name="title"
                        value={editableTask.title}
                        onChange={(e) => setEditableTask({ ...editableTask, title: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`edit-description-${task.id}`} className="text-sm font-medium">Description</Label>
                      <Textarea
                        id={`edit-description-${task.id}`}
                        name="description"
                        value={editableTask.description || ''}
                        onChange={(e) => setEditableTask({ ...editableTask, description: e.target.value })}
                        rows={3}
                        className="mt-1"
                        placeholder="Add a more detailed description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`edit-priority-${task.id}`} className="text-sm font-medium">Priority</Label>
                        <Select
                          value={editableTask.priority}
                          onValueChange={(value) => setEditableTask({ ...editableTask, priority: value })}
                        >
                          <SelectTrigger id={`edit-priority-${task.id}`} className="mt-1 w-full">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`edit-status-${task.id}`} className="text-sm font-medium">Status</Label>
                        <Select
                          value={editableTask.status}
                          onValueChange={(value) => setEditableTask({ ...editableTask, status: value })}
                        >
                          <SelectTrigger id={`edit-status-${task.id}`} className="mt-1 w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not-started">Not Started</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`edit-dueDate-${task.id}`} className="text-sm font-medium">Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${
                                !editableTask.dueDate && 'text-muted-foreground'
                              }`}
                            >
                              {editableTask.dueDate ? (
                                format(editableTask.dueDate, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={editableTask.dueDate ? parseISO(editableTask.dueDate) : undefined}
                              onSelect={(date) => setEditableTask({ ...editableTask, dueDate: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label htmlFor={`edit-estimatedHours-${task.id}`} className="text-sm font-medium">Estimated Hours</Label>
                        <Input
                          id={`edit-estimatedHours-${task.id}`}
                          type="number"
                          name="estimatedHours"
                          value={editableTask.estimatedHours || ''}
                          onChange={(e) => setEditableTask({ ...editableTask, estimatedHours: e.target.value })}
                          className="mt-1"
                          placeholder="Estimated hours"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                    >
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default TaskItem
