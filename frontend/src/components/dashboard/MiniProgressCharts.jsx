import { useMemo } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { cn } from '../../lib/utils'
import { 
  FiTrendingUp, 
  FiTarget, 
  FiClock, 
  FiActivity,
  FiCheckCircle
} from 'react-icons/fi'
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  format,
  parseISO,
  isWithinInterval,
  eachDayOfInterval
} from 'date-fns'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler
)

/**
 * Mini Progress Charts Component for dashboard visualization
 * 
 * @param {Object} props
 * @param {Array} props.projects - Array of projects
 * @param {Array} props.tasks - Array of tasks  
 * @param {Array} props.timeEntries - Array of time entries
 * @returns {JSX.Element}
 */
const MiniProgressCharts = ({ projects = [], tasks = [], timeEntries = [] }) => {
  
  // Calculate daily activity data for the past 7 days
  const dailyActivityData = useMemo(() => {
    const now = new Date()
    const last7Days = eachDayOfInterval({
      start: subDays(now, 6),
      end: now
    })

    const dailyData = last7Days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)

      // Tasks completed on this day
      const tasksCompleted = tasks.filter(task => {
        if (task.status !== 'completed' || !task.updatedAt) return false
        const updatedDate = parseISO(task.updatedAt)
        return isWithinInterval(updatedDate, { start: dayStart, end: dayEnd })
      }).length

      // Hours tracked on this day
      const hoursTracked = timeEntries
        .filter(entry => {
          if (!entry.startTime || !entry.endTime) return false
          const entryStart = new Date(entry.startTime)
          return isWithinInterval(entryStart, { start: dayStart, end: dayEnd })
        })
        .reduce((total, entry) => {
          const start = new Date(entry.startTime)
          const end = new Date(entry.endTime)
          const durationHours = (end - start) / 3600000
          return total + (durationHours > 0 && durationHours < 12 ? durationHours : 0)
        }, 0)

      return {
        date: day,
        label: format(day, 'MMM d'),
        shortLabel: format(day, 'dd'),
        tasksCompleted,
        hoursTracked: Math.round(hoursTracked * 10) / 10
      }
    })

    return dailyData
  }, [tasks, timeEntries])

  // Project completion distribution
  const projectCompletionData = useMemo(() => {
    if (!projects.length || !tasks.length) return null

    const projectStats = projects.map(project => {
      const projectTasks = tasks.filter(task => task.projectId === project.id)
      const completedTasks = projectTasks.filter(task => task.status === 'completed').length
      const totalTasks = projectTasks.length
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      return {
        name: project.name,
        completion: Math.round(completionPercentage),
        color: project.color || '#0ea5e9',
        totalTasks,
        completedTasks
      }
    }).filter(p => p.totalTasks > 0) // Only include projects with tasks

    return projectStats.slice(0, 5) // Top 5 projects
  }, [projects, tasks])

  // Task status distribution
  const taskStatusData = useMemo(() => {
    const statusCounts = {
      'not-started': 0,
      'in-progress': 0,
      'completed': 0
    }

    tasks.forEach(task => {
      if (statusCounts.hasOwnProperty(task.status)) {
        statusCounts[task.status]++
      }
    })

    return {
      labels: ['Not Started', 'In Progress', 'Completed'],
      data: [statusCounts['not-started'], statusCounts['in-progress'], statusCounts['completed']],
      colors: ['#f59e0b', '#3b82f6', '#10b981']
    }
  }, [tasks])

  // Chart configurations
  const dailyActivityChartData = {
    labels: dailyActivityData.map(d => d.shortLabel),
    datasets: [
      {
        label: 'Hours Tracked',
        data: dailyActivityData.map(d => d.hoursTracked),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }
    ]
  }

  const dailyActivityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex
            return dailyActivityData[index].label
          },
          label: (context) => {
            const index = context.dataIndex
            const data = dailyActivityData[index]
            return [
              `Hours: ${data.hoursTracked}h`,
              `Tasks: ${data.tasksCompleted}`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false,
        beginAtZero: true
      }
    },
    elements: {
      point: {
        hoverRadius: 6
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }

  const taskStatusChartData = {
    labels: taskStatusData.labels,
    datasets: [{
      data: taskStatusData.data,
      backgroundColor: taskStatusData.colors,
      borderWidth: 0,
      cutout: '75%'
    }]
  }

  const taskStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const total = taskStatusData.data.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0
            return `${context.label}: ${context.raw} (${percentage}%)`
          }
        }
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Daily Activity Trend */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground">
              Activity Trend
            </CardTitle>
            <FiTrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Hours tracked (7 days)</p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="h-24 w-full">
            <Line data={dailyActivityChartData} options={dailyActivityChartOptions} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {Math.round(dailyActivityData.reduce((sum, d) => sum + d.hoursTracked, 0) * 10) / 10}h this week
            </span>
            <span>
              {dailyActivityData.reduce((sum, d) => sum + d.tasksCompleted, 0)} tasks completed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Task Distribution */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground">
              Task Distribution
            </CardTitle>
            <FiActivity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Current task status</p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="relative h-24 w-24 mx-auto">
            <Doughnut data={taskStatusChartData} options={taskStatusChartOptions} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {tasks.length}
                </p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {taskStatusData.labels.map((label, index) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: taskStatusData.colors[index] }}
                  />
                  <span className="text-muted-foreground">{label}</span>
                </div>
                <span className="font-medium text-foreground">
                  {taskStatusData.data[index]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Progress */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground">
              Project Progress
            </CardTitle>
            <FiTarget className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Top project completion</p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-3">
            {projectCompletionData && projectCompletionData.length > 0 ? (
              projectCompletionData.slice(0, 4).map((project, index) => (
                <div key={project.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-foreground font-medium truncate">
                        {project.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground flex-shrink-0 ml-2">
                      {project.completion}%
                    </span>
                  </div>
                  <Progress 
                    value={project.completion} 
                    className="h-1"
                    style={{
                      background: `${project.color}20`
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No projects with tasks yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MiniProgressCharts