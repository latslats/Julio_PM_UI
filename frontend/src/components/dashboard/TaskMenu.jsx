import { useMemo } from 'react'
import { 
  FiCheckCircle, 
  FiClock, 
  FiTarget,
  FiList,
  FiFolder,
  FiCornerDownRight
} from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import { Droppable, Draggable } from 'react-beautiful-dnd'

/**
 * Task Menu Component - Shows tasks nested under projects with drag-and-drop functionality
 * 
 * @param {Object} props
 * @param {Array} props.projects - Array of projects
 * @param {Array} props.tasks - Array of tasks
 * @param {Function} props.startTimeTracking - Function to start time tracking
 * @returns {JSX.Element}
 */
const TaskMenu = ({ 
  projects = [], 
  tasks = [], 
  startTimeTracking = () => {}
}) => {
  
  // Filter tasks to only show non-completed ones and group them by project
  const groupedTasks = useMemo(() => {
    const grouped = {}
    
    // Filter to only include tasks that are not completed
    const activeTasks = tasks.filter(task => task.status !== 'completed')
    
    // Group active tasks by project
    activeTasks.forEach(task => {
      const project = projects.find(p => p.id === task.projectId)
      if (!project) return
      
      const projectId = project.id
      if (!grouped[projectId]) {
        grouped[projectId] = {
          project,
          tasks: []
        }
      }
      
      grouped[projectId].tasks.push(task)
    })
    
    // Sort tasks within each project by priority and creation date
    Object.values(grouped).forEach(group => {
      group.tasks.sort((a, b) => {
        // Priority order: high, medium, low
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 }
        const priorityA = priorityOrder[a.priority] ?? 3
        const priorityB = priorityOrder[b.priority] ?? 3
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        
        // Then by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
    })
    
    return grouped
  }, [projects, tasks])
  
  // Generate project color (consistent with other components)
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
  
  // Get priority badge styling
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  
  // Render project header
  const renderProjectHeader = (projectGroup) => {
    const projectColor = getProjectColor(projectGroup.project)
    const taskCount = projectGroup.tasks.length
    
    return (
      <div className="flex items-center gap-2 mb-2 px-2 py-1">
        <div 
          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
          style={{
            backgroundColor: `${projectColor}15`,
            borderColor: `${projectColor}40`,
            color: projectColor
          }}
        >
          <FiFolder className="w-3 h-3 mr-1" />
          {projectGroup.project.name}
          <span className="ml-1 px-1 py-0.5 text-xs bg-white/60 rounded-full">
            {taskCount}
          </span>
        </div>
      </div>
    )
  }
  
  // Render individual task item
  const renderTaskItem = (task, globalIndex, isFirstInProject = false) => {
    const priority = task.priority || 'medium'
    
    return (
      <Draggable key={task.id} draggableId={`task-${task.id}`} index={globalIndex}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "group transition-all duration-200",
              snapshot.isDragging && "transform rotate-2 scale-105 shadow-lg"
            )}
          >
            <div className="flex items-start gap-2">
              {/* Hierarchical connector */}
              <div className="flex flex-col items-center pt-2">
                <FiCornerDownRight className="h-3 w-3 text-muted-foreground/60" />
                {!isFirstInProject && (
                  <div className="w-px h-4 bg-border/40 mt-1"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "p-2 rounded-md border border-border/50 bg-card hover:bg-muted/30 transition-all cursor-move",
                  snapshot.isDragging && "bg-muted/50 border-primary/30 shadow-md"
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-tight mb-1">
                        {task.title}
                      </p>
                      
                      {/* Task metadata */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs h-4 px-1", getPriorityBadge(priority))}>
                          {priority}
                        </Badge>
                        
                        {task.estimatedHours && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FiTarget className="h-3 w-3" />
                            {task.estimatedHours}h
                          </div>
                        )}
                        
                        {task.status && (
                          <Badge variant="secondary" className="text-xs h-4 px-1">
                            {task.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Drag handle indicator */}
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-1 h-1 bg-muted-foreground/40 rounded-full"></div>
                        <div className="w-1 h-1 bg-muted-foreground/40 rounded-full"></div>
                        <div className="w-1 h-1 bg-muted-foreground/40 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    )
  }
  
  const totalTasks = Object.values(groupedTasks).reduce((sum, group) => sum + group.tasks.length, 0)
  
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-6 px-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              Active Tasks
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Drag tasks to start tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FiList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{totalTasks}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Droppable droppableId="task-menu">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="max-h-[400px] overflow-y-auto space-y-4 pr-2"
              style={{ height: '400px' }}
            >
              {Object.keys(groupedTasks).length > 0 ? (
                (() => {
                  let globalIndex = 0
                  return Object.entries(groupedTasks).map(([projectId, projectGroup]) => (
                    <div key={projectId} className="space-y-2">
                      {/* Project header */}
                      {renderProjectHeader(projectGroup)}
                      
                      {/* Tasks for this project */}
                      <div className="space-y-1">
                        {projectGroup.tasks.map((task, index) => 
                          renderTaskItem(task, globalIndex++, index === 0)
                        )}
                      </div>
                    </div>
                  ))
                })()
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <FiCheckCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">All tasks completed!</h3>
                  <p className="text-xs text-muted-foreground">
                    Great job! Create new tasks to continue working.
                  </p>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  )
}

export default TaskMenu