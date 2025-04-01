import { useState, useEffect } from 'react'
import { useProjects } from '../../context/ProjectContext'
import { FiPlay, FiPause, FiClock, FiStopCircle } from 'react-icons/fi'

const TimeTrackingWidget = () => {
  const {
    projects,
    tasks,
    timeEntries,
    stopTimeTracking,
    startTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    loading
  } = useProjects()

  // Find all active entries from the context state
  const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null)
  // Use the first active entry for the main display if available
  const activeTimeEntry = activeTimeEntries.length > 0 ? activeTimeEntries[0] : null

  const [elapsedTime, setElapsedTime] = useState(0)

  // Find task and project if there's an active time entry
  const task = activeTimeEntry ? tasks.find(t => t.id === activeTimeEntry.taskId) : null
  const project = task ? projects.find(p => p.id === task.projectId) : null

  // Timer effect - Calculate elapsed time based on context data
  useEffect(() => {
    let interval = null

    if (activeTimeEntry) {
      const calculateElapsed = () => {
        let currentElapsedTime = parseFloat(activeTimeEntry.totalPausedDuration) || 0;
        if (!activeTimeEntry.isPaused && activeTimeEntry.lastResumedAt) {
          const now = new Date().getTime();
          const lastResume = new Date(activeTimeEntry.lastResumedAt).getTime();
          currentElapsedTime += (now - lastResume) / 1000;
        }
        setElapsedTime(Math.floor(currentElapsedTime));
      };

      calculateElapsed(); // Calculate once immediately

      // If it's running, update every second
      if (!activeTimeEntry.isPaused) {
        interval = setInterval(calculateElapsed, 1000);
      }
    } else {
      setElapsedTime(0); // Reset if no active timer
    }

    return () => {
      if (interval) clearInterval(interval)
    }
    // Depend on activeTimeEntry properties that change timer status
  }, [activeTimeEntry?.id, activeTimeEntry?.isPaused, activeTimeEntry?.lastResumedAt, activeTimeEntry?.totalPausedDuration])

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

  // Handle stop tracking
  const handleStopTracking = async () => {
    if (activeTimeEntry) {
      // No need for local state change, context update will trigger re-render
      await stopTimeTracking(activeTimeEntry.id)
    }
  }

  // Handle pause/resume using context functions
  const handlePauseResume = async () => {
    if (!activeTimeEntry) return;

    if (activeTimeEntry.isPaused) {
      await resumeTimeTracking(activeTimeEntry.id);
    } else {
      await pauseTimeTracking(activeTimeEntry.id);
    }
    // No need to call setIsPaused, context update handles it
  }

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-lg font-medium text-secondary-900 mb-4">Time Tracking</h2>

      {activeTimeEntries.length > 0 ? (
        <div className="flex-1 flex flex-col">
          {/* Display the first active timer in detail */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-600">
                <FiClock className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-secondary-900 truncate">{task?.title || 'Unknown Task'}</h3>
                <p className="text-xs text-secondary-500">{project?.name || 'Unknown Project'}</p>
              </div>
            </div>

            <div className="text-center py-3">
              <div className="text-3xl font-semibold text-secondary-900 font-mono">
                {formatTime(elapsedTime)}
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                Started at {new Date(activeTimeEntry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="flex space-x-2 mt-2">
              <button
                onClick={handlePauseResume}
                className="flex-1 btn bg-white text-secondary-800 border border-secondary-200 hover:bg-secondary-50 flex items-center justify-center"
                disabled={loading || !activeTimeEntry} // Disable if loading or no active entry
              >
                {activeTimeEntry?.isPaused ? (
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
                onClick={handleStopTracking}
                className="flex-1 btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center justify-center"
                disabled={loading || !activeTimeEntry} // Disable if loading or no active entry
              >
                <FiStopCircle className="mr-1.5 h-4 w-4" />
                Stop
              </button>
            </div>
          </div>
          
          {/* If there are additional active timers, show them in a more compact format */}
          {activeTimeEntries.length > 1 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-secondary-900 mb-2">Other Active Timers</h3>
              <div className="space-y-2">
                {activeTimeEntries.slice(1).map(entry => {
                  const entryTask = tasks.find(t => t.id === entry.taskId);
                  const entryProject = entryTask ? projects.find(p => p.id === entryTask.projectId) : null;
                  return (
                    <div key={entry.id} className="p-3 rounded-lg border border-secondary-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-600 mr-3">
                            <FiClock className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-secondary-900 truncate">{entryTask?.title || 'Unknown Task'}</h3>
                            <p className="text-xs text-secondary-500">{entryProject?.name || 'Unknown Project'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTimeEntries.length === 1 && (
            <div className="mt-4 flex-1">
              <h3 className="text-sm font-medium text-secondary-900 mb-2">Recent Time Entries</h3>
              <div className="text-center py-8 bg-secondary-50 rounded-lg">
                <p className="text-secondary-600 text-sm">Time entries will appear here</p>
              </div>
            </div>
          )}
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
