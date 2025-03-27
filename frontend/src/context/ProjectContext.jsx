import { createContext, useContext, useState, useEffect } from 'react'

const ProjectContext = createContext()

export const useProjects = () => useContext(ProjectContext)

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load mock data immediately
    loadMockData()
  }, [])

  const loadMockData = () => {
    try {
      setLoading(true)
      
      // Mock projects data
      const mockProjects = [
        {
          id: 'project1',
          name: 'Website Redesign',
          description: 'Complete overhaul of the company website with modern design and improved user experience.',
          client: 'Acme Corporation',
          color: '#0ea5e9',
          startDate: '2025-03-01',
          dueDate: '2025-04-15',
          status: 'in-progress',
          totalTasks: 12,
          completedTasks: 5,
          totalHours: 24
        },
        {
          id: 'project2',
          name: 'Mobile App Development',
          description: 'Create a native mobile application for iOS and Android platforms.',
          client: 'TechStart',
          color: '#8b5cf6',
          startDate: '2025-02-15',
          dueDate: '2025-05-30',
          status: 'in-progress',
          totalTasks: 18,
          completedTasks: 3,
          totalHours: 16
        },
        {
          id: 'project3',
          name: 'Marketing Campaign',
          description: 'Develop and execute a comprehensive marketing strategy for product launch.',
          client: 'GreenLife',
          color: '#10b981',
          startDate: '2025-01-10',
          dueDate: '2025-03-15',
          status: 'completed',
          totalTasks: 8,
          completedTasks: 8,
          totalHours: 32
        },
        {
          id: 'project4',
          name: 'E-commerce Platform',
          description: 'Build an online store with product catalog, shopping cart, and payment processing.',
          client: 'Fashion Forward',
          color: '#f59e0b',
          startDate: '2025-03-10',
          dueDate: '2025-06-20',
          status: 'not-started',
          totalTasks: 15,
          completedTasks: 0,
          totalHours: 0
        }
      ]
      
      // Mock tasks data
      const mockTasks = [
        {
          id: 'task1',
          projectId: 'project1',
          title: 'Design homepage mockup',
          description: 'Create wireframes and visual design for the homepage',
          status: 'completed',
          priority: 'high',
          dueDate: '2025-03-10',
          estimatedHours: 8
        },
        {
          id: 'task2',
          projectId: 'project1',
          title: 'Implement responsive navigation',
          description: 'Create mobile-friendly navigation menu',
          status: 'in-progress',
          priority: 'medium',
          dueDate: '2025-03-15',
          estimatedHours: 6
        },
        {
          id: 'task3',
          projectId: 'project1',
          title: 'Optimize images',
          description: 'Compress and optimize all website images',
          status: 'not-started',
          priority: 'low',
          dueDate: '2025-03-20',
          estimatedHours: 4
        },
        {
          id: 'task4',
          projectId: 'project2',
          title: 'Design app UI',
          description: 'Create UI design for all app screens',
          status: 'completed',
          priority: 'high',
          dueDate: '2025-02-28',
          estimatedHours: 12
        },
        {
          id: 'task5',
          projectId: 'project2',
          title: 'Implement user authentication',
          description: 'Create login, registration, and password reset functionality',
          status: 'in-progress',
          priority: 'high',
          dueDate: '2025-03-10',
          estimatedHours: 8
        },
        {
          id: 'task6',
          projectId: 'project3',
          title: 'Create social media content',
          description: 'Design and schedule posts for all platforms',
          status: 'completed',
          priority: 'medium',
          dueDate: '2025-02-15',
          estimatedHours: 6
        }
      ]
      
      // Mock time entries data
      const mockTimeEntries = [
        {
          id: 'entry1',
          taskId: 'task1',
          startTime: new Date(new Date().setHours(9, 30)).toISOString(),
          endTime: new Date(new Date().setHours(11, 45)).toISOString(),
          duration: 8100000, // 2h 15m in ms
          notes: 'Completed initial design mockups'
        },
        {
          id: 'entry2',
          taskId: 'task2',
          startTime: new Date(new Date().setHours(13, 0)).toISOString(),
          endTime: new Date(new Date().setHours(15, 30)).toISOString(),
          duration: 9000000, // 2h 30m in ms
          notes: 'Implemented responsive navigation'
        },
        {
          id: 'entry3',
          taskId: 'task5',
          startTime: new Date(new Date().setHours(16, 0)).toISOString(),
          endTime: null, // Currently active
          duration: null,
          notes: 'Working on user authentication flow'
        }
      ]
      
      setProjects(mockProjects)
      setTasks(mockTasks)
      setTimeEntries(mockTimeEntries)
    } catch (error) {
      console.error('Error loading mock data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (projectData) => {
    try {
      // Create a new project with mock data
      const newProject = {
        id: `project${projects.length + 1}`,
        ...projectData,
        status: projectData.status || 'not-started',
        totalTasks: 0,
        completedTasks: 0,
        totalHours: 0
      }
      setProjects([...projects, newProject])
      return { success: true, project: newProject }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to create project'
      }
    }
  }

  const updateProject = async (id, projectData) => {
    try {
      // Update existing project
      const updatedProject = { ...projects.find(p => p.id === id), ...projectData }
      setProjects(projects.map(p => p.id === id ? updatedProject : p))
      return { success: true, project: updatedProject }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to update project'
      }
    }
  }

  const deleteProject = async (id) => {
    try {
      // Remove project and associated tasks and time entries
      setProjects(projects.filter(p => p.id !== id))
      setTasks(tasks.filter(t => t.projectId !== id))
      setTimeEntries(timeEntries.filter(te => !tasks.some(t => t.id === te.taskId && t.projectId === id)))
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to delete project'
      }
    }
  }

  const createTask = async (taskData) => {
    try {
      // Create a new task with mock data
      const newTask = {
        id: `task${tasks.length + 1}`,
        ...taskData,
        status: taskData.status || 'not-started'
      }
      setTasks([...tasks, newTask])
      
      // Update project stats
      const project = projects.find(p => p.id === newTask.projectId)
      if (project) {
        const updatedProject = {
          ...project,
          totalTasks: project.totalTasks + 1
        }
        setProjects(projects.map(p => p.id === project.id ? updatedProject : p))
      }
      
      return { success: true, task: newTask }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to create task'
      }
    }
  }

  const updateTask = async (id, taskData) => {
    try {
      // Get current task
      const currentTask = tasks.find(t => t.id === id)
      
      // Update task
      const updatedTask = { ...currentTask, ...taskData }
      setTasks(tasks.map(t => t.id === id ? updatedTask : t))
      
      // Update project stats if status changed
      if (currentTask && currentTask.status !== updatedTask.status) {
        const project = projects.find(p => p.id === updatedTask.projectId)
        if (project) {
          const completedDelta = 
            updatedTask.status === 'completed' ? 1 : 
            currentTask.status === 'completed' ? -1 : 0
          
          const updatedProject = {
            ...project,
            completedTasks: project.completedTasks + completedDelta
          }
          setProjects(projects.map(p => p.id === project.id ? updatedProject : p))
        }
      }
      
      return { success: true, task: updatedTask }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to update task'
      }
    }
  }

  const deleteTask = async (id) => {
    try {
      // Get task before deleting
      const taskToDelete = tasks.find(t => t.id === id)
      
      // Remove task and associated time entries
      setTasks(tasks.filter(t => t.id !== id))
      setTimeEntries(timeEntries.filter(te => te.taskId !== id))
      
      // Update project stats
      if (taskToDelete) {
        const project = projects.find(p => p.id === taskToDelete.projectId)
        if (project) {
          const updatedProject = {
            ...project,
            totalTasks: project.totalTasks - 1,
            completedTasks: taskToDelete.status === 'completed' 
              ? project.completedTasks - 1 
              : project.completedTasks
          }
          setProjects(projects.map(p => p.id === project.id ? updatedProject : p))
        }
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to delete task'
      }
    }
  }

  const startTimeTracking = async (taskId) => {
    try {
      // Create a new time entry
      const newTimeEntry = {
        id: `entry${timeEntries.length + 1}`,
        taskId,
        startTime: new Date().toISOString(),
        endTime: null,
        duration: null,
        notes: ''
      }
      setTimeEntries([...timeEntries, newTimeEntry])
      return { success: true, timeEntry: newTimeEntry }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to start time tracking'
      }
    }
  }

  const stopTimeTracking = async (timeEntryId) => {
    try {
      // Find time entry
      const timeEntry = timeEntries.find(te => te.id === timeEntryId)
      if (!timeEntry) {
        throw new Error('Time entry not found')
      }
      
      // Calculate duration
      const startTime = new Date(timeEntry.startTime)
      const endTime = new Date()
      const duration = endTime - startTime
      
      // Update time entry
      const updatedTimeEntry = {
        ...timeEntry,
        endTime: endTime.toISOString(),
        duration
      }
      
      setTimeEntries(timeEntries.map(te => te.id === timeEntryId ? updatedTimeEntry : te))
      return { success: true, timeEntry: updatedTimeEntry }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to stop time tracking'
      }
    }
  }

  const value = {
    projects,
    tasks,
    timeEntries,
    loading,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    startTimeTracking,
    stopTimeTracking,
    refreshProjects: loadMockData
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
