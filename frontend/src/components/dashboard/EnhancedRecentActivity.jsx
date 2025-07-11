import { useMemo } from 'react'
import { 
  FiClock, 
  FiPlay, 
  FiCheckCircle, 
  FiPlus,
  FiActivity,
  FiTarget,
  FiEdit3,
  FiPause,
  FiSquare
} from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import { 
  formatDistanceToNow, 
  format, 
  parseISO, 
  isToday, 
  isYesterday,
  startOfDay,
  endOfDay,
  subDays
} from 'date-fns'

/**
 * Enhanced Recent Activity Component with timeline and improved activity tracking
 * 
 * @param {Object} props
 * @param {Array} props.projects - Array of projects
 * @param {Array} props.tasks - Array of tasks  
 * @param {Array} props.timeEntries - Array of time entries
 * @param {Function} props.startTimeTracking - Function to start time tracking
 * @returns {JSX.Element}
 */
const EnhancedRecentActivity = ({ 
  projects = [], 
  tasks = [], 
  timeEntries = [],
  startTimeTracking = () => {}
}) => {
  
  // Process and combine all activities with enhanced metadata
  const recentActivities = useMemo(() => {
    const now = new Date()
    const last7Days = startOfDay(subDays(now, 7))
    
    const activities = []
    
    // Process time entries (most detailed activity)
    timeEntries.forEach(entry => {
      if (!entry.startTime) return
      
      const startTime = parseISO(entry.startTime)
      if (startTime < last7Days) return
      
      const task = (tasks || []).find(t => t.id === entry.taskId)
      const project = task ? (projects || []).find(p => p.id === task.projectId) : null
      
      if (entry.endTime) {
        // Completed time entry
        activities.push({
          id: `time-${entry.id}-end`,
          type: 'time-stop',
          timestamp: parseISO(entry.endTime),
          task,
          project,
          entry,
          duration: entry.duration,
          title: 'Stopped tracking',
          subtitle: task?.title || 'Unknown Task',
          icon: <FiSquare className="h-3.5 w-3.5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        })
      }
      
      // Time entry start
      activities.push({
        id: `time-${entry.id}-start`,
        type: 'time-start',
        timestamp: startTime,
        task,
        project,
        entry,
        title: 'Started tracking',
        subtitle: task?.title || 'Unknown Task',
        icon: <FiPlay className="h-3.5 w-3.5" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      })
    })
    
    // Process task completions
    tasks.forEach(task => {
      if (task.status === 'completed' && task.updatedAt) {
        const updatedTime = parseISO(task.updatedAt)
        if (updatedTime < last7Days) return
        
        const project = (projects || []).find(p => p.id === task.projectId)
        
        activities.push({
          id: `task-${task.id}-complete`,
          type: 'task-complete',
          timestamp: updatedTime,
          task,
          project,
          title: 'Completed task',
          subtitle: task.title,
          icon: <FiCheckCircle className="h-3.5 w-3.5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        })
      }
    })
    
    // Process new tasks (if they have createdAt)
    tasks.forEach(task => {
      if (task.createdAt) {
        const createdTime = parseISO(task.createdAt)
        if (createdTime < last7Days) return
        
        const project = (projects || []).find(p => p.id === task.projectId)
        
        activities.push({
          id: `task-${task.id}-create`,
          type: 'task-create',
          timestamp: createdTime,
          task,
          project,
          title: 'Created task',
          subtitle: task.title,
          icon: <FiPlus className="h-3.5 w-3.5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        })
      }
    })
    
    // Process new projects (if they have createdAt)
    projects.forEach(project => {
      if (project.createdAt) {
        const createdTime = parseISO(project.createdAt)
        if (createdTime < last7Days) return
        
        activities.push({
          id: `project-${project.id}-create`,
          type: 'project-create',
          timestamp: createdTime,
          project,
          title: 'Created project',
          subtitle: project.name,
          icon: <FiPlus className="h-3.5 w-3.5" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        })
      }
    })
    
    // Sort by timestamp (most recent first) and take the latest activities
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12) // Show latest 12 activities
  }, [projects, tasks, timeEntries])
  
  // Group activities by date for better organization
  const groupedActivities = useMemo(() => {
    const groups = {}
    
    recentActivities.forEach(activity => {
      let dateKey
      const activityDate = activity.timestamp
      
      if (isToday(activityDate)) {
        dateKey = 'Today'
      } else if (isYesterday(activityDate)) {
        dateKey = 'Yesterday'
      } else {
        dateKey = format(activityDate, 'MMM d')
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })
    
    return groups
  }, [recentActivities])
  
  // Generate project color
  const getProjectColor = (project) => {
    if (project?.color) return project.color
    const colors = [
      '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', 
      '#F59E0B', '#EF4444', '#EC4899', '#6366F1'
    ]
    const hash = project?.name?.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }
  
  // Format activity time
  const formatActivityTime = (timestamp) => {
    if (isToday(timestamp)) {
      return format(timestamp, 'h:mm a')
    }
    return formatDistanceToNow(timestamp, { addSuffix: true })
  }
  
  // Check if task is currently being tracked
  const isTaskActive = (task) => {
    if (!task) return false
    return timeEntries.some(entry => entry.taskId === task.id && entry.endTime === null)
  }
  
  // Render activity item
  const ActivityItem = ({ activity, isLast = false }) => {
    const projectColor = getProjectColor(activity.project)
    const isActive = isTaskActive(activity.task)
    
    return (
      <div className="relative max-h-16 overflow-hidden">
        {/* Timeline connector */}
        {!isLast && (
          <div className="absolute left-3 top-6 w-px h-4 bg-border/40" />
        )}
        
        <div className="flex items-start gap-2.5 group py-1">
          {/* Activity icon */}
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full border z-10 flex-shrink-0",
            activity.bgColor,
            activity.borderColor,
            activity.color
          )}>
            {activity.icon}
          </div>
          
          {/* Activity content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Activity description with compact layout */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {activity.title}
                  </span>
                  {isActive && (
                    <div className="flex items-center text-green-600">
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse mr-1"></div>
                      <span className="text-xs font-medium">Active</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground truncate mb-1">
                  {activity.subtitle}
                </p>
                
                {/* Project info - more compact */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activity.project && (
                    <div 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${projectColor}15`,
                        color: projectColor
                      }}
                    >
                      <div 
                        className="w-1 h-1 rounded-full mr-1"
                        style={{ backgroundColor: projectColor }}
                      />
                      {activity.project.name}
                    </div>
                  )}
                  
                  {activity.task?.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs h-4 px-1">
                      High
                    </Badge>
                  )}
                  
                  {/* Duration for completed time entries */}
                  {activity.type === 'time-stop' && activity.duration && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(activity.duration / 60)}m
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action button and timestamp */}
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {activity.task && !isActive && activity.type !== 'time-stop' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startTimeTracking(activity.task.id)}
                    title="Start Timer"
                  >
                    <FiPlay className="h-2.5 w-2.5" />
                  </Button>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatActivityTime(activity.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-6 px-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              Recent Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your latest work activity
            </p>
          </div>
          <FiActivity className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2" style={{ height: '400px' }}>
          {Object.keys(groupedActivities).length > 0 ? (
            Object.entries(groupedActivities).map(([dateGroup, activities]) => (
              <div key={dateGroup} className="space-y-1">
                {/* Date header */}
                <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 -mx-2 px-2 mb-1 z-10">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {dateGroup}
                  </div>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                
                {/* Activities for this date */}
                <div className="space-y-1">
                  {activities.map((activity, index) => (
                    <ActivityItem 
                      key={activity.id} 
                      activity={activity} 
                      isLast={index === activities.length - 1 && dateGroup === Object.keys(groupedActivities)[Object.keys(groupedActivities).length - 1]}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FiActivity className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No recent activity</h3>
              <p className="text-xs text-muted-foreground">
                Start working on tasks to see activity here
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedRecentActivity