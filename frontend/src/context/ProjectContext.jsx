import { createContext, useState, useContext, useEffect, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNotification } from './NotificationContext'
import axios from 'axios'

// Define the base URL for the API - Use relative path for proxy
const API_BASE_URL = '/api' // Rely on Nginx proxy in Docker

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Use axios for all API requests
        const [projectsRes, tasksRes, timeEntriesRes] = await Promise.all([
          api.get('/projects'),
          api.get('/tasks'),
          api.get('/time-entries')
        ])

        // Axios automatically throws errors for non-2xx responses
        // and parses JSON responses, so we can directly use the data

        setProjects(projectsRes.data)
        setTasks(tasksRes.data)
        setTimeEntries(timeEntriesRes.data)

      } catch (err) {
        console.error("Error fetching data:", err)

        // Handle axios error
        let errorMessage = 'Could not load data. Please try again later.'
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = err.response.data?.message || `HTTP error! status: ${err.response.status}`
        } else if (err.request) {
          // The request was made but no response was received
          errorMessage = 'No response received from server'
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage = err.message
        }

        setError(errorMessage)
        // Keep existing state or clear it depending on desired UX
        // setProjects([]); setTasks([]); setTimeEntries([]);
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Empty dependency array means this runs once on mount

  // Function to fetch only active timers
  const fetchActiveTimers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/time-entries', {
        params: { active: true }
      })

      const activeTimersData = response.data

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

      // Handle axios error
      let errorMessage = 'Could not load active timers. Please try again later.'
      if (err.response) {
        errorMessage = err.response.data?.message || `Failed to fetch active timers: ${err.response.status}`
      } else if (err.request) {
        errorMessage = 'No response received from server'
      } else {
        errorMessage = err.message
      }

      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // --- Helper Functions (Consider moving to a utils file later) ---
  /**
   * Helper function to make API requests using axios
   *
   * Advantages over fetch:
   * - Automatic JSON transformation
   * - Better error handling
   * - Request/response interceptors
   * - Automatic transforms of JSON data
   * - Client-side protection against XSRF
   *
   * @param {string} url - The URL to make the request to
   * @param {Object} options - The options for the request
   * @returns {Promise<Object>} - A promise that resolves to the response data
   */
  const apiRequest = async (url, options = {}) => {
    try {
      // Extract method and body from options
      const { method = 'GET', body, headers, ...restOptions } = options;

      // Prepare request config
      const config = {
        method,
        url: url.startsWith('http') ? url : url, // axios already uses baseURL
        headers: {
          ...headers,
        },
        ...restOptions,
      };

      // Add data if body is provided
      if (body) {
        config.data = body;
      }

      console.log(`Making API request to: ${config.url}`);

      // Make the request
      const response = await api(config);

      // Return success with data
      return { success: true, data: response.data };
    } catch (err) {
      console.error('API Request Error:', err);

      // Handle axios error
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = err.response.data?.message || `HTTP error! status: ${err.response.status}`;
        return { success: false, message: errorMessage, status: err.response.status };
      } else if (err.request) {
        // The request was made but no response was received
        return { success: false, message: 'No response received from server' };
      } else {
        // Something happened in setting up the request that triggered an Error
        return { success: false, message: err.message };
      }
    }
  };

  // --- Project CRUD ---
  const createProject = async (projectData) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/projects`, {
        method: 'POST',
        body: projectData,
      });

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
      const result = await apiRequest(`/projects/${id}`, {
        method: 'PUT',
        body: projectData,
      });

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

      const result = await apiRequest(`/projects/${id}`, {
        method: 'DELETE',
      });

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
      const result = await apiRequest(`/tasks`, {
        method: 'POST',
        body: taskData,
      });

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
      const result = await apiRequest(`/tasks/${id}`, {
        method: 'PUT',
        body: taskData,
      });

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

      const result = await apiRequest(`/tasks/${id}`, {
        method: 'DELETE',
      });

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
      const result = await apiRequest(`/time-entries/start`, {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });

      if (result.success) {
        console.log('Time tracking started successfully:', result.data);
        // Add the new time entry to the list without removing other active ones
        setTimeEntries(prev => [result.data, ...prev]);
        
        // Refresh tasks to pick up any status changes made by the backend
        // (Backend automatically updates task status to 'in-progress' when timer starts)
        try {
          const tasksResponse = await api.get('/tasks');
          setTasks(tasksResponse.data);
        } catch (tasksFetchError) {
          console.warn('Failed to refresh tasks after starting timer:', tasksFetchError);
          // Don't fail the entire operation if task refresh fails
        }
        
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
      const result = await apiRequest(`/time-entries/stop/${timeEntryId}`, {
        method: 'PUT',
      });

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
    
    try {
      // Optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: true } : te
      ));

      const result = await apiRequest(`/time-entries/pause/${timeEntryId}`, {
        method: 'PUT',
      });

      if (result.success) {
        console.log('Time tracking paused successfully:', result.data);
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te));
        return { success: true, data: result.data };
      } else {
        console.error('Failed to pause time tracking:', result.message);
        // Revert optimistic update
        setTimeEntries(prev => prev.map(te => 
          te.id === timeEntryId ? { ...te, isPaused: false } : te
        ));
        setError(result.message || 'Failed to pause time tracking');
        return result;
      }
    } catch (err) {
      console.error('Error pausing time tracking:', err);
      // Revert optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: false } : te
      ));
      setError(err.message || 'Failed to pause time tracking');
      return { success: false, message: err.message };
    }
  };

  const resumeTimeTracking = async (timeEntryId) => {
    console.log(`Resuming time tracking for entry: ${timeEntryId}`);
    
    try {
      // Optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: false, lastResumedAt: new Date().toISOString() } : te
      ));

      const result = await apiRequest(`/time-entries/resume/${timeEntryId}`, {
        method: 'PUT',
      });

      if (result.success) {
        console.log('Time tracking resumed successfully:', result.data);
        setTimeEntries(prev => prev.map(te => te.id === timeEntryId ? result.data : te));
        return { success: true, data: result.data };
      } else {
        console.error('Failed to resume time tracking:', result.message);
        // Revert optimistic update
        setTimeEntries(prev => prev.map(te => 
          te.id === timeEntryId ? { ...te, isPaused: true } : te
        ));
        setError(result.message || 'Failed to resume time tracking');
        return result;
      }
    } catch (err) {
      console.error('Error resuming time tracking:', err);
      // Revert optimistic update
      setTimeEntries(prev => prev.map(te => 
        te.id === timeEntryId ? { ...te, isPaused: true } : te
      ));
      setError(err.message || 'Failed to resume time tracking');
      return { success: false, message: err.message };
    }
  };

  const deleteTimeEntry = async (id) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/time-entries/${id}`, {
        method: 'DELETE',
      });

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

  const updateTimeEntry = async (id, timeEntryData) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/time-entries/${id}`, {
        method: 'PUT',
        body: timeEntryData,
      });

      if (result.success) {
        // Update the time entry in the state
        setTimeEntries(prev => prev.map(te => te.id === id ? result.data : te));
        showNotification('success', 'Time entry updated successfully');
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to update time entry: ${result.message || 'Unknown error'}`);
        return result;
      }
    } catch (err) {
      console.error('Error updating time entry:', err);
      showNotification('error', `Failed to update time entry: ${err.message || 'Unknown error'}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a manual time entry
   *
   * @param {Object} timeEntryData - Data for the new time entry
   * @param {string} timeEntryData.taskId - ID of the task
   * @param {string} timeEntryData.startTime - Start time (ISO string)
   * @param {string} timeEntryData.endTime - End time (ISO string)
   * @param {number} timeEntryData.duration - Duration in seconds
   * @param {string} timeEntryData.notes - Optional notes
   * @returns {Promise<Object>} - Result object with success flag and data or error message
   */
  const createManualTimeEntry = async (timeEntryData) => {
    setLoading(true);
    try {
      // First, start a new time entry
      const startResult = await apiRequest('/time-entries/start', {
        method: 'POST',
        body: JSON.stringify({ taskId: timeEntryData.taskId }),
      });

      if (!startResult.success) {
        showNotification('error', `Failed to create time entry: ${startResult.message || 'Unknown error'}`);
        return startResult;
      }

      // Get the ID of the newly created time entry
      const timeEntryId = startResult.data.id;

      // Now update it with the correct start time, end time, and duration
      const updateResult = await apiRequest(`/time-entries/${timeEntryId}`, {
        method: 'PUT',
        body: {
          startTime: timeEntryData.startTime,
          endTime: timeEntryData.endTime,
          duration: timeEntryData.duration,
          notes: timeEntryData.notes
        },
      });

      if (updateResult.success) {
        // Update the time entry in the state
        setTimeEntries(prev => {
          // Remove the initial entry that was created
          const filtered = prev.filter(entry => entry.id !== timeEntryId);
          // Add the updated entry
          return [updateResult.data, ...filtered];
        });

        showNotification('success', 'Manual time entry added successfully');
        return { success: true, data: updateResult.data };
      } else {
        showNotification('error', `Failed to update time entry: ${updateResult.message || 'Unknown error'}`);
        return updateResult;
      }
    } catch (err) {
      console.error('Error adding manual time entry:', err);
      showNotification('error', `Failed to add manual time entry: ${err.message || 'Unknown error'}`);
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


  /**
   * Note on State Management:
   *
   * The React Context API is currently sufficient for managing multiple active timers in this application.
   * Reasons:
   * 1. The state updates are predictable and follow a clear pattern
   * 2. The number of active timers is typically small (< 10)
   * 3. Timer updates are infrequent and don't cause performance issues
   * 4. The component tree is not deeply nested, so prop drilling is not a significant issue
   *
   * If the application grows to include:
   * - Many more concurrent timers (dozens or hundreds)
   * - More complex state interactions
   * - Performance issues with Context re-renders
   *
   * Then consider migrating to a more robust state management solution like:
   * - Zustand (lightweight, hooks-based)
   * - Redux Toolkit (more structured, better for complex state)
   * - Jotai/Recoil (atomic state management)
   */
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
      updateTimeEntry, // Provide updateTimeEntry
      createManualTimeEntry, // Provide createManualTimeEntry
      fetchActiveTimers, // Provide the new function
      projectStats,
      totalTrackedHours,
      recentActivity
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
