import { FiCoffee } from 'react-icons/fi'
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import TaskCard from '../tasks/TaskCard'
import { useUI } from '../../context/UIContext'

const TasksTabContent = ({ myTasks }) => {
  const { densityMode } = useUI()

  const EmptyState = ({ icon, title, description }) => (
    <div className="text-center py-6">
      <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-secondary-50 text-secondary-400 border border-secondary-100/50">
        {icon}
      </div>
      <h3 className="mt-3 font-medium text-secondary-800 text-sm">{title}</h3>
      <p className="mt-1 text-secondary-500/80 text-xs">{description}</p>
    </div>
  )

  const myTasksFlat = [...myTasks.inProgress, ...myTasks.notStarted]

  return (
    <div className="space-y-6">
      {/* In Progress Tasks Section */}
      {myTasks.inProgress.length > 0 && (
        <Card className="overflow-hidden border-blue-100/80 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <CardTitle className="text-base font-medium text-blue-900">
                  In Progress ({myTasks.inProgress.length})
                </CardTitle>
              </div>
              <div className="flex items-center mt-2 sm:mt-0">
                <div className="text-xs text-blue-600/70">Active work in progress</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="grid gap-3">
              {myTasks.inProgress.map(task => (
                <TaskCard key={task.id} task={task} compact={densityMode === 'compact'} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fresh Tasks Section */}
      {myTasks.notStarted.length > 0 && (
        <Card className="overflow-hidden border-gray-100/80 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <CardTitle className="text-base font-medium text-gray-900">
                  Fresh Tasks ({myTasks.notStarted.length})
                </CardTitle>
              </div>
              <div className="flex items-center mt-2 sm:mt-0">
                <div className="text-xs text-gray-600/70">Ready to start</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="grid gap-3">
              {myTasks.notStarted.map(task => (
                <TaskCard key={task.id} task={task} compact={densityMode === 'compact'} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - When no tasks */}
      {myTasksFlat.length === 0 && (
        <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
          <CardContent className="px-6 py-8">
            <EmptyState
              icon={<FiCoffee className="h-7 w-7" />}
              title="No active tasks"
              description="You're all caught up!"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TasksTabContent