import { Link } from 'react-router-dom'
import { FiClock, FiCheckCircle } from 'react-icons/fi'

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
      className="card card-hover border border-secondary-100 flex flex-col"
    >
      <div className="flex items-center mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ 
            backgroundColor: project.color ? `${project.color}20` : '#e0f2fe',
            color: project.color || '#0ea5e9'
          }}
        >
          {project.icon || '📋'}
        </div>
        <div className="ml-3">
          <h3 className="font-medium text-secondary-900 truncate">{project.name}</h3>
          <p className="text-xs text-secondary-500">{project.client || 'Personal Project'}</p>
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="flex justify-between text-xs text-secondary-500 mb-1">
          <span>Progress</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-secondary-100 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full"
            style={{ 
              width: `${completionPercentage}%`,
              backgroundColor: project.color || '#0ea5e9'
            }}
          ></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-secondary-100 text-xs">
        <div className="flex items-center text-secondary-500">
          <FiClock className="mr-1" />
          <span>{project.totalHours || 0} hrs</span>
        </div>
        <div className="flex items-center text-secondary-500">
          <FiCheckCircle className="mr-1" />
          <span>{completedTasks}/{totalTasks} tasks</span>
        </div>
      </div>
    </Link>
  )
}

export default ProjectCard
