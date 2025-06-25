import { useState, useEffect } from 'react'
import { FiPlay, FiPause, FiClock, FiStopCircle, FiLoader, FiPlus, FiTarget } from 'react-icons/fi'
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "../../lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion, AnimatePresence } from 'framer-motion'
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
        let currentElapsedTime = 0;
        
        if (!entry.isPaused && entry.lastResumedAt) {
          // Timer is running - use stored duration + time since resume
          const storedDuration = parseFloat(entry.duration) || 0;
          const now = new Date().getTime();
          const lastResume = new Date(entry.lastResumedAt).getTime();
          const timeSinceResume = (now - lastResume) / 1000;
          currentElapsedTime = storedDuration + Math.max(0, timeSinceResume);
        } else {
          // Timer is paused - just use the stored duration
          currentElapsedTime = parseFloat(entry.duration) || 0;
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

  // Render a single timer card with enhanced visuals
  const renderTimerCard = (entry, isFirstEntry) => {
    const { task, project } = getEntryDetails(entry);
    const isLoading = actionLoadingMap[entry.id];
    const isPausing = isLoading === 'pauseResume';
    const isStopping = isLoading === 'stop';
    const elapsedSeconds = elapsedTimes[entry.id] || 0;
    
    // Calculate progress if task has estimated hours
    const estimatedSeconds = task?.estimatedHours ? task.estimatedHours * 3600 : null;
    const progress = estimatedSeconds ? Math.min((elapsedSeconds / estimatedSeconds) * 100, 100) : 0;
    const isOvertime = estimatedSeconds && elapsedSeconds > estimatedSeconds;

    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={cn(
            "overflow-hidden transition-all duration-200",
            isFirstEntry
            ? 'border-primary/30 shadow-md ring-1 ring-primary/10' 
            : 'border-secondary-200 shadow-sm',
            !entry.isPaused && 'bg-gradient-to-br from-green-50/30 to-blue-50/30',
            entry.isPaused && 'bg-orange-50/30'
          )}
        >
          {/* Active timer indicator bar */}
          {!entry.isPaused && (
            <div className="h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 animate-pulse" />
          )}

          <CardHeader className="flex flex-row items-start space-x-4 pb-3 pt-4 px-4">
            {/* Enhanced status indicator */}
            <div className="relative">
              <div className={cn(
                "p-2.5 rounded-full flex items-center justify-center shadow-sm border transition-all duration-200",
                entry.isPaused 
                  ? "bg-orange-100 text-orange-600 border-orange-200" 
                  : "bg-green-100 text-green-600 border-green-200"
              )}>
                {entry.isPaused ? (
                  <FiPause className="h-4 w-4" />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <FiPlay className="h-4 w-4" />
                  </motion.div>
                )}
              </div>
              
              {/* Pulse animation for active timer */}
              {!entry.isPaused && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-400"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <CardTitle className="text-sm font-medium leading-none truncate">
                {task?.title || 'Unknown Task'}
              </CardTitle>
              <CardDescription className="text-xs text-secondary-500 truncate">
                {project?.name || 'Unknown Project'}
              </CardDescription>
              
              {/* Status badge */}
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  entry.isPaused 
                    ? "bg-orange-100 text-orange-700" 
                    : "bg-green-100 text-green-700"
                )}>
                  {entry.isPaused ? 'Paused' : 'Running'}
                </div>
                
                {isOvertime && (
                  <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Overtime
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 pt-1 pb-4">
            {/* Time display with enhanced typography */}
            <div className="text-center mb-3">
              <motion.div 
                className="text-2xl font-bold text-secondary-900 font-mono tracking-tight"
                animate={!entry.isPaused ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {formatTime(elapsedSeconds)}
              </motion.div>
              <p className="text-xs text-secondary-500 mt-1">
                Started at {new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Progress indicator for estimated time */}
            {estimatedSeconds && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary-600">Progress</span>
                  <div className="flex items-center gap-1">
                    <FiTarget className="h-3 w-3 text-secondary-400" />
                    <span className="text-secondary-500">
                      {task.estimatedHours}h estimated
                    </span>
                  </div>
                </div>
                <Progress 
                  value={progress} 
                  className={cn(
                    "h-2 transition-all duration-300",
                    isOvertime && "bg-red-100"
                  )}
                />
                <div className="text-xs text-secondary-500 text-center">
                  {progress.toFixed(0)}% complete
                  {isOvertime && (
                    <span className="text-red-600 font-medium ml-1">
                      ({((elapsedSeconds - estimatedSeconds) / 3600).toFixed(1)}h over)
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-center space-x-3 px-4 pb-4 pt-0">
            <Button
              type="button"
              variant={entry.isPaused ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePauseResume(entry);
              }}
              disabled={loading || isLoading}
              aria-label={entry.isPaused ? 'Resume Timer' : 'Pause Timer'}
              className="flex-1 h-9"
            >
              {isPausing ? (
                <FiLoader className="h-4 w-4 animate-spin mr-2" />
              ) : entry.isPaused ? (
                <FiPlay className="h-4 w-4 mr-2" />
              ) : (
                <FiPause className="h-4 w-4 mr-2" />
              )}
              {entry.isPaused ? 'Resume' : 'Pause'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStopTracking(entry.id);
              }}
              disabled={loading || isLoading}
              aria-label="Stop Timer"
              className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50"
            >
              {isStopping ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiStopCircle className="h-4 w-4" />
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  // Handle manual time entry form submission
  const handleManualEntrySave = () => {
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

      <AnimatePresence mode="wait">
        {activeTimeEntries.length > 0 ? (
          <motion.div 
            key="active-timers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-y-auto pr-1 -mr-1"
          >
            <div className="space-y-4">
              <AnimatePresence>
                {activeTimeEntries.map((entry, index) => 
                  renderTimerCard(entry, index === 0)
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="m-auto text-center border-dashed border-secondary-200 bg-secondary-50/30 shadow-none">
              <CardContent className="pt-6">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <FiClock className="mx-auto h-10 w-10 text-secondary-400 mb-3" />
                </motion.div>
                <p className="text-sm font-medium text-secondary-700">No active timers</p>
                <p className="text-xs text-secondary-500 mt-1">Start tracking time from a project task.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
