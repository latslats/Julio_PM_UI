import { useState, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { FiPlay, FiPause, FiClock, FiStopCircle, FiRefreshCw } from 'react-icons/fi';

/**
 * Component for displaying and managing all currently running timers.
 * 
 * @returns {JSX.Element} The RunningTimersWidget component
 */
const RunningTimersWidget = () => {
  const {
    projects,
    tasks,
    timeEntries,
    stopTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    fetchActiveTimers,
    loading
  } = useProjects();

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Filter to only active time entries (where endTime is null)
  const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null);
  
  // State to track elapsed time for each timer
  const [elapsedTimes, setElapsedTimes] = useState({});

  // Effect to periodically refresh active timers
  useEffect(() => {
    // Initial fetch when component mounts
    const refreshTimers = async () => {
      setRefreshing(true);
      await fetchActiveTimers();
      setLastRefreshed(new Date());
      setRefreshing(false);
    };
    
    refreshTimers();
    
    // Set up interval to refresh every 30 seconds
    const refreshInterval = setInterval(refreshTimers, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchActiveTimers]);

  // Timer effect - Calculate elapsed time for all active entries
  useEffect(() => {
    let intervals = [];

    // Clear previous state if no active entries
    if (activeTimeEntries.length === 0) {
      setElapsedTimes({});
      return () => {};
    }

    // Initialize elapsed times for all active entries
    const initialElapsedTimes = {};
    
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
  }, [activeTimeEntries]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  // Handle pause/resume for a specific timer
  const handlePauseResume = async (entry) => {
    if (entry.isPaused) {
      await resumeTimeTracking(entry.id);
    } else {
      await pauseTimeTracking(entry.id);
    }
  };

  // Handle stopping a specific timer
  const handleStopTracking = async (entryId) => {
    await stopTimeTracking(entryId);
  };

  // Find task and project for a time entry
  const getEntryDetails = (entry) => {
    const task = tasks.find(t => t.id === entry.taskId);
    const project = task ? projects.find(p => p.id === task.projectId) : null;
    return { task, project };
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActiveTimers();
    setLastRefreshed(new Date());
    setRefreshing(false);
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-secondary-900">Running Timers</h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-secondary-500">
            Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button 
            onClick={handleRefresh} 
            className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100"
            disabled={refreshing || loading}
            title="Refresh timers"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {loading && activeTimeEntries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-secondary-50 rounded-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading timers...</p>
        </div>
      ) : activeTimeEntries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-secondary-50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
            <FiClock className="h-6 w-6" />
          </div>
          <h3 className="text-secondary-900 font-medium mb-1">No active timers</h3>
          <p className="text-secondary-600 text-sm">
            Start tracking time on any task to see it here
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-3">
          {activeTimeEntries.map(entry => {
            const { task, project } = getEntryDetails(entry);
            return (
              <div 
                key={entry.id} 
                className="p-3 rounded-lg border border-secondary-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-600 mr-3">
                      <FiClock className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary-900 truncate">{task?.title || 'Unknown Task'}</h3>
                      <p className="text-xs text-secondary-500">{project?.name || 'Unknown Project'}</p>
                    </div>
                  </div>
                  <div className="font-mono font-medium text-secondary-900">
                    {formatTime(elapsedTimes[entry.id] || 0)}
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => handlePauseResume(entry)}
                    className="flex-1 btn-sm bg-white text-secondary-800 border border-secondary-200 hover:bg-secondary-50 flex items-center justify-center"
                    disabled={loading || refreshing}
                  >
                    {entry.isPaused ? (
                      <>
                        <FiPlay className="mr-1 h-3 w-3" />
                        Resume
                      </>
                    ) : (
                      <>
                        <FiPause className="mr-1 h-3 w-3" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleStopTracking(entry.id)}
                    className="flex-1 btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center justify-center"
                    disabled={loading || refreshing}
                  >
                    <FiStopCircle className="mr-1 h-3 w-3" />
                    Stop
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RunningTimersWidget;
