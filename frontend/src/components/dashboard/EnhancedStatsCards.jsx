import { useMemo } from 'react'
import { 
  FiFolder, 
  FiActivity, 
  FiCheckCircle, 
  FiClock, 
  FiTrendingUp, 
  FiTrendingDown,
  FiMinus,
  FiTarget,
  FiCalendar
} from 'react-icons/fi'
import { Card, CardContent } from '../ui/card'
import { Progress } from '../ui/progress'
import { cn } from '../../lib/utils'
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  subDays, 
  subWeeks,
  parseISO,
  isWithinInterval 
} from 'date-fns'

/**
 * Enhanced Statistics Cards Component with trend indicators and progress visualization
 * 
 * @param {Object} props
 * @param {Array} props.projects - Array of projects
 * @param {Array} props.tasks - Array of tasks  
 * @param {Array} props.timeEntries - Array of time entries
 * @param {number} props.trackedHoursToday - Hours tracked today
 * @returns {JSX.Element}
 */
const EnhancedStatsCards = ({ 
  projects = [], 
  tasks = [], 
  timeEntries = [], 
  trackedHoursToday = 0 
}) => {
  
  // Calculate trend data and insights
  const statsWithTrends = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const yesterdayStart = startOfDay(subDays(now, 1))
    const yesterdayEnd = endOfDay(subDays(now, 1))
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

    // Projects analysis
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status !== 'completed').length
    const newProjectsThisWeek = projects.filter(p => {
      if (!p.createdAt) return false
      const createdDate = parseISO(p.createdAt)
      return isWithinInterval(createdDate, { start: thisWeekStart, end: thisWeekEnd })
    }).length
    const newProjectsLastWeek = projects.filter(p => {
      if (!p.createdAt) return false
      const createdDate = parseISO(p.createdAt)
      return isWithinInterval(createdDate, { start: lastWeekStart, end: lastWeekEnd })
    }).length

    // Tasks analysis
    const totalTasks = tasks.length
    const activeTasks = tasks.filter(t => t.status !== 'completed').length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length
    const tasksCompletedToday = tasks.filter(t => {
      if (t.status !== 'completed' || !t.updatedAt) return false
      const updatedDate = parseISO(t.updatedAt)
      return isWithinInterval(updatedDate, { start: todayStart, end: todayEnd })
    }).length
    const tasksCompletedYesterday = tasks.filter(t => {
      if (t.status !== 'completed' || !t.updatedAt) return false
      const updatedDate = parseISO(t.updatedAt)
      return isWithinInterval(updatedDate, { start: yesterdayStart, end: yesterdayEnd })
    }).length

    // Time tracking analysis
    const todayEntries = timeEntries.filter(entry => {
      if (!entry.startTime || !entry.endTime) return false
      const entryStart = new Date(entry.startTime)
      return isWithinInterval(entryStart, { start: todayStart, end: todayEnd })
    })
    
    const yesterdayEntries = timeEntries.filter(entry => {
      if (!entry.startTime || !entry.endTime) return false
      const entryStart = new Date(entry.startTime)
      return isWithinInterval(entryStart, { start: yesterdayStart, end: yesterdayEnd })
    })

    const trackedHoursYesterday = yesterdayEntries.reduce((total, entry) => {
      const start = new Date(entry.startTime)
      const end = new Date(entry.endTime)
      const durationMs = end - start
      const durationHours = durationMs / 3600000
      return total + (durationHours > 0 && durationHours < 12 ? durationHours : 0) // Sanity check
    }, 0)

    // Active time entries
    const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null).length

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Productivity score (based on tasks completed vs time spent)
    const productivityScore = trackedHoursToday > 0 ? (tasksCompletedToday / trackedHoursToday) * 10 : 0

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 'up' : 'neutral'
      const change = ((current - previous) / previous) * 100
      if (change > 5) return 'up'
      if (change < -5) return 'down'
      return 'neutral'
    }

    const calculateTrendValue = (current, previous) => {
      if (previous === 0) return current
      return Math.abs(((current - previous) / previous) * 100)
    }

    return {
      projects: {
        value: totalProjects,
        active: activeProjects,
        trend: calculateTrend(newProjectsThisWeek, newProjectsLastWeek),
        trendValue: calculateTrendValue(newProjectsThisWeek, newProjectsLastWeek),
        subtitle: `${activeProjects} active`,
        progress: activeProjects > 0 ? (activeProjects / totalProjects) * 100 : 0
      },
      activeTasks: {
        value: activeTasks,
        highPriority: highPriorityTasks,
        trend: calculateTrend(tasksCompletedToday, tasksCompletedYesterday),
        trendValue: calculateTrendValue(tasksCompletedToday, tasksCompletedYesterday),
        subtitle: `${highPriorityTasks} high priority`,
        progress: totalTasks > 0 ? (activeTasks / totalTasks) * 100 : 0
      },
      completedTasks: {
        value: completedTasks,
        completionRate: Math.round(completionRate),
        trend: calculateTrend(tasksCompletedToday, tasksCompletedYesterday),
        trendValue: calculateTrendValue(tasksCompletedToday, tasksCompletedYesterday),
        subtitle: `${Math.round(completionRate)}% completion rate`,
        progress: completionRate
      },
      hoursToday: {
        value: Math.round(trackedHoursToday * 10) / 10,
        activeTimers: activeTimeEntries,
        trend: calculateTrend(trackedHoursToday, trackedHoursYesterday),
        trendValue: calculateTrendValue(trackedHoursToday, trackedHoursYesterday),
        subtitle: `${activeTimeEntries} active timer${activeTimeEntries !== 1 ? 's' : ''}`,
        progress: Math.min((trackedHoursToday / 8) * 100, 100), // Assuming 8h workday target
        target: 8,
        productivity: Math.min(Math.round(productivityScore * 10) / 10, 10)
      }
    }
  }, [projects, tasks, timeEntries, trackedHoursToday])

  // Render trend indicator
  const TrendIndicator = ({ trend, value, className = "" }) => {
    if (trend === 'neutral') return null
    
    const Icon = trend === 'up' ? FiTrendingUp : FiTrendingDown
    const colorClass = trend === 'up' ? 'text-green-600' : 'text-red-600'
    
    return (
      <div className={cn("flex items-center gap-1 text-xs", colorClass, className)}>
        <Icon className="h-3 w-3" />
        <span>{Math.round(value)}%</span>
      </div>
    )
  }

  // Individual stat card component
  const StatCard = ({ 
    icon, 
    title, 
    value, 
    subtitle, 
    bgColor, 
    textColor,
    trend,
    trendValue,
    progress,
    target,
    productivity
  }) => (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-0">
        <div className="flex h-full">
          {/* Icon section with enhanced design */}
          <div className={cn(
            "flex items-center justify-center p-4 rounded-r-xl relative overflow-hidden",
            bgColor, 
            textColor
          )}>
            <div className="relative z-10">
              <div className="text-xl">{icon}</div>
            </div>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            </div>
          </div>
          
          {/* Content section */}
          <div className="flex-1 p-4 space-y-2">
            {/* Header with trend */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </div>
              <TrendIndicator trend={trend} value={trendValue} />
            </div>
            
            {/* Main value */}
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {value}
              </div>
              {target && (
                <div className="text-sm text-muted-foreground">
                  / {target}h
                </div>
              )}
            </div>
            
            {/* Subtitle */}
            <div className="text-xs text-muted-foreground">
              {subtitle}
            </div>
            
            {/* Progress bar for applicable metrics */}
            {progress !== undefined && progress > 0 && (
              <div className="space-y-1">
                <Progress 
                  value={progress} 
                  className="h-1.5"
                />
                {productivity !== undefined && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(progress)}% progress</span>
                    <div className="flex items-center gap-1">
                      <FiTarget className="h-3 w-3" />
                      <span>Score: {productivity}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={<FiFolder />}
        title="Projects"
        value={statsWithTrends.projects.value}
        subtitle={statsWithTrends.projects.subtitle}
        bgColor="bg-blue-50/80"
        textColor="text-blue-600"
        trend={statsWithTrends.projects.trend}
        trendValue={statsWithTrends.projects.trendValue}
        progress={statsWithTrends.projects.progress}
      />
      
      <StatCard
        icon={<FiActivity />}
        title="Active Tasks"
        value={statsWithTrends.activeTasks.value}
        subtitle={statsWithTrends.activeTasks.subtitle}
        bgColor="bg-purple-50/80"
        textColor="text-purple-600"
        trend={statsWithTrends.activeTasks.trend}
        trendValue={statsWithTrends.activeTasks.trendValue}
        progress={statsWithTrends.activeTasks.progress}
      />
      
      <StatCard
        icon={<FiCheckCircle />}
        title="Completed"
        value={statsWithTrends.completedTasks.value}
        subtitle={statsWithTrends.completedTasks.subtitle}
        bgColor="bg-green-50/80"
        textColor="text-green-600"
        trend={statsWithTrends.completedTasks.trend}
        trendValue={statsWithTrends.completedTasks.trendValue}
        progress={statsWithTrends.completedTasks.progress}
      />
      
      <StatCard
        icon={<FiClock />}
        title="Hours Today"
        value={statsWithTrends.hoursToday.value}
        subtitle={statsWithTrends.hoursToday.subtitle}
        bgColor="bg-amber-50/80"
        textColor="text-amber-600"
        trend={statsWithTrends.hoursToday.trend}
        trendValue={statsWithTrends.hoursToday.trendValue}
        progress={statsWithTrends.hoursToday.progress}
        target={statsWithTrends.hoursToday.target}
        productivity={statsWithTrends.hoursToday.productivity}
      />
    </div>
  )
}

export default EnhancedStatsCards