import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiChevronLeft, FiEdit2, FiTrash2, FiPlus, FiClock, FiCalendar, FiCheckCircle } from 'react-icons/fi'
import { format } from 'date-fns'

// Components
import TaskItem from '../components/tasks/TaskItem'

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, tasks, loading, deleteProject } = useProjects()
  const [project, setProject] = useState(null)
  const [projectTasks, setProjectTasks] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalHours: 0
  })
  
  useEffect(() => {
    if (!loading) {
      const foundProject = projects.find(p => p.id === id) || {
        id: 'demo1',
        name: 'Website Redesign',
        description: 'Complete overhaul of the company website with modern design and improved user experience.',
        client: 'Acme Corporation',
        color: '#0ea5e9',
        startDate: '2025-03-01',
        dueDate: '2025-04-15',
        status: 'in-progress',
        totalHours: 45
      }
      
      setProject(foundProject)
      
      // Get tasks for this project
      const filteredTasks = tasks.filter(task => task.projectId === id) || [
        {
          id: 'task1',
          projectId: 'demo1',
          title: 'Design homepage mockup',
          description: 'Create wireframes and visual design for the homepage',
          status: 'completed',
          priority: 'high',
          dueDate: '2025-03-10',
          estimatedHours: 8
        },
        {
          id: 'task2',
          projectId: 'demo1',
          title: 'Implement responsive navigation',
          description: 'Create mobile-friendly navigation menu',
          status: 'in-progress',
          priority: 'medium',
          dueDate: '2025-03-15',
          estimatedHours: 6
        },
        {
          id: 'task3',
          projectId: 'demo1',
          title: 'Optimize images',
          description: 'Compress and optimize all website images',
          status: 'not-started',
          priority: 'low',
          dueDate: '2025-03-20',
          estimatedHours: 4
        }
      ]
      
      setProjectTasks(filteredTasks)
      
      // Calculate stats
      const completed = filteredTasks.filter(task => task.status === 'completed').length
      const inProgress = filteredTasks.filter(task => task.status === 'in-progress').length
      const totalHours = filteredTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)
      
      setStats({
        totalTasks: filteredTasks.length,
        completedTasks: completed,
        inProgressTasks: inProgress,
        totalHours
      })
    }
  }, [id, projects, tasks, loading])
  
  const handleDeleteProject = async () => {
    if (id !== 'demo1') {
      const result = await deleteProject(id)
      if (result.success) {
        navigate('/projects')
      }
    } else {
      // For demo purposes
      setShowDeleteConfirm(false)
      navigate('/projects')
    }
  }
  
  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading project details...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/projects" className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-900">
            <FiChevronLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Link>
          <h1 className="text-2xl font-semibold text-secondary-900 mt-1">{project.name}</h1>
          <div className="flex items-center mt-1">
            <span className="text-sm text-secondary-600">{project.client}</span>
            <span className="mx-2 text-secondary-300">•</span>
            <span 
              className="px-2 py-0.5 text-xs rounded-full"
              style={{ 
                backgroundColor: `${project.color || '#0ea5e9'}20`,
                color: project.color || '#0ea5e9'
              }}
            >
              {project.status === 'completed' ? 'Completed' : project.status === 'in-progress' ? 'In Progress' : 'Not Started'}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button className="btn btn-secondary flex items-center">
            <FiEdit2 className="mr-1.5 h-4 w-4" />
            Edit
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center"
          >
            <FiTrash2 className="mr-1.5 h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
      
      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card">
          <h2 className="text-lg font-medium text-secondary-900 mb-2">Description</h2>
          <p className="text-secondary-700">
            {project.description || 'No description provided.'}
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div>
              <h3 className="text-xs font-medium text-secondary-500 uppercase">Start Date</h3>
              <div className="flex items-center mt-1">
                <FiCalendar className="h-4 w-4 text-secondary-400 mr-1.5" />
                <span className="text-sm text-secondary-900">
                  {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-medium text-secondary-500 uppercase">Due Date</h3>
              <div className="flex items-center mt-1">
                <FiCalendar className="h-4 w-4 text-secondary-400 mr-1.5" />
                <span className="text-sm text-secondary-900">
                  {project.dueDate ? format(new Date(project.dueDate), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-medium text-secondary-500 uppercase">Estimated Hours</h3>
              <div className="flex items-center mt-1">
                <FiClock className="h-4 w-4 text-secondary-400 mr-1.5" />
                <span className="text-sm text-secondary-900">{stats.totalHours} hours</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-medium text-secondary-500 uppercase">Completion</h3>
              <div className="flex items-center mt-1">
                <FiCheckCircle className="h-4 w-4 text-secondary-400 mr-1.5" />
                <span className="text-sm text-secondary-900">
                  {stats.totalTasks > 0 
                    ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` 
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-medium text-secondary-900 mb-4">Progress</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-secondary-700">Overall Progress</span>
                <span className="font-medium text-secondary-900">
                  {stats.totalTasks > 0 
                    ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` 
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-secondary-100 rounded-full h-2">
                <div 
                  className="h-2 rounded-full" 
                  style={{ 
                    width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%`,
                    backgroundColor: project.color || '#0ea5e9'
                  }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-secondary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-secondary-900">{stats.completedTasks}</p>
                <p className="text-xs text-secondary-500 mt-1">Completed</p>
              </div>
              
              <div className="bg-secondary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-secondary-900">{stats.inProgressTasks}</p>
                <p className="text-xs text-secondary-500 mt-1">In Progress</p>
              </div>
              
              <div className="bg-secondary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-secondary-900">
                  {stats.totalTasks - stats.completedTasks - stats.inProgressTasks}
                </p>
                <p className="text-xs text-secondary-500 mt-1">Not Started</p>
              </div>
              
              <div className="bg-secondary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-secondary-900">{stats.totalTasks}</p>
                <p className="text-xs text-secondary-500 mt-1">Total Tasks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-secondary-900">Tasks</h2>
          <button className="btn btn-primary flex items-center">
            <FiPlus className="mr-1.5 h-4 w-4" />
            Add Task
          </button>
        </div>
        
        {projectTasks.length > 0 ? (
          <div className="divide-y divide-secondary-100">
            {projectTasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-secondary-50 rounded-lg">
            <p className="text-secondary-600 mb-3">No tasks yet</p>
            <button className="btn btn-primary inline-flex items-center">
              <FiPlus className="mr-1.5 h-4 w-4" />
              Create Task
            </button>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Delete Project</h3>
            <p className="text-secondary-600 mb-4">
              Are you sure you want to delete this project? This action cannot be undone and all associated tasks and time entries will be deleted.
            </p>
            <div className="flex space-x-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteProject}
                className="btn bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
