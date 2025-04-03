import { useState, useEffect } from 'react'
import { format, isPast, isToday } from 'date-fns'
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
import { FiClock, FiPlay, FiSquare, FiCheck, FiEdit2, FiTrash2, FiX, FiPause, FiLoader, FiList } from 'react-icons/fi'
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

  // Format due date with visual indication if it's overdue or due today
  const formatDueDate = () => {
    if (!task.dueDate) return null

    const dueDate = new Date(task.dueDate)
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
    const newStatus = task.status === 'completed' ? 'in-progress' : 'completed'
    await updateTask(task.id, { status: newStatus })
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
  
  // Handle stopping time tracking
  const handleStopTracking = async () => {
    try {
      setIsActionLoading(true);
      
      if (activeTimeEntry) {
        const result = await stopTimeTracking(activeTimeEntry.id);
        if (result.success) {
          showNotification('success', `Stopped tracking for "${task.title}"`);
          setIsTracking(false);
          await fetchActiveTimers();
        } else {
          showNotification('error', `Failed to stop tracking: ${result.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error stopping time tracking:', err);
      showNotification('error', `Error stopping timer: ${err.message || 'Unknown error'}`);
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
      <motion.div 
        className="py-3 flex items-center justify-between group"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTaskStatus}
            className={`flex-shrink-0 h-5 w-5 rounded-full border transition-all duration-200 ${
              task.status === 'completed'
                ? 'bg-primary-500 border-primary-500 flex items-center justify-center'
                : 'border-secondary-300 hover:border-primary-400'
            }`}
            aria-label={task.status === 'completed' ? 'Mark task as incomplete' : 'Mark task as complete'}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: task.status === 'completed' ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {task.status === 'completed' && <FiCheck className="h-3 w-3 text-white" aria-hidden="true" />}
            </motion.div>
          </Button>

          <div className="ml-3">
            <div className="flex items-center">
              <motion.p 
                className={`text-sm font-medium ${
                  task.status === 'completed' ? 'text-secondary-500 line-through' : 'text-secondary-900'
                }`}
                animate={{ 
                  opacity: task.status === 'completed' ? 0.7 : 1,
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none'
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

              {task.estimatedHours && (
                <span className="text-xs text-secondary-500 flex items-center">
                  <FiClock className="mr-1 h-3 w-3" aria-hidden="true" />
                  {task.estimatedHours}h
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
              )}
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
              <Button
                variant="outline"
                size="icon"
                onClick={handleStopTracking}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                title="Stop tracking"
                aria-label="Stop time tracking"
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FiSquare className="h-5 w-5" aria-hidden="true" />
                  </motion.div>
                )}
              </Button>
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
                        <Label htmlFor={`edit-due-date-${task.id}`} className="text-sm font-medium">Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className="w-full justify-start text-left font-normal mt-1"
                              aria-label="Select due date"
                            >
                              <FiClock className="mr-2 h-4 w-4" aria-hidden="true" />
                              {editableTask.dueDate ? format(new Date(editableTask.dueDate), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={editableTask.dueDate ? new Date(editableTask.dueDate) : undefined}
                              onSelect={(date) => setEditableTask({ ...editableTask, dueDate: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label htmlFor={`edit-estimated-hours-${task.id}`} className="text-sm font-medium">Estimated Hours</Label>
                        <Input
                          id={`edit-estimated-hours-${task.id}`}
                          type="number"
                          name="estimatedHours"
                          value={editableTask.estimatedHours}
                          onChange={(e) => setEditableTask({ ...editableTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                          min="0"
                          step="0.5"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowEditModal(false)}
                      className="transition-all duration-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="transition-all duration-200 hover:bg-primary-600"
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            aria-describedby="delete-task-description"
          >
            <motion.div 
              className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <h3 id="delete-task-title" className="text-lg font-medium text-secondary-900 mb-2">Delete Task</h3>
              <p id="delete-task-description" className="text-secondary-600 mb-4">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex space-x-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteTask}
                  className="transition-all duration-200 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default TaskItem
