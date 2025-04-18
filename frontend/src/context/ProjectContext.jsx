import { createContext, useState, useContext, useEffect, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNotification } from './NotificationContext'
import apiClient, { handleApiRequest } from '../utils/apiClient'

const ProjectContext = createContext()

export const useProjects = () => useContext(ProjectContext)

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true) // Add loading state
  const [error, setError] = useState(null) // Add error state
  const { showNotification } = useNotification()

  // --- Data Fetching ---
  // Empty dependency array means this runs once on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [projectsResult, tasksResult, timeEntriesResult] = await Promise.all([
          handleApiRequest(() => apiClient.get('/projects')),
          handleApiRequest(() => apiClient.get('/tasks')),
          handleApiRequest(() => apiClient.get('/time-entries'))
        ])

        if (!projectsResult.success || !tasksResult.success || !timeEntriesResult.success) {
          throw new Error('Failed to fetch initial data')
        }

        setProjects(projectsResult.data)
        setTasks(tasksResult.data)
        setTimeEntries(timeEntriesResult.data)

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
  }, []
  
  // Function to fetch only active timers
  const fetchActiveTimers = async () => {
    setLoading(true)
    try {
      const result = await handleApiRequest(() => apiClient.get('/time-entries', {
        params: { active: true }
      }))
      
      if (!result.success) {
        throw new Error(`Failed to fetch active timers: ${result.message}`)
      }
      
      const activeTimersData = result.data
      
      // Update timeEntries state by replacing active entries and keeping completed ones
      setTimeEntries(prev => {
        // Keep entries that have an endTime (completed)
        const completedEntries = prev.filter(entry => entry.endTime !== null)
        // Add all active entries from the new data
        return [...activeTimersData, ...completedEntries]
      })
      
      return { success: true, data: activeTimersData }
    } catch (err) {
      console.error("Error fetching active timers:", err)
      setError(err.message || 'Could not load active timers. Please try again later.')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Helper function to make API requests using the apiClient utility
  const makeApiRequest = async (method, endpoint, data = null, config = {}) => {
    try {
      console.log(`Making ${method.toUpperCase()} API request to: ${endpoint}`);
      return await handleApiRequest(() => {
        switch (method.toLowerCase()) {
          case 'get':
            return apiClient.get(endpoint, config);
          case 'post':
            return apiClient.post(endpoint, data, config);
          case 'put':
            return apiClient.put(endpoint, data, config);
          case 'delete':
            return apiClient.delete(endpoint, config);
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      });
    } catch (err) {
      console.error(`API ${method.toUpperCase()} Request Error:`, err);
      return { success: false, message: err.message };
    }
  };

  // --- Project CRUD ---
  const createProject = async (projectData) => {
    setLoading(true);
    try {
      const result = await makeApiRequest('post', '/projects', projectData);
      
      if (result.success) {
        setProjects(prev => [result.data, ...prev]);
        showNotification('success', `Project "${projectData.name}" created successfully`);
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to create project: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error creating project:', err);
      showNotification('error', `Failed to create project: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  const updateProject = async (id, projectData) => {
    // Only send fields that are being updated (backend handles this)
    setLoading(true);
    try {
      const result = await makeApiRequest('put', `/projects/${id}`, projectData);
      
      if (result.success) {
        setProjects(prev => prev.map(p => p.id === id ? result.data : p));
        showNotification('success', `Project "${projectData.name || 'Unknown'}" updated successfully`);
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to update project: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error updating project:', err);
      showNotification('error', `Failed to update project: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  const deleteProject = async (id) => {
    setLoading(true);
    try {
      // Get project name before deletion for notification
      const projectToDelete = projects.find(p => p.id === id);
      const projectName = projectToDelete?.name || 'Unknown';
      
      const result = await makeApiRequest('delete', `/projects/${id}`);
      
      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
        // Remove associated tasks and time entries from frontend state
        const tasksToDelete = tasks.filter(t => t.projectId === id).map(t => t.id);
        setTasks(prev => prev.filter(t => t.projectId !== id));
        setTimeEntries(prev => prev.filter(te => !tasksToDelete.includes(te.taskId)));
        showNotification('success', `Project "${projectName}" deleted successfully`);
        return { success: true };
      } else {
        showNotification('error', `Failed to delete project: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      showNotification('error', `Failed to delete project: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  // --- Task CRUD ---
  const createTask = async (taskData) => {
    setLoading(true);
    try {
      const result = await makeApiRequest('post', '/tasks', taskData);
      
      if (result.success) {
        setTasks(prev => [result.data, ...prev]);
        showNotification('success', `Task "${taskData.title}" created successfully`);
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to create task: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error creating task:', err);
      showNotification('error', `Failed to create task: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  const updateTask = async (id, taskData) => {
    setLoading(true);
    try {
      const result = await makeApiRequest('put', `/tasks/${id}`, taskData);
      
      if (result.success) {
        setTasks(prev => prev.map(t => t.id === id ? result.data : t));
        showNotification('success', `Task "${taskData.title || 'Unknown'}" updated successfully`);
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to update task: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error updating task:', err);
      showNotification('error', `Failed to update task: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  const deleteTask = async (id) => {
    setLoading(true);
    try {
      // Get task title before deletion for notification
      const taskToDelete = tasks.find(t => t.id === id);
      const taskTitle = taskToDelete?.title || 'Unknown';
      
      const result = await makeApiRequest('delete', `/tasks/${id}`);
      
      if (result.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
        // Remove associated time entries from frontend state
        setTimeEntries(prev => prev.filter(te => te.taskId !== id));
        showNotification('success', `Task "${taskTitle}" deleted successfully`);
        return { success: true };
      } else {
        showNotification('error', `Failed to delete task: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      showNotification('error', `Failed to delete task: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  // --- Time Tracking ---
  const startTimeTracking = async (taskId) => {
    // We now support multiple concurrent timers, so we don't need to check if another timer is running
    // Just start a new timer for the selected task
    console.log(`Starting time tracking for task: ${taskId}`);
    setLoading(true);
    
    try {
      const result = await makeApiRequest('post', '/time-entries/start', { taskId });
      
      if (result.success) {
        console.log('Time tracking started successfully:', result.data);
        // Add the new time entry to the list without removing other active ones
        setTimeEntries(prev => [result.data, ...prev]);
        return { success: true, data: result.data };
      } else {
        console.error('Failed to start time tracking:', result.message);
        setError(result.message || 'Failed to start time tracking');
        return result;
      }
    } catch (err) {
      console.error('Error starting time tracking:', err);
      setError(err.message || 'Failed to start time tracking');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }

  const stopTimeTracking = async (timeEntryId) => {
    console.log(`Stopping time tracking for entry: ${timeEntryId}`);
    setLoading(true);
    
    try {
      const result = await makeApiRequest('put', `/time-entries/stop/${timeEntryId}`);
      
      if (result.success) {
        console.log('Time tracking stopped successfully:', result.data);
        // Replace the entry with the updated one from the server
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te));
        return { success: true, data: result.data };
      } else {
        console.error('Failed to stop time tracking:', result.message);
        setError(result.message || 'Failed to stop time tracking');
        return result;
      }
    } catch (err) {
      console.error('Error stopping time tracking:', err);
      setError(err.message || 'Failed to stop time tracking');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }
  
  const pauseTimeTracking = async (timeEntryId) => {
    console.log(`Pausing time tracking for entry: ${timeEntryId}`);
    setLoading(true);
    
    try {
      const result = await makeApiRequest('put', `/time-entries/pause/${timeEntryId}`);
      
      if (result.success) {
        console.log('Time tracking paused successfully:', result.data);
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te));
        return { success: true, data: result.data };
      } else {
        console.error('Failed to pause time tracking:', result.message);
        setError(result.message || 'Failed to pause time tracking');
        return result;
      }
    } catch (err) {
      console.error('Error pausing time tracking:', err);
      setError(err.message || 'Failed to pause time tracking');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resumeTimeTracking = async (timeEntryId) => {
    console.log(`Resuming time tracking for entry: ${timeEntryId}`);
    setLoading(true);
    
    try {
      const result = await makeApiRequest('put', `/time-entries/resume/${timeEntryId}`);
      
      if (result.success) {
        console.log('Time tracking resumed successfully:', result.data);
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te));
        return { success: true, data: result.data };
      } else {
        console.error('Failed to resume time tracking:', result.message);
        setError(result.message || 'Failed to resume time tracking');
        return result;
      }
    } catch (err) {
      console.error('Error resuming time tracking:', err);
      setError(err.message || 'Failed to resume time tracking');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteTimeEntry = async (id) => {
    setLoading(true);
    try {
      const result = await makeApiRequest('delete', `/time-entries/${id}`);
      
      if (result.success) {
        setTimeEntries(prev => prev.filter(te => te.id !== id));
        showNotification('success', 'Time entry deleted successfully');
        return { success: true };
      } else {
        showNotification('error', `Failed to delete time entry: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error deleting time entry:', err);
      showNotification('error', `Failed to delete time entry: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
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
      pauseTimeTracking,
      resumeTimeTracking,
      deleteTimeEntry, // Provide deleteTimeEntry
      fetchActiveTimers, // Provide the new function
      projectStats,
      totalTrackedHours,
      recentActivity
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
