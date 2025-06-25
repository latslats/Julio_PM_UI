import { motion } from 'framer-motion'
import { FiPlay, FiPause, FiClock, FiCircle, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

/**
 * TaskStatusIndicator provides comprehensive visual status communication
 * with color coding, animations, and priority indicators
 */
const TaskStatusIndicator = ({
  status,
  priority,
  dueDate,
  isOverdue,
  isDueToday,
  activeTimeEntry,
  elapsedTime,
  totalTimeSpent,
  estimatedHours,
  compact = false
}) => {
  // Status color scheme configuration
  const statusConfig = {
    completed: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      icon: FiCheckCircle,
      iconColor: 'text-green-500'
    },
    'in-progress': {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200', 
      textColor: 'text-blue-700',
      icon: FiPlay,
      iconColor: 'text-blue-500'
    },
    'not-started': {
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      icon: FiCircle,
      iconColor: 'text-gray-400'
    },
    pending: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      icon: FiClock,
      iconColor: 'text-yellow-500'
    }
  }

  // Priority color scheme
  const priorityConfig = {
    high: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300'
    },
    medium: {
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800', 
      borderColor: 'border-orange-300'
    },
    low: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300'
    }
  }

  // Get current status configuration
  const currentStatus = statusConfig[status?.toLowerCase()] || statusConfig['not-started']
  const StatusIcon = currentStatus.icon

  // Calculate time progress if estimated hours are available
  const timeProgress = estimatedHours && totalTimeSpent 
    ? Math.min((totalTimeSpent / (estimatedHours * 3600)) * 100, 100) 
    : 0

  // Format time display
  const formatTime = (seconds) => {
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`
    }
    return `${(seconds / 3600).toFixed(1)}h`
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Status Indicator with Animation */}
      <motion.div
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md border
          ${currentStatus.bgColor} ${currentStatus.borderColor}
        `}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <StatusIcon className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${currentStatus.iconColor}`} />
        <span className={`${currentStatus.textColor} font-medium capitalize ${compact ? 'text-xs' : 'text-sm'}`}>
          {status?.replace('-', ' ') || 'Not Started'}
        </span>
      </motion.div>

      {/* Priority Badge */}
      {priority && priority !== 'medium' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Badge 
            variant="outline"
            className={`
              ${priorityConfig[priority.toLowerCase()]?.bgColor || priorityConfig.medium.bgColor}
              ${priorityConfig[priority.toLowerCase()]?.textColor || priorityConfig.medium.textColor}
              ${priorityConfig[priority.toLowerCase()]?.borderColor || priorityConfig.medium.borderColor}
              ${compact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'}
            `}
          >
            {priority === 'high' && <FiAlertTriangle className="h-3 w-3 mr-1" />}
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </Badge>
        </motion.div>
      )}

      {/* Due Date Urgency Indicator */}
      {dueDate && (isOverdue || isDueToday) && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Badge 
            variant="outline"
            className={`
              ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
              ${compact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'}
            `}
          >
            <FiClock className="h-3 w-3 mr-1" />
            {isOverdue ? 'Overdue' : 'Due Today'}
          </Badge>
        </motion.div>
      )}

      {/* Active Timer Indicator */}
      {activeTimeEntry && (
        <motion.div
          className={`
            flex items-center gap-1 px-2 py-1 rounded-md border
            ${activeTimeEntry.isPaused 
              ? 'bg-orange-50 border-orange-200 text-orange-700' 
              : 'bg-green-50 border-green-200 text-green-700'
            }
          `}
          animate={{
            scale: activeTimeEntry.isPaused ? 1 : [1, 1.02, 1],
          }}
          transition={{
            duration: activeTimeEntry.isPaused ? 0 : 2,
            repeat: activeTimeEntry.isPaused ? 0 : Infinity,
            ease: "easeInOut"
          }}
        >
          {activeTimeEntry.isPaused ? (
            <FiPause className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
          ) : (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <FiPlay className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
            </motion.div>
          )}
          <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
            {activeTimeEntry.isPaused ? 'Paused' : formatTime(elapsedTime)}
          </span>
        </motion.div>
      )}

      {/* Time Progress Indicator */}
      {!compact && estimatedHours && totalTimeSpent > 0 && (
        <div className="flex items-center gap-2 ml-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <FiClock className="h-3 w-3" />
              <span>
                {formatTime(totalTimeSpent)}
                {estimatedHours && (
                  <span className="text-gray-400">/{estimatedHours}h</span>
                )}
              </span>
            </div>
            {estimatedHours && (
              <Progress 
                value={timeProgress} 
                className={`w-16 h-1.5 ${timeProgress > 100 ? 'bg-red-100' : 'bg-gray-100'}`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskStatusIndicator