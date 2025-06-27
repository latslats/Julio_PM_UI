import { useMemo } from 'react'
import { 
  FiClock, 
  FiTarget, 
  FiTrendingUp, 
  FiCalendar,
  FiZap,
  FiSun,
  FiMoon,
  FiCoffee,
  FiAward,
  FiAlertCircle
} from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { cn } from '../../lib/utils'
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  getHours,
  format,
  parseISO,
  isWithinInterval,
  eachHourOfInterval,
  startOfHour,
  endOfHour
} from 'date-fns'

/**
 * Productivity Insights Component with smart analytics and recommendations
 * 
 * @param {Object} props
 * @param {Array} props.tasks - Array of tasks  
 * @param {Array} props.timeEntries - Array of time entries
 * @returns {JSX.Element}
 */
const ProductivityInsights = ({ tasks = [], timeEntries = [] }) => {
  
  // Calculate comprehensive productivity insights
  const insights = useMemo(() => {
    const now = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, i))
    
    // Analyze hourly productivity patterns
    const hourlyProductivity = Array.from({ length: 24 }, (_, hour) => {
      let totalTasks = 0
      let totalHours = 0
      
      last7Days.forEach(day => {
        const hourStart = startOfHour(new Date(day.setHours(hour, 0, 0, 0)))
        const hourEnd = endOfHour(hourStart)
        
        // Tasks completed in this hour
        const tasksInHour = tasks.filter(task => {
          if (task.status !== 'completed' || !task.updatedAt) return false
          const updatedDate = parseISO(task.updatedAt)
          return isWithinInterval(updatedDate, { start: hourStart, end: hourEnd })
        }).length
        
        // Time tracked in this hour
        const hoursInHour = timeEntries
          .filter(entry => {
            if (!entry.startTime || !entry.endTime) return false
            const entryStart = new Date(entry.startTime)
            const entryEnd = new Date(entry.endTime)
            return (
              isWithinInterval(entryStart, { start: hourStart, end: hourEnd }) ||
              isWithinInterval(entryEnd, { start: hourStart, end: hourEnd }) ||
              (entryStart <= hourStart && entryEnd >= hourEnd)
            )
          })
          .reduce((total, entry) => {
            const start = Math.max(new Date(entry.startTime), hourStart)
            const end = Math.min(new Date(entry.endTime), hourEnd)
            const duration = (end - start) / 3600000
            return total + Math.max(0, duration)
          }, 0)
        
        totalTasks += tasksInHour
        totalHours += hoursInHour
      })
      
      return {
        hour,
        tasks: totalTasks,
        hours: totalHours,
        efficiency: totalHours > 0 ? totalTasks / totalHours : 0
      }
    })
    
    // Find peak productivity hours
    const peakHours = hourlyProductivity
      .filter(h => h.efficiency > 0)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3)
    
    // Daily performance metrics
    const dailyMetrics = last7Days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      const tasksCompleted = tasks.filter(task => {
        if (task.status !== 'completed' || !task.updatedAt) return false
        const updatedDate = parseISO(task.updatedAt)
        return isWithinInterval(updatedDate, { start: dayStart, end: dayEnd })
      }).length
      
      const hoursTracked = timeEntries
        .filter(entry => {
          if (!entry.startTime || !entry.endTime) return false
          const entryStart = new Date(entry.startTime)
          return isWithinInterval(entryStart, { start: dayStart, end: dayEnd })
        })
        .reduce((total, entry) => {
          const start = new Date(entry.startTime)
          const end = new Date(entry.endTime)
          const duration = (end - start) / 3600000
          return total + (duration > 0 && duration < 12 ? duration : 0)
        }, 0)
      
      return {
        date: day,
        tasks: tasksCompleted,
        hours: hoursTracked,
        efficiency: hoursTracked > 0 ? tasksCompleted / hoursTracked : 0
      }
    })
    
    // Calculate averages and trends
    const avgTasksPerDay = dailyMetrics.reduce((sum, d) => sum + d.tasks, 0) / 7
    const avgHoursPerDay = dailyMetrics.reduce((sum, d) => sum + d.hours, 0) / 7
    const avgEfficiency = dailyMetrics
      .filter(d => d.efficiency > 0)
      .reduce((sum, d) => sum + d.efficiency, 0) / Math.max(1, dailyMetrics.filter(d => d.efficiency > 0).length)
    
    // Today's metrics
    const today = dailyMetrics[0] // First element is today (subDays(now, 0))
    const yesterday = dailyMetrics[1]
    
    // Task prioritization insights
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false
      return parseISO(t.dueDate) < now
    }).length
    
    // Focus time analysis
    const activeSessions = timeEntries.filter(entry => entry.endTime === null).length
    const longestSessionToday = timeEntries
      .filter(entry => {
        if (!entry.startTime) return false
        const entryStart = new Date(entry.startTime)
        return isWithinInterval(entryStart, { start: startOfDay(now), end: endOfDay(now) })
      })
      .reduce((max, entry) => {
        const start = new Date(entry.startTime)
        const end = entry.endTime ? new Date(entry.endTime) : now
        const duration = (end - start) / 3600000
        return Math.max(max, duration)
      }, 0)
    
    // Generate insights and recommendations
    const recommendations = []
    const achievements = []
    
    // Productivity recommendations
    if (peakHours.length > 0) {
      const bestHour = peakHours[0]
      const timeFormat = bestHour.hour === 0 ? '12 AM' : 
                       bestHour.hour < 12 ? `${bestHour.hour} AM` :
                       bestHour.hour === 12 ? '12 PM' : `${bestHour.hour - 12} PM`
      recommendations.push({
        type: 'peak-time',
        icon: <FiSun className="h-4 w-4" />,
        title: 'Peak Performance',
        message: `Your most productive hour is around ${timeFormat}. Schedule important tasks then.`,
        priority: 'high'
      })
    }
    
    if (activeSessions > 2) {
      recommendations.push({
        type: 'focus',
        icon: <FiTarget className="h-4 w-4" />,
        title: 'Too Many Active Timers',
        message: `You have ${activeSessions} active timers. Consider focusing on fewer tasks.`,
        priority: 'medium'
      })
    }
    
    if (overdueTasks > 0) {
      recommendations.push({
        type: 'overdue',
        icon: <FiAlertCircle className="h-4 w-4" />,
        title: 'Overdue Tasks',
        message: `${overdueTasks} task${overdueTasks > 1 ? 's are' : ' is'} overdue. Prioritize these first.`,
        priority: 'high'
      })
    }
    
    if (today.hours > avgHoursPerDay * 1.2) {
      achievements.push({
        type: 'productive-day',
        icon: <FiAward className="h-4 w-4" />,
        title: 'Productive Day!',
        message: `You've tracked ${today.hours.toFixed(1)}h today, above your average.`
      })
    }
    
    if (today.tasks > avgTasksPerDay * 1.5) {
      achievements.push({
        type: 'task-master',
        icon: <FiZap className="h-4 w-4" />,
        title: 'Task Master!',
        message: `${today.tasks} tasks completed today. Great momentum!`
      })
    }
    
    if (longestSessionToday > 2) {
      achievements.push({
        type: 'deep-focus',
        icon: <FiTarget className="h-4 w-4" />,
        title: 'Deep Focus',
        message: `${longestSessionToday.toFixed(1)}h longest session today. Excellent concentration!`
      })
    }
    
    // Velocity calculation (tasks per hour)
    const weeklyVelocity = avgHoursPerDay > 0 ? avgTasksPerDay / avgHoursPerDay : 0
    const velocityTrend = yesterday.efficiency > 0 ? 
      ((today.efficiency - yesterday.efficiency) / yesterday.efficiency) * 100 : 0
    
    return {
      daily: {
        tasksToday: today.tasks,
        hoursToday: today.hours,
        efficiencyToday: today.efficiency,
        avgTasks: avgTasksPerDay,
        avgHours: avgHoursPerDay,
        avgEfficiency
      },
      peak: {
        hours: peakHours,
        bestTime: peakHours[0]?.hour
      },
      focus: {
        activeSessions,
        longestSession: longestSessionToday,
        recommendedBreaks: Math.floor(today.hours / 2)
      },
      velocity: {
        current: weeklyVelocity,
        trend: velocityTrend,
        target: 1.0 // 1 task per hour as baseline
      },
      alerts: {
        highPriority: highPriorityTasks,
        overdue: overdueTasks
      },
      recommendations,
      achievements
    }
  }, [tasks, timeEntries])
  
  // Format time display
  const formatHour = (hour) => {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Velocity
                </p>
                <p className="text-xl font-bold text-foreground">
                  {insights.velocity.current.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">tasks/hour</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FiZap className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <Progress 
                value={Math.min((insights.velocity.current / insights.velocity.target) * 100, 100)} 
                className="h-1.5"
              />
            </div>
            {insights.velocity.trend !== 0 && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs",
                insights.velocity.trend > 0 ? "text-green-600" : "text-red-600"
              )}>
                <FiTrendingUp className={cn(
                  "h-3 w-3",
                  insights.velocity.trend < 0 && "transform rotate-180"
                )} />
                <span>{Math.abs(insights.velocity.trend).toFixed(0)}% vs yesterday</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Focus Score
                </p>
                <p className="text-xl font-bold text-foreground">
                  {Math.min(Math.round((insights.focus.longestSession / 3) * 100), 100)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {insights.focus.longestSession.toFixed(1)}h peak session
                </p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <FiTarget className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <Progress 
                value={Math.min((insights.focus.longestSession / 3) * 100, 100)} 
                className="h-1.5"
              />
            </div>
            {insights.focus.activeSessions > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <FiClock className="h-3 w-3" />
                <span>{insights.focus.activeSessions} active timer{insights.focus.activeSessions !== 1 ? 's' : ''}</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Best Time
                </p>
                <p className="text-xl font-bold text-foreground">
                  {insights.peak.bestTime !== undefined ? formatHour(insights.peak.bestTime) : '--'}
                </p>
                <p className="text-xs text-muted-foreground">peak productivity</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <FiSun className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            {insights.peak.hours.length > 0 && (
              <div className="mt-2 space-y-1">
                {insights.peak.hours.slice(0, 2).map((hour, index) => (
                  <div key={hour.hour} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatHour(hour.hour)}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-12 bg-muted rounded-full h-1">
                        <div 
                          className="h-1 bg-amber-500 rounded-full" 
                          style={{ width: `${(hour.efficiency / insights.peak.hours[0].efficiency) * 100}%` }}
                        />
                      </div>
                      <span className="text-foreground font-medium w-8 text-right">
                        {hour.efficiency.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recommendations and Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <FiTarget className="h-4 w-4" />
                Smart Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.recommendations.map((rec, index) => (
                <div
                  key={rec.type}
                  className={cn(
                    "p-3 rounded-lg border-l-4 bg-muted/30",
                    rec.priority === 'high' ? "border-l-red-500" : "border-l-blue-500"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1 rounded",
                      rec.priority === 'high' ? "text-red-600" : "text-blue-600"
                    )}>
                      {rec.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Achievements */}
        {insights.achievements.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <FiAward className="h-4 w-4" />
                Today's Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.achievements.map((achievement, index) => (
                <div
                  key={achievement.type}
                  className="p-3 rounded-lg bg-green-50/50 border-l-4 border-l-green-500"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-green-600 p-1 rounded">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{achievement.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Fallback when no recommendations or achievements */}
        {insights.recommendations.length === 0 && insights.achievements.length === 0 && (
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <FiCoffee className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">Keep Working!</h3>
                <p className="text-xs text-muted-foreground">
                  Complete more tasks to unlock insights and achievements
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductivityInsights