import { useState, useEffect } from 'react'
import { FiPlay, FiPause, FiClock, FiStopCircle, FiLoader, FiPlus } from 'react-icons/fi'
import { Button } from "@/components/ui/button";
import { cn } from "../../lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ManualTimeEntryForm from './ManualTimeEntryForm'

// Accept props instead of using context directly
const TimeTrackingWidget = ({
  timeEntries = [], // Default to empty array
  tasks = [],
  projects = [],
  stopTimeTracking = () => {}, // Default to no-op functions
  startTimeTracking = () => {},
  pauseTimeTracking = () => {},
  resumeTimeTracking = () => {},
  loading = false, // Default loading state
  fetchActiveTimers = () => {}
}) => {
  const { toast } = useToast()

  // Find all active entries from the passed prop
  const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null)
  // Use the first active entry for the main display if available
  const activeTimeEntry = activeTimeEntries.length > 0 ? activeTimeEntries[0] : null

  // Track elapsed time for all active entries
  const [elapsedTimes, setElapsedTimes] = useState({})
  // Track loading state for each entry separately
  const [actionLoadingMap, setActionLoadingMap] = useState({})
  // State for manual time entry dialog
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false)

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
        toast({
          title: "Timer Stopped",
          description: "Tracking successfully stopped.",
        });
        // Refresh active timers to ensure UI is up-to-date
        await fetchActiveTimers();
      } else {
        toast({
          variant: "destructive",
          title: "Error Stopping Timer",
          description: result.message || 'Failed to stop timer.'
        });
      }
    } catch (err) {
      console.error('Error stopping timer:', err);
      toast({
        variant: "destructive",
        title: "Error Stopping Timer",
        description: err.message || 'An unexpected error occurred.'
      });
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
          toast({ title: "Timer Resumed" });
        } else {
          toast({
            variant: "destructive",
            title: "Error Resuming Timer",
            description: result.message || 'Failed to resume timer.'
          });
        }
      } else {
        result = await pauseTimeTracking(entry.id);
        if (result.success) {
          toast({ title: "Timer Paused" });
        } else {
          toast({
            variant: "destructive",
            title: "Error Pausing Timer",
            description: result.message || 'Failed to pause timer.'
          });
        }
      }

      // Refresh active timers to ensure UI is up-to-date
      await fetchActiveTimers();
    } catch (err) {
      console.error('Error toggling pause/resume:', err);
      toast({
        variant: "destructive",
        title: "Error Updating Timer",
        description: err.message || 'An unexpected error occurred.'
      });
    } finally {
      // Clear loading state for this entry
      setActionLoadingMap(prev => {
        const newMap = { ...prev };
        delete newMap[entry.id];
        return newMap;
      });
    }
  }

  // Render a single timer card
  const renderTimerCard = (entry, isFirstEntry) => {
    const { task, project } = getEntryDetails(entry);
    const isLoading = actionLoadingMap[entry.id];
    const isPausing = isLoading === 'pauseResume';
    const isStopping = isLoading === 'stop';

    return (
      <Card
        key={entry.id}
        className={cn(
          "overflow-hidden",
          isFirstEntry
          ? 'border-primary/30 shadow-sm' // Subtle primary border/shadow for the first
          : 'border-secondary-200' // Standard border otherwise
        )}
      >
        <CardHeader className="flex flex-row items-start space-x-4 pb-3 pt-4 px-4 bg-secondary-50/50">
          <div className={`p-2 rounded-full bg-white flex items-center justify-center text-primary shadow-sm border border-secondary-100`}>
            <FiClock className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-sm font-medium leading-none truncate">{task?.title || 'Unknown Task'}</CardTitle>
            <CardDescription className="text-xs text-secondary-500 truncate">
              {project?.name || 'Unknown Project'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-3 pb-3 text-center">
          <div className="text-3xl font-semibold text-secondary-900 font-mono tracking-tight">
            {formatTime(elapsedTimes[entry.id] || 0)}
          </div>
          <p className="text-xs text-secondary-500 mt-1">
            Started at {new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 px-4 pb-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePauseResume(entry)}
            disabled={loading || isLoading}
            aria-label={entry.isPaused ? 'Resume Timer' : 'Pause Timer'}
            className="w-10 h-10 p-0 flex items-center justify-center" // Ensure fixed size for icon
          >
            {isPausing ? (
              <FiLoader className="h-4 w-4 animate-spin" />
            ) : entry.isPaused ? (
              <FiPlay className="h-4 w-4" />
            ) : (
              <FiPause className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleStopTracking(entry.id)}
            disabled={loading || isLoading}
            aria-label="Stop Timer"
            className="w-10 h-10 p-0 flex items-center justify-center" // Ensure fixed size for icon
          >
            {isStopping ? (
              <FiLoader className="h-4 w-4 animate-spin" />
            ) : (
              <FiStopCircle className="h-4 w-4" />
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Handle manual time entry form submission
  const handleManualEntrySave = (data) => {
    setShowManualEntryDialog(false);
    // Refresh the time entries list
    fetchActiveTimers();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Add Manual Time Entry Button */}
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center"
          onClick={() => setShowManualEntryDialog(true)}
        >
          <FiPlus className="mr-1.5 h-4 w-4" />
          Add Manual Time Entry
        </Button>
      </div>

      {activeTimeEntries.length > 0 ? (
        <div className="flex-1 flex flex-col overflow-y-auto pr-1 -mr-1"> {/* Added overflow */}
          <div className="space-y-4">
            {activeTimeEntries.map((entry, index) => {
              return renderTimerCard(entry, index === 0);
            })}
          </div>
        </div>
      ) : (
        <Card className="m-auto text-center border-dashed border-secondary-200 bg-secondary-50/30 shadow-none">
          <CardContent className="pt-6">
            <FiClock className="mx-auto h-10 w-10 text-secondary-400 mb-3" />
            <p className="text-sm font-medium text-secondary-700">No active timers</p>
            <p className="text-xs text-secondary-500 mt-1">Start tracking time from a project task.</p>
          </CardContent>
        </Card>
      )}

      {/* Manual Time Entry Dialog */}
      <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Time Entry</DialogTitle>
            <p className="text-sm text-secondary-500 mt-1.5">
              Add time spent on a task retroactively.
            </p>
          </DialogHeader>
          <ManualTimeEntryForm
            onClose={() => setShowManualEntryDialog(false)}
            onSave={handleManualEntrySave}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TimeTrackingWidget
