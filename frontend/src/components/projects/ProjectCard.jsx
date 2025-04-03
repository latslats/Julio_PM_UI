import { Link } from 'react-router-dom'
import { FiClock, FiCheckCircle, FiArrowRight } from 'react-icons/fi'

const ProjectCard = ({ project }) => {
  // Calculate completion percentage
  const totalTasks = project.totalTasks || 0
  const completedTasks = project.completedTasks || 0
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0

  return (
    <Link 
      to={`/projects/${project.id}`}
      className="bg-white rounded-xl p-5 shadow-sm border border-secondary-100 flex flex-col transition-all duration-300 hover:shadow-md hover:border-primary-200 group"
    >
      <div className="flex items-center mb-4">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
          style={{ 
            backgroundColor: project.color ? `${project.color}15` : '#e0f2fe',
            color: project.color || '#0ea5e9'
          }}
        >
          {project.icon || '📋'}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="font-semibold text-secondary-900 truncate">{project.name}</h3>
          <p className="text-xs text-secondary-500">{project.client || 'Personal Project'}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <FiArrowRight className="h-5 w-5 text-primary-500" />
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="flex justify-between text-xs font-medium mb-2">
          <span className="text-secondary-500">Progress</span>
          <span className="text-secondary-900">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-secondary-100 rounded-full h-2 overflow-hidden">
          <div 
            className="h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${completionPercentage}%`,
              backgroundColor: project.color || '#0ea5e9'
            }}
          ></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-secondary-100 text-xs font-medium">
        <div className="flex items-center text-secondary-600">
          <FiClock className="mr-1.5 h-4 w-4 text-secondary-400" />
          <span>{project.totalHours || 0} hrs</span>
        </div>
        <div className="flex items-center text-secondary-600">
          <FiCheckCircle className="mr-1.5 h-4 w-4 text-secondary-400" />
          <span>{completedTasks}/{totalTasks} tasks</span>
        </div>
      </div>
    </Link>
  )
}

export default ProjectCard
