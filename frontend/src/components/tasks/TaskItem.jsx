import { useState } from 'react'
import { format, isPast, isToday } from 'date-fns'
import { useProjects } from '../../context/ProjectContext'
import { FiClock, FiPlay, FiSquare, FiCheck } from 'react-icons/fi'

const TaskItem = ({ task }) => {
  const { projects, updateTask, startTimeTracking, stopTimeTracking, timeEntries } = useProjects()
  const [isTracking, setIsTracking] = useState(false)
  
  // Find project this task belongs to
  const project = projects.find(p => p.id === task.projectId) || {}
  
  // Check if task has an active time entry
  const activeTimeEntry = timeEntries.find(entry => entry.taskId === task.id && entry.endTime === null)
  
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
    await updateTask(task.id, { ...task, status: newStatus })
  }
  
  // Handle time tracking
  const toggleTimeTracking = async () => {
    if (activeTimeEntry) {
      await stopTimeTracking(activeTimeEntry.id)
      setIsTracking(false)
    } else {
      await startTimeTracking(task.id)
      setIsTracking(true)
    }
  }
  
  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={toggleTaskStatus}
          className={`flex-shrink-0 h-5 w-5 rounded-full border ${
            task.status === 'completed'
              ? 'bg-primary-500 border-primary-500 flex items-center justify-center'
              : 'border-secondary-300'
          }`}
        >
          {task.status === 'completed' && <FiCheck className="h-3 w-3 text-white" />}
        </button>
        
        <div className="ml-3">
          <div className="flex items-center">
            <p className={`text-sm font-medium ${
              task.status === 'completed' ? 'text-secondary-500 line-through' : 'text-secondary-900'
            }`}>
              {task.title}
            </p>
            
            {task.priority === 'high' && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-800">
                High
              </span>
            )}
          </div>
          
          <div className="flex items-center mt-1 space-x-2">
            <span className="text-xs text-secondary-500">
              {project.name || 'Unknown Project'}
            </span>
            
            {formatDueDate()}
            
            {task.estimatedHours && (
              <span className="text-xs text-secondary-500 flex items-center">
                <FiClock className="mr-1 h-3 w-3" />
                {task.estimatedHours}h
              </span>
            )}
          </div>
        </div>
      </div>
      
      <button
        onClick={toggleTimeTracking}
        className={`p-2 rounded-lg ${
          activeTimeEntry
            ? 'text-red-600 hover:bg-red-50'
            : 'text-primary-600 hover:bg-primary-50'
        }`}
        title={activeTimeEntry ? 'Stop tracking' : 'Start tracking'}
      >
        {activeTimeEntry ? <FiSquare className="h-5 w-5" /> : <FiPlay className="h-5 w-5" />}
      </button>
    </div>
  )
}

export default TaskItem
