import { useState } from 'react'
import { useProjects } from '../../context/ProjectContext'
import { useNotification } from '../../context/NotificationContext'
import { useUI } from '../../context/UIContext'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  FiCheck, FiX, FiTrash2, FiFolder, FiClock, FiPlay, 
  FiSquare, FiMoreHorizontal, FiCheckCircle, FiXCircle 
} from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * BulkActions component provides multi-select task operations
 * Includes batch status changes, time operations, project reassignment, and deletion
 */
const BulkActions = ({ 
  selectedTasks = [], 
  tasks = [], 
  onActionComplete 
}) => {
  const { updateTask, deleteTask, startTimeTracking, stopTimeTracking, projects } = useProjects()
  const { showNotification } = useNotification()
  const { clearTaskSelection, toggleBulkSelectMode } = useUI()
  
  const [isPerformingAction, setIsPerformingAction] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  // Get selected task objects
  const selectedTaskObjects = tasks.filter(task => selectedTasks.includes(task.id))

  // Perform bulk action with progress tracking
  const performBulkAction = async (action, actionData = {}) => {
    setIsPerformingAction(true)
    
    try {
      const results = await Promise.all(
        selectedTaskObjects.map(async (task) => {
          try {
            switch (action) {
              case 'complete':
                return await updateTask(task.id, { status: 'completed' })
              case 'incomplete':
                return await updateTask(task.id, { status: 'in-progress' })
              case 'delete':
                return await deleteTask(task.id)
              case 'changeProject':
                return await updateTask(task.id, { projectId: actionData.projectId })
              case 'changePriority':
                return await updateTask(task.id, { priority: actionData.priority })
              case 'startTimer':
                return await startTimeTracking(task.id)
              case 'stopTimer':
                const activeEntry = task.activeTimeEntry
                return activeEntry ? await stopTimeTracking(activeEntry.id) : { success: true }
              default:
                return { success: false, message: 'Unknown action' }
            }
          } catch (error) {
            return { success: false, message: error.message }
          }
        })
      )

      const successful = results.filter(r => r.success).length
      const failed = results.length - successful

      if (successful > 0) {
        const actionNames = {
          complete: 'completed',
          incomplete: 'marked as incomplete',
          delete: 'deleted',
          changeProject: 'moved to new project',
          changePriority: 'priority updated',
          startTimer: 'timers started',
          stopTimer: 'timers stopped'
        }
        
        showNotification(
          'success', 
          `${successful} tasks ${actionNames[action]}${failed > 0 ? ` (${failed} failed)` : ''}`
        )
        
        clearTaskSelection()
        onActionComplete?.()
      } else {
        showNotification('error', `Failed to ${action} tasks`)
      }
    } catch (error) {
      console.error('Bulk action error:', error)
      showNotification('error', 'An unexpected error occurred')
    } finally {
      setIsPerformingAction(false)
      setShowConfirmDialog(false)
      setPendingAction(null)
    }
  }

  // Handle destructive actions with confirmation
  const handleDestructiveAction = (action, actionData = {}) => {
    setPendingAction({ action, actionData })
    setShowConfirmDialog(true)
  }

  // Get action counts
  const getActionCounts = () => {
    const completed = selectedTaskObjects.filter(t => t.status === 'completed').length
    const incomplete = selectedTaskObjects.length - completed
    const withActiveTimers = selectedTaskObjects.filter(t => t.activeTimeEntry).length
    
    return { completed, incomplete, withActiveTimers }
  }

  const { completed, incomplete, withActiveTimers } = getActionCounts()

  if (selectedTasks.length === 0) return null

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ 
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-md">
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                {/* Selection Info */}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary-100 text-primary-800">
                    {selectedTasks.length} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearTaskSelection}
                    className="h-8 w-8 text-secondary-500 hover:text-secondary-700"
                    title="Clear selection"
                  >
                    <FiX className="h-4 w-4" />
                  </Button>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-secondary-200" />

                {/* Status Actions */}
                <div className="flex items-center gap-1">
                  {incomplete > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performBulkAction('complete')}
                      disabled={isPerformingAction}
                      className="h-8 px-3 text-green-600 border-green-200 hover:bg-green-50"
                      title={`Mark ${incomplete} tasks as complete`}
                    >
                      <FiCheckCircle className="h-4 w-4 mr-1" />
                      Complete ({incomplete})
                    </Button>
                  )}
                  
                  {completed > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performBulkAction('incomplete')}
                      disabled={isPerformingAction}
                      className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50"
                      title={`Mark ${completed} tasks as incomplete`}
                    >
                      <FiXCircle className="h-4 w-4 mr-1" />
                      Reopen ({completed})
                    </Button>
                  )}
                </div>

                {/* Time Tracking Actions */}
                {selectedTasks.length <= 5 && (
                  <>
                    <div className="h-6 w-px bg-secondary-200" />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performBulkAction('startTimer')}
                        disabled={isPerformingAction}
                        className="h-8 px-3 text-primary-600 border-primary-200 hover:bg-primary-50"
                        title="Start timers for selected tasks"
                      >
                        <FiPlay className="h-4 w-4 mr-1" />
                        Start Timers
                      </Button>

                      {withActiveTimers > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => performBulkAction('stopTimer')}
                          disabled={isPerformingAction}
                          className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                          title={`Stop ${withActiveTimers} active timers`}
                        >
                          <FiSquare className="h-4 w-4 mr-1" />
                          Stop ({withActiveTimers})
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* Project & Priority Actions */}
                <div className="h-6 w-px bg-secondary-200" />
                <div className="flex items-center gap-1">
                  {/* Move to Project */}
                  <Select onValueChange={(projectId) => 
                    performBulkAction('changeProject', { projectId })
                  }>
                    <SelectTrigger className="h-8 w-auto border-secondary-200">
                      <div className="flex items-center gap-1 px-2">
                        <FiFolder className="h-4 w-4" />
                        <span className="text-sm">Move to...</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Change Priority */}
                  <Select onValueChange={(priority) => 
                    performBulkAction('changePriority', { priority })
                  }>
                    <SelectTrigger className="h-8 w-auto border-secondary-200">
                      <div className="flex items-center gap-1 px-2">
                        <FiMoreHorizontal className="h-4 w-4" />
                        <span className="text-sm">Priority...</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Destructive Actions */}
                <div className="h-6 w-px bg-secondary-200" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDestructiveAction('delete')}
                  disabled={isPerformingAction}
                  className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                  title="Delete selected tasks"
                >
                  <FiTrash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>

                {/* Loading indicator */}
                {isPerformingAction && (
                  <div className="flex items-center gap-2 text-sm text-secondary-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                    Processing...
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && pendingAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <FiTrash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Delete {selectedTasks.length} Tasks
                </h3>
                <p className="text-sm text-secondary-600 mb-6">
                  Are you sure you want to delete {selectedTasks.length} selected tasks? 
                  This action cannot be undone and will also delete all associated time entries.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isPerformingAction}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => performBulkAction(pendingAction.action, pendingAction.actionData)}
                    disabled={isPerformingAction}
                    className="min-w-[80px]"
                  >
                    {isPerformingAction ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      'Delete Tasks'
                    )}
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

export default BulkActions