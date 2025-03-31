import { createContext, useState, useContext, useEffect, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'

// Define the base URL for the API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api'

const ProjectContext = createContext()

export const useProjects = () => useContext(ProjectContext)

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true) // Add loading state
  const [error, setError] = useState(null) // Add error state

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [projectsRes, tasksRes, timeEntriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/projects`),
          fetch(`${API_BASE_URL}/tasks`),
          fetch(`${API_BASE_URL}/time-entries`)
        ])

        if (!projectsRes.ok || !tasksRes.ok || !timeEntriesRes.ok) {
          throw new Error('Failed to fetch initial data')
        }

        const projectsData = await projectsRes.json()
        const tasksData = await tasksRes.json()
        const timeEntriesData = await timeEntriesRes.json()

        setProjects(projectsData)
        setTasks(tasksData)
        setTimeEntries(timeEntriesData)

      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err.message || 'Could not load data. Please try again later.')
        // Keep existing state or clear it depending on desired UX
        // setProjects([]); setTasks([]); setTimeEntries([]); 
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Empty dependency array means this runs once on mount

  // --- Helper Functions (Consider moving to a utils file later) ---
  const apiRequest = async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      // If response has content, parse it, otherwise return success status
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
         return { success: true, data: await response.json() };
      } else {
         return { success: true }; // For DELETE or other requests with no body response
      }
    } catch (err) {
      console.error('API Request Error:', err);
      return { success: false, message: err.message };
    }
  };

  // --- Project CRUD ---
  const createProject = async (projectData) => {
    const result = await apiRequest(`${API_BASE_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
    if (result.success) {
      setProjects(prev => [result.data, ...prev])
    }
    return result
  }

  const updateProject = async (id, projectData) => {
    // Only send fields that are being updated (backend handles this)
    const result = await apiRequest(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
    if (result.success) {
      setProjects(prev => prev.map(p => p.id === id ? result.data : p))
    }
    return result
  }

  const deleteProject = async (id) => {
    const result = await apiRequest(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (result.success) {
      setProjects(prev => prev.filter(p => p.id !== id))
      // Remove associated tasks and time entries from frontend state
      const tasksToDelete = tasks.filter(t => t.projectId === id).map(t => t.id);
      setTasks(prev => prev.filter(t => t.projectId !== id));
      setTimeEntries(prev => prev.filter(te => !tasksToDelete.includes(te.taskId)));
    }
    return result
  }

  // --- Task CRUD ---
  const createTask = async (taskData) => {
    const result = await apiRequest(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    if (result.success) {
      setTasks(prev => [result.data, ...prev])
    }
    return result
  }

  const updateTask = async (id, taskData) => {
    const result = await apiRequest(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
    if (result.success) {
      setTasks(prev => prev.map(t => t.id === id ? result.data : t))
    }
    return result
  }

  const deleteTask = async (id) => {
    const result = await apiRequest(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (result.success) {
      setTasks(prev => prev.filter(t => t.id !== id))
      // Remove associated time entries from frontend state
      setTimeEntries(prev => prev.filter(te => te.taskId !== id));
    }
    return result
  }

  // --- Time Tracking ---
  const startTimeTracking = async (taskId) => {
    const result = await apiRequest(`${API_BASE_URL}/time-entries/start`, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
    if (result.success) {
      setTimeEntries(prev => [result.data, ...prev])
    }
    return result
  }

  const stopTimeTracking = async (timeEntryId) => {
    const result = await apiRequest(`${API_BASE_URL}/time-entries/stop/${timeEntryId}`, {
      method: 'PUT',
    });
    if (result.success) {
      setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te))
    }
    return result
  }
  
  const deleteTimeEntry = async (id) => {
    const result = await apiRequest(`${API_BASE_URL}/time-entries/${id}`, {
        method: 'DELETE',
    });
    if (result.success) {
        setTimeEntries(prev => prev.filter(te => te.id !== id));
    }
    return result;
  };

  // --- Calculated Values (Memoized) ---
  const projectStats = useMemo(() => {
    return projects.reduce((acc, project) => {
      const projectTasks = tasks.filter(task => task.projectId === project.id)
      const completedTasks = projectTasks.filter(task => task.status === 'completed').length
      const projectTimeEntries = timeEntries.filter(entry => 
        projectTasks.some(task => task.id === entry.taskId) && entry.duration
      )
      const totalHours = projectTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600 // Assuming duration is in seconds
      
      acc[project.id] = {
        totalTasks: projectTasks.length,
        completedTasks: completedTasks,
        totalHours: parseFloat(totalHours.toFixed(1)),
        progress: projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0
      }
      return acc
    }, {})
  }, [projects, tasks, timeEntries])

  const totalTrackedHours = useMemo(() => {
    return timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600 // Assuming duration is in seconds
  }, [timeEntries])

  const recentActivity = useMemo(() => {
    // Combine and sort projects, tasks, time entries by creation/update time (if available)
    // This is a simplified version. A real implementation might need dedicated timestamp fields.
    const activities = [
      ...projects.map(p => ({ ...p, type: 'project', date: p.createdAt || new Date(0) })),
      ...tasks.map(t => ({ ...t, type: 'task', date: t.createdAt || new Date(0) })),
      // ...timeEntries.map(te => ({ ...te, type: 'time', date: te.createdAt || new Date(0) }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); 
    
    // Format for display
    return activities.slice(0, 5).map(activity => {
        let action = 'created'; // Default
        // Add logic here if you have update timestamps
        const timeAgo = formatDistanceToNow(new Date(activity.date), { addSuffix: true });
        switch (activity.type) {
            case 'project':
                return `Project "${activity.name}" ${action} ${timeAgo}`;
            case 'task':
                const projectName = projects.find(p => p.id === activity.projectId)?.name || 'a project';
                return `Task "${activity.title}" ${action} in ${projectName} ${timeAgo}`;
            // Add time entry case if needed
            default:
                return `Activity ${timeAgo}`;
        }
    });
}, [projects, tasks, timeEntries]);


  return (
    <ProjectContext.Provider value={{
      projects,
      tasks,
      timeEntries,
      loading, // Provide loading state
      error, // Provide error state
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      startTimeTracking,
      stopTimeTracking,
      deleteTimeEntry, // Provide deleteTimeEntry
      projectStats,
      totalTrackedHours,
      recentActivity
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
