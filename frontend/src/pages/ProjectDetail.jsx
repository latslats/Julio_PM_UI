import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { useWaitingItems } from '../context/WaitingItemContext'
import { FiChevronLeft, FiEdit2, FiTrash2, FiPlus, FiClock, FiCalendar, FiCheckCircle, FiX, FiClipboard, FiCheckSquare, FiPlayCircle, FiWatch, FiList, FiSliders, FiPieChart, FiAlertCircle } from 'react-icons/fi'
import { format } from 'date-fns'
import { 
    Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TaskItem from '../components/tasks/TaskItem' // Using the existing TaskItem component
import WaitingItemCard from '../components/waitingItems/WaitingItemCard'
import WaitingItemForm from '../components/waitingItems/WaitingItemForm'
import { useToast } from "@/hooks/use-toast"; // Import useToast

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate()
  const { projects, tasks, timeEntries, loading, updateProject, deleteProject, createTask } = useProjects()
  const { waitingItems, loading: waitingItemsLoading, fetchWaitingItems } = useWaitingItems()
  const [project, setProject] = useState(null)
  const [projectTasks, setProjectTasks] = useState([])
  const [projectWaitingItems, setProjectWaitingItems] = useState([])
  const [activeView, setActiveView] = useState('tasks')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [showAddWaitingItemModal, setShowAddWaitingItemModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [editableProject, setEditableProject] = useState(null)
  const [editFormErrors, setEditFormErrors] = useState({})
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'not-started',
    priority: 'medium',
    dueDate: '',
    estimatedHours: 0
  })
  const [taskFormErrors, setTaskFormErrors] = useState({})
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalHours: 0
  })
  
  // Toast hook
  const { toast } = useToast();

  // Function to validate task form
  const validateTaskForm = () => {
    const errors = {};
    
    // Validate title
    if (!newTask.title.trim()) {
      errors.title = 'Task title is required';
    } else if (newTask.title.length > 100) {
      errors.title = 'Task title must be less than 100 characters';
    }
    
    // Validate estimated hours if provided
    if (newTask.estimatedHours && (isNaN(newTask.estimatedHours) || Number(newTask.estimatedHours) < 0)) {
      errors.estimatedHours = 'Estimated hours must be a positive number';
    }
    
    // Validate due date if provided
    if (newTask.dueDate) {
      const dueDate = new Date(newTask.dueDate);
      if (isNaN(dueDate.getTime())) {
        errors.dueDate = 'Invalid due date';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  useEffect(() => {
    if (!loading) {
      const foundProject = projects.find(p => p.id === id)
      setProject(foundProject)
      if (foundProject) {
        setEditableProject({ ...foundProject }) 
        
        // Get tasks for this project
        const filteredTasks = tasks.filter(task => task.projectId === id)
        setProjectTasks(filteredTasks)
        
        // Calculate stats
        const completed = filteredTasks.filter(task => task.status === 'completed').length
        const inProgress = filteredTasks.filter(task => task.status === 'in-progress').length
        const totalHours = filteredTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)
        
        // Calculate total tracked hours for this project
        const projectTimeEntries = timeEntries.filter(entry => 
          filteredTasks.some(task => task.id === entry.taskId) && entry.duration
        )
        
        // Debug log to see what's happening with the time entries
        console.log('Project time entries:', {
          projectId: id,
          entries: projectTimeEntries.map(e => ({
            id: e.id,
            taskId: e.taskId,
            duration: e.duration,
            parsedDuration: parseFloat(e.duration || 0)
          }))
        });
        
        const totalTrackedHours = projectTimeEntries.reduce((sum, entry) => {
          // Ensure we're working with numbers by explicitly parsing
          const duration = parseFloat(entry.duration || 0);
          return sum + duration;
        }, 0) / 3600;
        
        setStats({
          totalTasks: filteredTasks.length,
          completedTasks: completed,
          inProgressTasks: inProgress,
          totalHours,
          totalTrackedHours: parseFloat(totalTrackedHours.toFixed(2))
        })
        
        // Fetch waiting items for this project
        fetchWaitingItems();
      } else {
        // Project not found, reset tasks and stats
        setProjectTasks([])
        setStats({
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          totalHours: 0,
          totalTrackedHours: 0
        })
      }
    }
  }, [id, projects, tasks, timeEntries, loading])
  
  // Filter waiting items for this project
  useEffect(() => {
    if (!waitingItemsLoading && waitingItems.length > 0) {
      const filtered = waitingItems.filter(item => item.projectId === id);
      setProjectWaitingItems(filtered);
    } else {
      setProjectWaitingItems([]);
    }
  }, [id, waitingItems, waitingItemsLoading]);

  const handleDeleteProject = async () => {
    setDeleteError(null);
    
    try {
      const result = await deleteProject(id);
      if (result.success) {
        navigate('/projects');
        toast({
          title: "Project Deleted",
          description: `Project "${project.name}" deleted successfully.`,
        });
      } else {
        setDeleteError(result.message || 'Failed to delete project');
        toast({
          variant: "destructive",
          title: "Error Deleting Project",
          description: result.message || 'An unexpected error occurred.'
        });
      }
    } catch (err) {
      setDeleteError(err.message || 'An unexpected error occurred');
      toast({
        variant: "destructive",
        title: "Error Deleting Project",
        description: err.message || 'An unexpected error occurred.'
      });
    }
  }
  
  const handleOpenEditModal = () => {
    setEditableProject({ ...project }) 
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
    try {
      const result = await updateProject(id, editableProject);
      if (result.success) {
        setProject(result.data); 
        setShowEditProjectModal(false);
        setEditFormErrors({});
        toast({
          title: "Project Updated",
          description: `Project "${project.name}" updated successfully.`,
        });
      } else {
        // Handle API error
        setEditFormErrors({ api: result.message || 'Failed to update project' });
        toast({
          variant: "destructive",
          title: "Error Updating Project",
          description: result.message || 'An unexpected error occurred.'
        });
      }
    } catch (err) {
      setEditFormErrors({ api: err.message || 'An unexpected error occurred' });
      toast({
        variant: "destructive",
        title: "Error Updating Project",
        description: err.message || 'An unexpected error occurred.'
      });
    }
  }

  const handleAddWaitingItemClick = () => {
    setShowAddWaitingItemModal(true);
  };
  
  const handleWaitingItemFormClose = () => {
    setShowAddWaitingItemModal(false);
  };
  
  const handleWaitingItemFormSubmit = async () => {
    setShowAddWaitingItemModal(false);
    // The actual submission is handled in the form component
    fetchWaitingItems(); // Refresh waiting items
  };
  
  // Get status class for badge
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get priority class for badge
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
          <Link to="/projects" className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-900 mb-1">
            <FiChevronLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Link>
          <h1 className="text-2xl font-semibold text-secondary-900 mt-1">{project.name}</h1>
          <div className="flex items-center mt-1 space-x-2">
            {project.client && <span className="text-sm text-secondary-600">{project.client}</span>}
            {project.client && <span className="text-secondary-300">•</span>}
            <span 
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{ 
                backgroundColor: `${project.color || '#0ea5e9'}20`,
                color: project.color || '#0ea5e9'
              }}
            >
              {project.status === 'completed' ? 'Completed' : project.status === 'in-progress' ? 'In Progress' : 'Not Started'}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2 self-start sm:self-center">
          <Link to={`/time-entries?projectId=${id}`}>
            <Button 
              variant="outline"
              size="sm"
            >
              <FiList className="mr-1.5 h-4 w-4" />
              View Time Entries
            </Button>
          </Link>
          {/* --- Edit Project Dialog Trigger --- */} 
          <Dialog open={showEditProjectModal} onOpenChange={setShowEditProjectModal}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleOpenEditModal} 
              >
                <FiEdit2 className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            {/* Edit Project Modal Content moved below */} 
          </Dialog>

          {/* --- Delete Project Alert Dialog Trigger --- */} 
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)} 
              >
                <FiTrash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            {/* Delete Project Alert Dialog Content moved below */} 
          </AlertDialog>
        </div>
      </div>
      
      {/* --- Project Info Wrapped in Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Description & Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary-700 mb-6">
               {project.description || 'No description provided.'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
               <div>
                 <h3 className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Start Date</h3>
                 <div className="flex items-center mt-1">
                   <FiCalendar className="h-4 w-4 text-secondary-400 mr-1.5" />
                   <span className="text-sm text-secondary-900">
                     {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'Not set'}
                   </span>
                 </div>
               </div>
               
               <div>
                 <h3 className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Due Date</h3>
                 <div className="flex items-center mt-1">
                   <FiCalendar className="h-4 w-4 text-secondary-400 mr-1.5" />
                   <span className="text-sm text-secondary-900">
                     {project.dueDate ? format(new Date(project.dueDate), 'MMM d, yyyy') : 'Not set'}
                   </span>
                 </div>
               </div>
               
               <div className="col-span-2 sm:col-span-1">
                 <h3 className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Completion</h3>
                 <div className="flex items-center mt-1">
                   <FiCheckCircle className="h-4 w-4 text-secondary-400 mr-1.5" />
                   <span className="text-sm text-secondary-900">
                     {stats.totalTasks > 0 
                       ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` 
                       : '0%'}
                       <span className="text-secondary-500 ml-1">({stats.completedTasks}/{stats.totalTasks})</span>
                   </span>
                 </div>
               </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary-700">Overall Progress</span>
                  <span className="font-medium text-secondary-900">
                    {stats.totalTasks > 0 
                      ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` 
                      : '0%'}
                  </span>
                </div>
                <Progress 
                   value={stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0} 
                   className="h-2" 
                   indicatorColor={`bg-[${project.color || '#0ea5e9'}]`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* --- New Stats Cards Grid (like Dashboard) --- */}
      <Tabs defaultValue="tasks" value={activeView} onValueChange={setActiveView} className="w-full">
        <div className="flex justify-between items-center mb-2">
          <TabsList>
            <TabsTrigger value="tasks" className="flex items-center">
              <FiClipboard className="mr-1.5 h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="waiting" className="flex items-center">
              <FiClock className="mr-1.5 h-4 w-4" />
              Waiting On
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="tasks">
          {/* Task Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Completed Tasks */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                    <FiCheckSquare className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-secondary-900">{stats.completedTasks}</p>
                    <p className="text-sm text-secondary-500">Completed Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          
            {/* In Progress Tasks */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <FiPlayCircle className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-secondary-900">{stats.inProgressTasks}</p>
                    <p className="text-sm text-secondary-500">In Progress Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          
            {/* Total Tasks */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600">
                    <FiClipboard className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-secondary-900">{stats.totalTasks}</p>
                    <p className="text-sm text-secondary-500">Total Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          
            {/* Total Tracked Hours */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600">
                    <FiWatch className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-secondary-900">{stats.totalTrackedHours || 0}<span className="text-xl">h</span></p>
                    <p className="text-sm text-secondary-500">Total Tracked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              {/* --- Add Task Dialog Trigger --- */} 
              <Dialog open={showAddTaskModal} onOpenChange={setShowAddTaskModal}>
                <DialogTrigger asChild>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => setShowAddTaskModal(true)} 
                  >
                    <FiPlus className="mr-1.5 h-4 w-4" />
                    Add Task
                  </Button>
                </DialogTrigger>
                {/* Add Task Modal Content moved below */} 
              </Dialog>
            </CardHeader>
          
            <CardContent>
              {projectTasks.length > 0 ? (
                <div className="divide-y divide-secondary-100 -mx-6 -mb-6"> 
                  {projectTasks.map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-secondary-600 mb-3">No tasks have been added to this project yet.</p>
                  {/* Trigger Add Task Dialog */} 
                  <Dialog open={showAddTaskModal} onOpenChange={setShowAddTaskModal}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="primary"
                        onClick={() => setShowAddTaskModal(true)}
                      >
                        <FiPlus className="mr-1.5 h-4 w-4" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="waiting">
          {/* Waiting Items Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Requests */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600">
                    <FiPieChart className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-secondary-900">{projectWaitingItems.length}</p>
                    <p className="text-sm text-secondary-500">Total Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* High Priority */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
                    <FiAlertCircle className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-secondary-900">
                      {projectWaitingItems.filter(item => item.priority === 'high').length}
                    </p>
                    <p className="text-sm text-secondary-500">High Priority</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Average Wait Time */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <FiClock className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    {/* Calculate average wait time */}
                    {(() => {
                      const completedItems = projectWaitingItems.filter(item => item.status === 'completed');
                      let avgDays = 0;
                      
                      if (completedItems.length > 0) {
                        const totalDays = completedItems.reduce((sum, item) => {
                          if (item.sentDate && item.completedDate) {
                            const sentDate = new Date(item.sentDate);
                            const completedDate = new Date(item.completedDate);
                            const diffTime = Math.abs(completedDate - sentDate);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return sum + diffDays;
                          }
                          return sum;
                        }, 0);
                        
                        avgDays = (totalDays / completedItems.length).toFixed(1);
                      }
                      
                      return (
                        <p className="text-3xl font-bold text-secondary-900">
                          {avgDays} <span className="text-xl">days</span>
                        </p>
                      );
                    })()}
                    <p className="text-sm text-secondary-500">Average Wait Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Completion Rate */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                    <FiCheckCircle className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-secondary-900">
                      {projectWaitingItems.length > 0 
                        ? Math.round((projectWaitingItems.filter(item => item.status === 'completed').length / projectWaitingItems.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-sm text-secondary-500">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Waiting Items</CardTitle>
              {/* --- Add Waiting Item Dialog Trigger --- */} 
              <Dialog open={showAddWaitingItemModal} onOpenChange={setShowAddWaitingItemModal}>
                <DialogTrigger asChild>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={handleAddWaitingItemClick} 
                  >
                    <FiPlus className="mr-1.5 h-4 w-4" />
                    New Request
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardHeader>
          
            <CardContent>
              {projectWaitingItems.length > 0 ? (
                <div className="space-y-4"> 
                  {projectWaitingItems.map(item => (
                    <WaitingItemCard 
                      key={item.id} 
                      item={item} 
                      getStatusClass={getStatusClass}
                      getPriorityClass={getPriorityClass}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-secondary-600 mb-3">No waiting items have been added to this project yet.</p>
                  {/* Trigger Add Waiting Item Dialog */} 
                  <Dialog open={showAddWaitingItemModal} onOpenChange={setShowAddWaitingItemModal}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="primary"
                        onClick={handleAddWaitingItemClick}
                      >
                        <FiPlus className="mr-1.5 h-4 w-4" />
                        New Request
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Waiting Item Modal */}
      {showAddWaitingItemModal && (
        <WaitingItemForm
          onClose={handleWaitingItemFormClose}
          onSubmit={handleWaitingItemFormSubmit}
          projects={[project]} // Pass only the current project
          selectedProjectId={id} // Pre-select the current project
          disableProjectSelection={true} // Disable project selection since we're in project context
        />
      )}
      
      {/* --- Add Task Dialog Content --- */}
      <Dialog open={showAddTaskModal} onOpenChange={setShowAddTaskModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Fill in the details for the new task for project: {project?.name}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const { isValid, errors } = validateTaskForm(); // Assuming validation function
            if (!isValid) {
              setTaskFormErrors(errors);
              return;
            }
            setTaskFormErrors({}); // Clear previous errors
            try {
              const result = await createTask({
                ...newTask,
                projectId: id,
                estimatedHours: Number(newTask.estimatedHours) || 0
              });
      
              if (result.success) {
                setShowAddTaskModal(false); // Close modal
                setNewTask({ // Reset form state
                  title: '',
                  description: '',
                  status: 'not-started',
                  priority: 'medium',
                  dueDate: '',
                  estimatedHours: ''
                });
                // Update UI by using existing project tasks
                const updatedTasks = [...projectTasks, result.data];
                setProjectTasks(updatedTasks);
                toast({
                  title: "Task Created",
                  description: `Task "${result.data.title}" added successfully.`,
                });
              } else {
                setTaskFormErrors({ api: result.message || 'Failed to create task.' });
                toast({
                  variant: "destructive",
                  title: "Error Creating Task",
                  description: result.message || 'An unexpected error occurred.'
                });
              }
            } catch (err) {
              console.error("Error creating task:", err);
              setTaskFormErrors({ api: err.message || 'An unexpected error occurred.' });
              toast({
                variant: "destructive",
                title: "Error Creating Task",
                description: err.message || 'An unexpected error occurred.'
              });
            }
          }}>
            <div className="space-y-4 py-4"> 
              <div>
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  disabled={loading}
                  placeholder="Enter task title"
                  className={`block w-full ${taskFormErrors.title ? 'border-red-500' : ''}`}
                />
                {taskFormErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{taskFormErrors.title}</p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Task Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  disabled={loading}
                  placeholder="Enter task description"
                  className="block w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  {/* Using shadcn/ui Select */}
                  <Select 
                    value={newTask.status} 
                    onValueChange={(value) => setNewTask({...newTask, status: value})}
                    disabled={loading}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-started">Not Started</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  {/* Using shadcn/ui Select */}
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(value) => setNewTask({...newTask, priority: value})}
                    disabled={loading}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  disabled={loading}
                  placeholder="Select due date"
                  className={`block w-full ${taskFormErrors.dueDate ? 'border-red-500' : ''}`}
                />
                {taskFormErrors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{taskFormErrors.dueDate}</p>
                )}
              </div>
              <div>
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                  disabled={loading}
                  placeholder="Enter estimated hours"
                  className={`block w-full ${taskFormErrors.estimatedHours ? 'border-red-500' : ''}`}
                />
                {taskFormErrors.estimatedHours && (
                  <p className="mt-1 text-sm text-red-600">{taskFormErrors.estimatedHours}</p>
                )}
              </div>
            </div>
            {/* Display API error if any */}
            {taskFormErrors.api && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <p>{taskFormErrors.api}</p>
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => {
                  setShowAddTaskModal(false);
                  setTaskFormErrors({});
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={loading}
                className="min-w-[100px]" 
              >
                {loading ? (
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
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* --- Edit Project Dialog Content --- */}
      <Dialog open={showEditProjectModal} onOpenChange={setShowEditProjectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
               Make changes to your project: {project?.name}
            </DialogDescription>
          </DialogHeader>
          
          {editableProject && (
            <form onSubmit={handleUpdateProject} className="py-4">
             <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"> 
               <div>
                 <Label htmlFor="edit-name">Project Name *</Label>
                 <Input
                   id="edit-name"
                   type="text"
                   value={editableProject.name}
                   onChange={(e) => setEditableProject({ ...editableProject, name: e.target.value })}
                   disabled={loading}
                   placeholder="Enter project name"
                   className="block w-full"
                 />
               </div>
               
               <div>
                 <Label htmlFor="edit-status">Status</Label>
                 {/* Using shadcn/ui Select */}
                 <Select 
                    value={editableProject.status || 'not-started'} 
                    onValueChange={(value) => setEditableProject({...editableProject, status: value})}
                    disabled={loading}
                  >
                   <SelectTrigger id="edit-status">
                     <SelectValue placeholder="Select status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="not-started">Not Started</SelectItem>
                     <SelectItem value="in-progress">In Progress</SelectItem>
                     <SelectItem value="completed">Completed</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               
               <div>
                 <Label htmlFor="edit-client">Client</Label>
                 <Input
                   id="edit-client"
                   type="text"
                   value={editableProject.client}
                   onChange={(e) => setEditableProject({ ...editableProject, client: e.target.value })}
                   disabled={loading}
                   placeholder="Enter client name"
                   className="block w-full"
                 />
               </div>
               
               <div>
                 <Label htmlFor="edit-description">Project Description</Label>
                 <Textarea
                   id="edit-description"
                   value={editableProject.description}
                   onChange={(e) => setEditableProject({ ...editableProject, description: e.target.value })}
                   disabled={loading}
                   placeholder="Enter project description"
                   className="block w-full"
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="edit-startDate">Start Date</Label>
                   <Input
                     id="edit-startDate"
                     type="date"
                     value={editableProject.startDate}
                     onChange={(e) => setEditableProject({ ...editableProject, startDate: e.target.value })}
                     disabled={loading}
                     placeholder="Select start date"
                     className="block w-full"
                   />
                 </div>
                 
                 <div>
                   <Label htmlFor="edit-dueDate">Due Date</Label>
                   <Input
                     id="edit-dueDate"
                     type="date"
                     value={editableProject.dueDate}
                     onChange={(e) => setEditableProject({ ...editableProject, dueDate: e.target.value })}
                     disabled={loading}
                     placeholder="Select due date"
                     className="block w-full"
                   />
                 </div>
               </div>
               
               <div>
                 <Label htmlFor="edit-color">Color</Label>
                 <Input
                   id="edit-color"
                   type="color"
                   value={editableProject.color}
                   onChange={(e) => setEditableProject({ ...editableProject, color: e.target.value })}
                   disabled={loading}
                   placeholder="Select color"
                   className="block w-full"
                 />
               </div>
             </div>
             {/* Display API error if any */}
             {editFormErrors.api && (
               <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                 <p>{editFormErrors.api}</p>
               </div>
             )}
             
             <DialogFooter className="mt-6">
               <Button 
                 variant="outline" 
                 type="button"
                 onClick={() => {
                   setShowEditProjectModal(false)
                   setEditFormErrors({})
                   setEditableProject({ ...project }) 
                  }}
                 disabled={loading}
               >
                 Cancel
               </Button>
               <Button 
                 variant="primary" 
                 type="submit"
                 disabled={loading}
                 className="min-w-[120px]" 
               >
                 {loading ? (
                   <>
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Saving...
                   </>
                 ) : (
                   'Save Changes'
                 )}
               </Button>
             </DialogFooter>
           </form>
          )}
         </DialogContent>
      </Dialog>
      
      {/* --- Delete Confirmation Dialog --- */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
          >
            <FiTrash2 className="mr-1.5 h-4 w-4" />
            Delete Project
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project '{project.name}' and all associated tasks and time entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <p>{deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteError(null)} disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetail
