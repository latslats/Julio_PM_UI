import { useState, useEffect } from 'react'
import { format, isPast, isToday, parseISO } from 'date-fns'
import { useProjects } from '../../context/ProjectContext'
import { useNotification } from '../../context/NotificationContext'
import { useUI } from '../../context/UIContext'
import { Link } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  FiClock, FiPlay, FiSquare, FiCheck, FiEdit2, FiTrash2, FiX, 
  FiPause, FiLoader, FiList, FiMoreHorizontal, FiFolder
} from 'react-icons/fi'
import { CalendarIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskStatusIndicator from './TaskStatusIndicator'
import { calculateElapsedTime, calculateTotalTimeSpent } from '@/lib/timeUtils'
import useGlobalTimer from '@/hooks/useGlobalTimer'

/**
 * Enhanced TaskCard component with card-based layout and improved visual hierarchy
 * Replaces the row-based TaskItem with better information density and clearer status communication
 */
const TaskCard = ({ task, showProject = true, compact = false }) => {
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
  const { 
    densityConfig, 
    bulkSelectMode, 
    selectedTasks, 
    toggleTaskSelection,
    autoHideActions 
  } = useUI()
  
  const [isTracking, setIsTracking] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editableTask, setEditableTask] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showActions, setShowActions] = useState(!autoHideActions)

  // Find project this task belongs to
  const project = projects.find(p => p.id === task.projectId) || {}

  // Check if task has an active time entry
  const activeTimeEntry = timeEntries.find(entry => entry.taskId === task.id && entry.endTime === null)

  // Use global timer for elapsed time tracking
  const { getElapsedTime } = useGlobalTimer(activeTimeEntry ? [activeTimeEntry] : [])
  const elapsedTime = activeTimeEntry ? getElapsedTime(activeTimeEntry.id) : 0

  // Calculate total time spent on this task (from completed time entries)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)

  // Timer logic now handled by useGlobalTimer hook

  // Calculate total time spent on this task using standardized utilities
  useEffect(() => {
    const totalTime = calculateTotalTimeSpent(task.id, timeEntries, activeTimeEntry, elapsedTime)
    setTotalTimeSpent(totalTime)
  }, [task.id, timeEntries, activeTimeEntry, elapsedTime])

  // Check for due date status
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate))
  const isDueToday = task.dueDate && isToday(parseISO(task.dueDate))

  // Handle task status toggle
  const toggleTaskStatus = async (e) => {
    e.stopPropagation()
    
    try {
      setIsActionLoading(true)
      
      // Normalize current status to handle both 'completed' and 'Completed' formats
      const isCurrentlyCompleted = task.status === 'completed' || task.status === 'Completed'
      // Toggle between completed and in-progress
      const newStatus = isCurrentlyCompleted ? 'in-progress' : 'completed'
      
      // If completing the task, stop any active timers for this task
      if (newStatus === 'completed' && activeTimeEntry) {
        console.log(`Stopping timer for task ${task.id} because task is being marked as completed`)
        const stopResult = await stopTimeTracking(activeTimeEntry.id)
        if (stopResult.success) {
          showNotification('success', `Stopped timer and completed "${task.title}"`)
          setIsTracking(false)
          await fetchActiveTimers()
        } else {
          showNotification('warning', `Task completed but failed to stop timer: ${stopResult.message || 'Unknown error'}`)
        }
      }
      
      // Update the task status
      await updateTask(task.id, { status: newStatus })
      
      if (newStatus === 'completed' && !activeTimeEntry) {
        showNotification('success', `Completed "${task.title}"`)
      } else if (newStatus === 'in-progress') {
        showNotification('success', `Reopened "${task.title}"`)
      }
    } catch (err) {
      console.error('Error toggling task status:', err)
      showNotification('error', `Error updating task: ${err.message || 'Unknown error'}`)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle time tracking
  const toggleTimeTracking = async (e) => {
    e.stopPropagation()
    
    try {
      setIsActionLoading(true)

      if (activeTimeEntry) {
        if (activeTimeEntry.isPaused) {
          // If paused, resume it
          const result = await resumeTimeTracking(activeTimeEntry.id)
          if (result.success) {
            showNotification('success', `Resumed tracking for "${task.title}"`)
            await fetchActiveTimers()
          } else {
            showNotification('error', `Failed to resume tracking: ${result.message || 'Unknown error'}`)
          }
        } else {
          // If running, pause it
          const result = await pauseTimeTracking(activeTimeEntry.id)
          if (result.success) {
            showNotification('success', `Paused tracking for "${task.title}"`)
            await fetchActiveTimers()
          } else {
            showNotification('error', `Failed to pause tracking: ${result.message || 'Unknown error'}`)
          }
        }
      } else {
        // Start a new timer for this task
        const result = await startTimeTracking(task.id)
        if (result.success) {
          showNotification('success', `Started tracking for "${task.title}"`)
          setIsTracking(true)
          await fetchActiveTimers()
        } else {
          showNotification('error', `Failed to start tracking: ${result.message || 'Unknown error'}`)
        }
      }
    } catch (err) {
      console.error('Error toggling time tracking:', err)
      showNotification('error', `Error updating timer: ${err.message || 'Unknown error'}`)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle stopping time tracking
  const handleStopTracking = async (e) => {
    e.stopPropagation()
    
    try {
      setIsActionLoading(true)

      if (activeTimeEntry) {
        const result = await stopTimeTracking(activeTimeEntry.id)
        if (result.success) {
          showNotification('success', `Stopped tracking for "${task.title}"`)
          setIsTracking(false)
          await fetchActiveTimers()
        } else {
          showNotification('error', `Failed to stop tracking: ${result.message || 'Unknown error'}`)
        }
      }
    } catch (err) {
      console.error('Error stopping time tracking:', err)
      showNotification('error', `Error stopping timer: ${err.message || 'Unknown error'}`)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle opening the edit modal
  const handleOpenEditModal = (e) => {
    e.stopPropagation()
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

  // Handle bulk selection
  const handleBulkSelect = (e) => {
    e.stopPropagation()
    toggleTaskSelection(task.id)
  }

  const isCompleted = task.status === 'completed' || task.status === 'Completed'
  const isSelected = selectedTasks.includes(task.id)

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="group"
        onMouseEnter={() => autoHideActions && setShowActions(true)}
        onMouseLeave={() => autoHideActions && setShowActions(false)}
      >
        <Card 
          className={`
            relative overflow-hidden border transition-all duration-200 cursor-pointer
            ${isSelected ? 'ring-2 ring-primary-500 border-primary-200 shadow-lg' : 'border-secondary-200'}
            ${isCompleted ? 'bg-secondary-50/50 opacity-75' : 'bg-white'}
            hover:shadow-lg hover:border-secondary-300 hover:-translate-y-0.5
            ${bulkSelectMode ? 'hover:bg-primary-50/30' : ''}
            ${activeTimeEntry && !activeTimeEntry.isPaused ? 'ring-1 ring-green-200 shadow-green-100' : ''}
          `}
        >
          {/* Status bar at top */}
          {activeTimeEntry && !activeTimeEntry.isPaused && (
            <div className="h-1 bg-gradient-to-r from-green-400 to-blue-500 animate-pulse" />
          )}
          
          <CardContent className={`${compact ? densityConfig.cardPadding : 'p-5'} space-y-4`}>
            {/* Header Row - Enhanced */}
            <div className="flex items-start justify-between gap-4">
              {/* Left: Checkbox and Title */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Bulk Selection Checkbox */}
                {bulkSelectMode && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={handleBulkSelect}
                    className="mt-1 flex-shrink-0"
                    aria-label={`Select task: ${task.title}`}
                  />
                )}

                {/* Enhanced Completion Checkbox */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTaskStatus}
                  className={`
                    flex-shrink-0 mt-0.5 h-6 w-6 rounded-full border-2 transition-all duration-300
                    ${isCompleted
                      ? 'bg-green-500 border-green-500 hover:bg-green-600 shadow-lg shadow-green-200'
                      : 'border-secondary-300 hover:border-primary-400 hover:bg-primary-50 hover:scale-110'
                    }
                  `}
                  aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ 
                      scale: isCompleted ? 1 : 0,
                      rotate: isCompleted ? 0 : -180
                    }}
                    transition={{ 
                      duration: 0.3,
                      type: "spring",
                      stiffness: 200
                    }}
                  >
                    {isCompleted && <FiCheck className="h-4 w-4 text-white" />}
                  </motion.div>
                </Button>

                {/* Enhanced Title and Project */}
                <div className="flex-1 min-w-0">
                  <motion.h3
                    className={`
                      font-semibold leading-tight
                      ${isCompleted ? 'text-secondary-500 line-through' : 'text-secondary-900'}
                      ${compact ? densityConfig.titleSize : 'text-lg'}
                    `}
                    animate={{
                      opacity: isCompleted ? 0.6 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {task.title}
                  </motion.h3>
                  
                  {showProject && project.name && (
                    <div className={`flex items-center gap-1.5 mt-1.5 ${compact ? densityConfig.subtitleSize : 'text-sm'} text-secondary-600`}>
                      <FiFolder className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate font-medium">{project.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Priority and Actions */}
              <div className="flex items-start gap-2 flex-shrink-0">
                {/* Priority indicator */}
                {task.priority === 'high' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 rounded-full bg-red-500 shadow-lg mt-1"
                    title="High priority"
                  />
                )}
                
                {/* Actions */}
                <div className={`flex items-center gap-1 ${autoHideActions && !showActions ? 'opacity-0' : 'opacity-100'} transition-all duration-200`}>
                  <Link
                    to={`/time-entries?taskId=${task.id}`}
                    className={`
                      ${densityConfig.buttonSize} flex items-center justify-center rounded-lg 
                      text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 
                      transition-all duration-200 hover:scale-110
                    `}
                    title="View time entries"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FiList className={densityConfig?.iconSize || 'h-4 w-4'} />
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenEditModal}
                    className={`
                      ${densityConfig.buttonSize} text-secondary-500 hover:bg-secondary-100 
                      hover:text-secondary-700 transition-all duration-200 hover:scale-110
                    `}
                    title="Edit task"
                  >
                    <FiEdit2 className={densityConfig?.iconSize || 'h-4 w-4'} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(true)
                    }}
                    className={`
                      ${densityConfig.buttonSize} text-secondary-500 hover:bg-red-50 
                      hover:text-red-600 transition-all duration-200 hover:scale-110
                    `}
                    title="Delete task"
                  >
                    <FiTrash2 className={densityConfig?.iconSize || 'h-4 w-4'} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Enhanced Status and Time Information */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <TaskStatusIndicator
                  status={task.status}
                  priority={task.priority}
                  dueDate={task.dueDate}
                  isOverdue={isOverdue}
                  isDueToday={isDueToday}
                  activeTimeEntry={activeTimeEntry}
                  elapsedTime={elapsedTime}
                  totalTimeSpent={totalTimeSpent}
                  estimatedHours={task.estimatedHours}
                  compact={compact}
                />
              </div>

              {/* Enhanced Timer Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {activeTimeEntry && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleStopTracking}
                    className={`${densityConfig.buttonSize} text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200`}
                    title="Stop tracking"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <FiLoader className={`${densityConfig?.iconSize || 'h-4 w-4'} animate-spin`} />
                    ) : (
                      <FiSquare className={densityConfig?.iconSize || 'h-4 w-4'} />
                    )}
                  </Button>
                )}
                
                <button
                  onClick={toggleTimeTracking}
                  className={`
                    w-9 h-9 rounded-lg border flex items-center justify-center 
                    transition-all duration-200 shadow-sm hover:shadow-md
                    ${activeTimeEntry
                      ? activeTimeEntry.isPaused
                        ? 'bg-green-500 hover:bg-green-600 border-green-500 text-white shadow-green-200'
                        : 'bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-700'
                      : 'bg-primary-500 hover:bg-primary-600 border-primary-500 text-white shadow-primary-200'
                    }
                    ${isActionLoading ? 'opacity-75 cursor-wait' : 'hover:scale-105'}
                  `}
                  title={activeTimeEntry
                    ? activeTimeEntry.isPaused
                      ? 'Resume tracking'
                      : 'Pause tracking'
                    : 'Start tracking'}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <FiLoader className="h-4 w-4 animate-spin" />
                  ) : activeTimeEntry ? (
                    activeTimeEntry.isPaused ? (
                      <FiPlay className="h-4 w-4" />
                    ) : (
                      <FiPause className="h-4 w-4" />
                    )
                  ) : (
                    <FiPlay className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Enhanced Description */}
            {!compact && task.description && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-t border-secondary-100 pt-3"
              >
                <p className="text-sm text-secondary-600 leading-relaxed line-clamp-2">
                  {task.description}
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Task Modal - Reusing existing modal from TaskItem */}
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
                  <FiX className="h-5 w-5" />
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
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
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
                                format(parseISO(editableTask.dueDate), 'PPP')
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-6 text-center">
                <h3 className="text-lg font-medium text-secondary-900 mb-2">Delete Task</h3>
                <p className="text-sm text-secondary-600 mb-6">
                  Are you sure you want to delete "{task.title}"? This action cannot be undone.
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTask}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default TaskCard