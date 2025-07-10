import { format, parseISO } from 'date-fns'
import { FiClock, FiPlay, FiPause, FiSquare, FiCoffee } from 'react-icons/fi'
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { formatTime } from '@/lib/timeUtils'
import { useTimeTracker } from '../../hooks/useTimeTracker'

const FocusModeView = ({ 
  myTasksFlat,
  timeEntries,
  startTimeTracking,
  pauseTimeTracking,
  resumeTimeTracking,
  stopTimeTracking
}) => {
  const {
    activeTimeEntries,
    elapsedTimes,
    hasActiveTimer,
    getActiveTimer,
    getElapsedTime,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking
  } = useTimeTracker({
    timeEntries,
    startTimeTracking,
    stopTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking
  })

  const EmptyState = ({ icon, title, description }) => (
    <div className="text-center py-6">
      <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-secondary-50 text-secondary-400 border border-secondary-100/50">
        {icon}
      </div>
      <h3 className="mt-3 font-medium text-secondary-800 text-sm">{title}</h3>
      <p className="mt-1 text-secondary-500/80 text-xs">{description}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Focus Mode Header */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-8 border border-secondary-100/80 shadow-sm">
        <div className="flex items-center space-x-4 mb-4">
          <h2 className="text-xl font-medium text-secondary-900">Focus Mode</h2>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <p className="text-sm text-secondary-600 text-center">
          Distraction-free environment to focus on your current tasks
        </p>
      </div>

      {/* Active Tasks with Time Tracking */}
      <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-secondary-900">Current Tasks</CardTitle>
            <div className="text-xs text-secondary-500">
              {myTasksFlat.length} active tasks
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {myTasksFlat.length > 0 ? (
            <div className="space-y-4">
              {myTasksFlat.map(task => (
                <div key={task.id} className="p-4 bg-white rounded-lg border border-secondary-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-secondary-900">{task.title}</h3>
                      <div className="flex items-center mt-1 space-x-2 text-xs text-secondary-500">
                        {task.dueDate && (
                          <span className="flex items-center">
                            <FiClock className="mr-1 h-3 w-3" />
                            {format(parseISO(task.dueDate), 'MMM d')}
                          </span>
                        )}
                        {task.priority === 'high' && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                            High Priority
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {hasActiveTimer(task.id) ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const entry = getActiveTimer(task.id)
                              if (entry) {
                                if (entry.isPaused) {
                                  resumeTracking(entry.id)
                                } else {
                                  pauseTracking(entry.id)
                                }
                              }
                            }}
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            {getActiveTimer(task.id)?.isPaused
                              ? <FiPlay className="h-4 w-4" />
                              : <FiPause className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const entry = getActiveTimer(task.id)
                              if (entry) {
                                stopTracking(entry.id)
                              }
                            }}
                            className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-600"
                          >
                            <FiSquare className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            startTracking(task.id)
                          }}
                          className="h-8 px-3 rounded-full"
                        >
                          <FiPlay className="h-4 w-4 mr-1" />
                          <span className="text-xs">Start</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Show active timer if any */}
                  {hasActiveTimer(task.id) && (
                    <div className="mt-3 text-sm font-mono text-primary-600">
                      {formatTime(getElapsedTime(getActiveTimer(task.id)?.id))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FiCoffee className="h-7 w-7" />}
              title="No active tasks"
              description="You're all caught up!"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FocusModeView