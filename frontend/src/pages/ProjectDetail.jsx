import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiChevronLeft, FiEdit2, FiTrash2, FiPlus, FiClock, FiCalendar, FiCheckCircle, FiX } from 'react-icons/fi'
import { format } from 'date-fns'

// Components
import TaskItem from '../components/tasks/TaskItem'

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, tasks, loading, updateProject, deleteProject, createTask } = useProjects()
  const [project, setProject] = useState(null)
  const [projectTasks, setProjectTasks] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [editableProject, setEditableProject] = useState(null)
  const [editFormLoading, setEditFormLoading] = useState(false)
  const [editFormErrors, setEditFormErrors] = useState({})
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'not-started',
    priority: 'medium',
    dueDate: '',
    estimatedHours: 0
  })
  const [taskFormLoading, setTaskFormLoading] = useState(false)
  const [taskFormErrors, setTaskFormErrors] = useState({})
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalHours: 0
  })
  
  useEffect(() => {
    if (!loading) {
      const foundProject = projects.find(p => p.id === id)
      setProject(foundProject)
      if (foundProject) {
        setEditableProject({ ...foundProject }) // Set editable copy
        
        // Get tasks for this project
        const filteredTasks = tasks.filter(task => task.projectId === id)
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
      } else {
        // Project not found, reset tasks and stats
        setProjectTasks([])
        setStats({
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          totalHours: 0
        })
      }
    }
  }, [id, projects, tasks, loading])
  
  const handleDeleteProject = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    
    try {
      const result = await deleteProject(id);
      if (result.success) {
        navigate('/projects');
      } else {
        setDeleteError(result.message || 'Failed to delete project');
      }
    } catch (err) {
      setDeleteError(err.message || 'An unexpected error occurred');
    } finally {
      setDeleteLoading(false);
    }
  }
  
  const handleOpenEditModal = () => {
    setEditableProject({ ...project }) // Ensure we edit a copy
    setShowEditProjectModal(true)
  }

  const handleUpdateProject = async (e) => {
    e.preventDefault()
    if (!editableProject) return
    
    // Reset previous errors
    setEditFormErrors({});
    
    // Validate form
    const errors = {};
    if (!editableProject.name.trim()) {
      errors.name = 'Project name is required';
    } else if (editableProject.name.length > 100) {
      errors.name = 'Project name must be less than 100 characters';
    }
    
    // Validate dates if provided
    if (editableProject.startDate && editableProject.dueDate) {
      const start = new Date(editableProject.startDate);
      const due = new Date(editableProject.dueDate);
      if (due < start) {
        errors.dueDate = 'Due date cannot be before start date';
      }
    }
    
    // If there are validation errors, show them and stop submission
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }
    
    // Submit form if validation passes
    setEditFormLoading(true);
    try {
      const result = await updateProject(id, editableProject);
      if (result.success) {
        setProject(result.data); // Use data returned from context API call
        setShowEditProjectModal(false);
        setEditFormErrors({});
      } else {
        // Handle API error
        setEditFormErrors({ api: result.message || 'Failed to update project' });
      }
    } catch (err) {
      setEditFormErrors({ api: err.message || 'An unexpected error occurred' });
    } finally {
      setEditFormLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  // Project Not Found state
  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-secondary-800 mb-2">Project Not Found</h2>
        <p className="text-secondary-600 mb-4">The project you are looking for does not exist.</p>
        <Link to="/projects" className="btn btn-primary">
          Go Back to Projects
        </Link>
      </div>
    );
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
          <button 
            onClick={handleOpenEditModal}
            className="btn btn-secondary flex items-center"
          >
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
          <button 
            onClick={() => setShowAddTaskModal(true)}
            className="btn btn-primary flex items-center"
          >
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
            <button 
              onClick={() => setShowAddTaskModal(true)}
              className="btn btn-primary inline-flex items-center"
            >
              <FiPlus className="mr-1.5 h-4 w-4" />
              Create Task
            </button>
          </div>
        )}
      </div>
      
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-secondary-100">
              <h3 className="text-lg font-medium text-secondary-900">Add New Task</h3>
              <button 
                onClick={() => setShowAddTaskModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <form onSubmit={async (e) => {
                e.preventDefault()
                
                // Reset previous errors
                setTaskFormErrors({});
                
                // Validate form
                const errors = {};
                if (!newTask.title.trim()) {
                  errors.title = 'Task title is required';
                } else if (newTask.title.length > 100) {
                  errors.title = 'Task title must be less than 100 characters';
                }
                
                // Validate estimated hours
                if (newTask.estimatedHours < 0) {
                  errors.estimatedHours = 'Estimated hours cannot be negative';
                } else if (newTask.estimatedHours > 1000) {
                  errors.estimatedHours = 'Estimated hours must be less than 1000';
                }
                
                // Validate due date if provided
                if (newTask.dueDate && project.dueDate) {
                  const taskDue = new Date(newTask.dueDate);
                  const projectDue = new Date(project.dueDate);
                  if (taskDue > projectDue) {
                    errors.dueDate = 'Task due date cannot be after project due date';
                  }
                }
                
                // If there are validation errors, show them and stop submission
                if (Object.keys(errors).length > 0) {
                  setTaskFormErrors(errors);
                  return;
                }
                
                // Submit form if validation passes
                setTaskFormLoading(true);
                try {
                  const result = await createTask({
                    ...newTask,
                    projectId: id
                  });
                  
                  if (result.success) {
                    setShowAddTaskModal(false);
                    setNewTask({
                      title: '',
                      description: '',
                      status: 'not-started',
                      priority: 'medium',
                      dueDate: '',
                      estimatedHours: 0
                    });
                    setTaskFormErrors({});
                  } else {
                    // Handle API error
                    setTaskFormErrors({ api: result.message || 'Failed to create task' });
                  }
                } catch (err) {
                  setTaskFormErrors({ api: err.message || 'An unexpected error occurred' });
                } finally {
                  setTaskFormLoading(false);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={newTask.title}
                      onChange={(e) => {
                        setNewTask({...newTask, title: e.target.value});
                        // Clear error when user starts typing
                        if (taskFormErrors.title) {
                          setTaskFormErrors({...taskFormErrors, title: null});
                        }
                      }}
                      className={`input w-full ${taskFormErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      required
                      disabled={taskFormLoading}
                      placeholder="Enter task title"
                      maxLength={100}
                    />
                    {taskFormErrors.title && (
                      <p className="mt-1 text-sm text-red-600">{taskFormErrors.title}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      className="input w-full h-24"
                      disabled={taskFormLoading}
                      placeholder="Describe the task (optional)"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-secondary-500 text-right">
                      {newTask.description.length}/500
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-secondary-700 mb-1">
                        Status
                      </label>
                      <select
                        id="status"
                        value={newTask.status}
                        onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                        className="input w-full"
                      >
                        <option value="not-started">Not Started</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-secondary-700 mb-1">
                        Priority
                      </label>
                      <select
                        id="priority"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                        className="input w-full"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dueDate" className="block text-sm font-medium text-secondary-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="dueDate"
                        value={newTask.dueDate}
                        onChange={(e) => {
                          setNewTask({...newTask, dueDate: e.target.value});
                          // Clear error when user changes date
                          if (taskFormErrors.dueDate) {
                            setTaskFormErrors({...taskFormErrors, dueDate: null});
                          }
                        }}
                        className={`input w-full ${taskFormErrors.dueDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={taskFormLoading}
                        min={project.startDate || new Date().toISOString().split('T')[0]}
                        max={project.dueDate || ''}
                      />
                      {taskFormErrors.dueDate && (
                        <p className="mt-1 text-sm text-red-600">{taskFormErrors.dueDate}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="estimatedHours" className="block text-sm font-medium text-secondary-700 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        id="estimatedHours"
                        min="0"
                        step="0.5"
                        value={newTask.estimatedHours}
                        onChange={(e) => {
                          setNewTask({...newTask, estimatedHours: parseFloat(e.target.value) || 0});
                          // Clear error when user changes hours
                          if (taskFormErrors.estimatedHours) {
                            setTaskFormErrors({...taskFormErrors, estimatedHours: null});
                          }
                        }}
                        className={`input w-full ${taskFormErrors.estimatedHours ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={taskFormLoading}
                        max="1000"
                      />
                      {taskFormErrors.estimatedHours && (
                        <p className="mt-1 text-sm text-red-600">{taskFormErrors.estimatedHours}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Display API error if any */}
                {taskFormErrors.api && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <p>{taskFormErrors.api}</p>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTaskModal(false);
                      setTaskFormErrors({});
                    }}
                    className="btn btn-secondary"
                    disabled={taskFormLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center justify-center min-w-[120px]"
                    disabled={taskFormLoading}
                  >
                    {taskFormLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      'Add Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Project Modal */}
      {showEditProjectModal && editableProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-secondary-100">
              <h3 className="text-lg font-medium text-secondary-900">Edit Project</h3>
              <button 
                onClick={() => setShowEditProjectModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleUpdateProject}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-secondary-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="edit-name"
                      value={editableProject.name}
                      onChange={(e) => {
                        setEditableProject({...editableProject, name: e.target.value});
                        // Clear error when user starts typing
                        if (editFormErrors.name) {
                          setEditFormErrors({...editFormErrors, name: null});
                        }
                      }}
                      className={`input w-full ${editFormErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      required
                      disabled={editFormLoading}
                      placeholder="Enter project name"
                      maxLength={100}
                    />
                    {editFormErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{editFormErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium text-secondary-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="edit-description"
                      value={editableProject.description || ''}
                      onChange={(e) => setEditableProject({...editableProject, description: e.target.value})}
                      className="input w-full h-24"
                      disabled={editFormLoading}
                      placeholder="Describe the project (optional)"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-secondary-500 text-right">
                      {(editableProject.description || '').length}/500
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="edit-client" className="block text-sm font-medium text-secondary-700 mb-1">
                      Client
                    </label>
                    <input
                      type="text"
                      id="edit-client"
                      value={editableProject.client || ''}
                      onChange={(e) => setEditableProject({...editableProject, client: e.target.value})}
                      className="input w-full"
                      disabled={editFormLoading}
                      placeholder="Client name (optional)"
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-color" className="block text-sm font-medium text-secondary-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      id="edit-color"
                      value={editableProject.color || '#0ea5e9'}
                      onChange={(e) => setEditableProject({...editableProject, color: e.target.value})}
                      className="h-10 w-full rounded-md border border-secondary-200 p-1"
                      disabled={editFormLoading}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-status" className="block text-sm font-medium text-secondary-700 mb-1">
                      Status
                    </label>
                    <select
                      id="edit-status"
                      value={editableProject.status || 'not-started'}
                      onChange={(e) => setEditableProject({...editableProject, status: e.target.value})}
                      className="input w-full"
                      disabled={editFormLoading}
                    >
                      <option value="not-started">Not Started</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-startDate" className="block text-sm font-medium text-secondary-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="edit-startDate"
                        value={editableProject.startDate || ''}
                        onChange={(e) => {
                          setEditableProject({...editableProject, startDate: e.target.value});
                          // Clear date errors when user changes dates
                          if (editFormErrors.dueDate) {
                            setEditFormErrors({...editFormErrors, dueDate: null});
                          }
                        }}
                        className="input w-full"
                        disabled={editFormLoading}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-dueDate" className="block text-sm font-medium text-secondary-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="edit-dueDate"
                        value={editableProject.dueDate || ''}
                        onChange={(e) => {
                          setEditableProject({...editableProject, dueDate: e.target.value});
                          // Clear date errors when user changes dates
                          if (editFormErrors.dueDate) {
                            setEditFormErrors({...editFormErrors, dueDate: null});
                          }
                        }}
                        className={`input w-full ${editFormErrors.dueDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={editFormLoading}
                        min={editableProject.startDate || ''}
                      />
                      {editFormErrors.dueDate && (
                        <p className="mt-1 text-sm text-red-600">{editFormErrors.dueDate}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Display API error if any */}
                {editFormErrors.api && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <p>{editFormErrors.api}</p>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProjectModal(false);
                      setEditFormErrors({});
                    }}
                    className="btn btn-secondary"
                    disabled={editFormLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center justify-center min-w-[120px]"
                    disabled={editFormLoading}
                  >
                    {editFormLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Delete Project</h3>
            <p className="text-secondary-600 mb-4">
              Are you sure you want to delete this project? This action cannot be undone and all associated tasks and time entries will be deleted.
            </p>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <p>{deleteError}</p>
              </div>
            )}
            
            <div className="flex space-x-3 justify-end">
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                className="btn btn-secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteProject}
                className="btn bg-red-500 text-white hover:bg-red-600 flex items-center justify-center min-w-[100px]"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
