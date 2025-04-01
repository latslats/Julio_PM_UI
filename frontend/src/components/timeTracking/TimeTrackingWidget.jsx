import { useState, useEffect } from 'react'
import { useProjects } from '../../context/ProjectContext'
import { FiPlay, FiPause, FiClock, FiStopCircle, FiLoader } from 'react-icons/fi'
import { useNotification } from '../../context/NotificationContext'

const TimeTrackingWidget = () => {
  const {
    projects,
    tasks,
    timeEntries,
    stopTimeTracking,
    startTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    loading,
    fetchActiveTimers
  } = useProjects()
  const { showNotification } = useNotification()

  // Find all active entries from the context state
  const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null)
  // Use the first active entry for the main display if available
  const activeTimeEntry = activeTimeEntries.length > 0 ? activeTimeEntries[0] : null

  // Track elapsed time for all active entries
  const [elapsedTimes, setElapsedTimes] = useState({})
  // Track loading state for each entry separately
  const [actionLoadingMap, setActionLoadingMap] = useState({})

  // Helper function to get task and project for a time entry
  const getEntryDetails = (entry) => {
    const task = tasks.find(t => t.id === entry?.taskId);
    const project = task ? projects.find(p => p.id === task.projectId) : null;
    return { task, project };
  }

  // Timer effect - Calculate elapsed time for all active entries
  useEffect(() => {
    let intervals = [];

    // Clear previous state if no active entries
    if (activeTimeEntries.length === 0) {
      setElapsedTimes({});
      return () => {};
    }

    // Initialize elapsed times for all active entries
    activeTimeEntries.forEach(entry => {
      const calculateElapsed = () => {
        let currentElapsedTime = parseFloat(entry.totalPausedDuration) || 0;
        if (!entry.isPaused && entry.lastResumedAt) {
          const now = new Date().getTime();
          const lastResume = new Date(entry.lastResumedAt).getTime();
          currentElapsedTime += (now - lastResume) / 1000;
        }
        
        setElapsedTimes(prev => ({
          ...prev,
          [entry.id]: Math.floor(currentElapsedTime)
        }));
      };

      // Calculate once immediately
      calculateElapsed();

      // If entry is running (not paused), update every second
      if (!entry.isPaused) {
        const interval = setInterval(calculateElapsed, 1000);
        intervals.push(interval);
      }
    });

    // Cleanup function to clear all intervals
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [activeTimeEntries])

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':')
  }

  // Handle stop tracking for a specific entry
  const handleStopTracking = async (entryId) => {
    try {
      // Set loading state for this specific entry
      setActionLoadingMap(prev => ({ ...prev, [entryId]: 'stop' }));
      
      const result = await stopTimeTracking(entryId);
      if (result.success) {
        showNotification('success', 'Timer stopped successfully');
        // Refresh active timers to ensure UI is up-to-date
        await fetchActiveTimers();
      } else {
        showNotification('error', `Failed to stop timer: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error stopping timer:', err);
      showNotification('error', `Error stopping timer: ${err.message || 'Unknown error'}`);
    } finally {
      // Clear loading state for this entry
      setActionLoadingMap(prev => {
        const newMap = { ...prev };
        delete newMap[entryId];
        return newMap;
      });
    }
  }

  // Handle pause/resume for a specific entry
  const handlePauseResume = async (entry) => {
    try {
      // Set loading state for this specific entry
      setActionLoadingMap(prev => ({ ...prev, [entry.id]: 'pauseResume' }));
      
      let result;
      if (entry.isPaused) {
        result = await resumeTimeTracking(entry.id);
        if (result.success) {
          showNotification('success', 'Timer resumed');
        } else {
          showNotification('error', `Failed to resume timer: ${result.message || 'Unknown error'}`);
        }
      } else {
        result = await pauseTimeTracking(entry.id);
        if (result.success) {
          showNotification('success', 'Timer paused');
        } else {
          showNotification('error', `Failed to pause timer: ${result.message || 'Unknown error'}`);
        }
      }
      
      // Refresh active timers to ensure UI is up-to-date
      await fetchActiveTimers();
    } catch (err) {
      console.error('Error toggling pause/resume:', err);
      showNotification('error', `Error updating timer: ${err.message || 'Unknown error'}`);
    } finally {
      // Clear loading state for this entry
      setActionLoadingMap(prev => {
        const newMap = { ...prev };
        delete newMap[entry.id];
        return newMap;
      });
    }
  }

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-lg font-medium text-secondary-900 mb-4">Time Tracking</h2>

      {activeTimeEntries.length > 0 ? (
        <div className="flex-1 flex flex-col">
          <h3 className="text-sm font-medium text-secondary-900 mb-2">Active Timers</h3>
          <div className="space-y-3">
            {activeTimeEntries.map((entry, index) => {
              const { task, project } = getEntryDetails(entry);
              const isFirstEntry = index === 0;
              const isLoading = actionLoadingMap[entry.id];
              
              return (
                <div 
                  key={entry.id} 
                  className={`p-4 rounded-xl border ${isFirstEntry 
                    ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200' 
                    : 'bg-white border-secondary-200 shadow-sm'}`}
                >
                  <div className="flex items-center mb-3">
                    <div className={`${isFirstEntry ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-600`}>
                      <FiClock className={`${isFirstEntry ? 'h-5 w-5' : 'h-4 w-4'}`} />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-secondary-900 truncate">{task?.title || 'Unknown Task'}</h3>
                      <p className="text-xs text-secondary-500">{project?.name || 'Unknown Project'}</p>
                    </div>
                  </div>

                  <div className="text-center py-2">
                    <div className={`${isFirstEntry ? 'text-3xl' : 'text-2xl'} font-semibold text-secondary-900 font-mono`}>
                      {formatTime(elapsedTimes[entry.id] || 0)}
                    </div>
                    <p className="text-xs text-secondary-500 mt-1">
                      Started at {new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handlePauseResume(entry)}
                      className="flex-1 btn bg-white text-secondary-800 border border-secondary-200 hover:bg-secondary-50 flex items-center justify-center"
                      disabled={loading || isLoading} 
                    >
                      {isLoading === 'pauseResume' ? (
                        <>
                          <FiLoader className="mr-1.5 h-4 w-4 animate-spin" />
                          {entry.isPaused ? 'Resuming...' : 'Pausing...'}
                        </>
                      ) : entry.isPaused ? (
                        <>
                          <FiPlay className="mr-1.5 h-4 w-4" />
                          Resume
                        </>
                      ) : (
                        <>
                          <FiPause className="mr-1.5 h-4 w-4" />
                          Pause
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleStopTracking(entry.id)}
                      className="flex-1 btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center justify-center"
                      disabled={loading || isLoading} 
                    >
                      {isLoading === 'stop' ? (
                        <>
                          <FiLoader className="mr-1.5 h-4 w-4 animate-spin" />
                          Stopping...
                        </>
                      ) : (
                        <>
                          <FiStopCircle className="mr-1.5 h-4 w-4" />
                          Stop
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show recent time entries if there's space */}
          <div className="mt-4 flex-1">
            <h3 className="text-sm font-medium text-secondary-900 mb-2">Recent Time Entries</h3>
            <div className="text-center py-8 bg-secondary-50 rounded-lg">
              <p className="text-secondary-600 text-sm">Completed time entries will appear here</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-secondary-50 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
            <FiClock className="h-8 w-8" />
          </div>
          <h3 className="text-secondary-900 font-medium mb-1">No active tracking</h3>
          <p className="text-secondary-600 text-sm mb-4">
            Start tracking time on any task to see it here
          </p>
          {tasks.length > 0 ? (
            <button 
              onClick={() => startTimeTracking(tasks[0].id)} 
              className="btn btn-primary flex items-center"
            >
              <FiPlay className="mr-1.5 h-4 w-4" />
              Start Tracking
            </button>
          ) : (
            <p className="text-secondary-500 text-sm">No tasks available to track</p>
          )}
        </div>
      )}
    </div>
  )
}

export default TimeTrackingWidget
