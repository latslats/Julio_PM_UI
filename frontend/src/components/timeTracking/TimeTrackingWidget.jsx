import { useState, useEffect } from 'react'
import { FiPlay, FiPause, FiClock, FiStopCircle, FiLoader, FiTarget, FiTrash2, FiCornerDownRight } from 'react-icons/fi'
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "../../lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { motion, AnimatePresence } from 'framer-motion'
import { formatTime, calculateElapsedTime, calculateTimeProgress, isOvertime, formatOvertime } from '@/lib/timeUtils'

// Accept props instead of using context directly
const TimeTrackingWidget = ({
  timeEntries = [], // Default to empty array
  tasks = [],
  projects = [],
  stopTimeTracking = () => {}, // Default to no-op functions
  startTimeTracking = () => {},
  pauseTimeTracking = () => {},
  resumeTimeTracking = () => {},
  cleanupTimeEntry = () => {}, // Function to cleanup/clear time entries
  loading = false, // Default loading state
  fetchActiveTimers = () => {}
}) => {
  const { toast } = useToast()

  // Find all active entries from the passed prop
  const activeTimeEntries = timeEntries.filter(entry => entry.endTime === null)
  
  // Debug: Check for duplicates
  const taskCounts = activeTimeEntries.reduce((acc, entry) => {
    acc[entry.taskId] = (acc[entry.taskId] || 0) + 1;
    return acc;
  }, {});
  
  const duplicates = Object.entries(taskCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.warn('Duplicate active time entries detected:', duplicates, activeTimeEntries);
  }
  
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

  // Group active time entries by project
  const getGroupedTimeEntries = () => {
    const grouped = {};
    
    activeTimeEntries.forEach(entry => {
      const { task, project } = getEntryDetails(entry);
      const projectId = project?.id || 'unknown';
      const projectName = project?.name || 'Unknown Project';
      
      if (!grouped[projectId]) {
        grouped[projectId] = {
          project: project,
          projectName: projectName,
          entries: []
        };
      }
      
      grouped[projectId].entries.push({
        ...entry,
        task,
        project
      });
    });
    
    // Sort entries within each project by creation time (newest first)
    Object.values(grouped).forEach(group => {
      group.entries.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    });
    
    return grouped;
  }

  // Timer effect - Calculate elapsed time for all active entries using standardized utilities
  useEffect(() => {
    let intervals = [];

    // Clear previous state if no active entries
    if (activeTimeEntries.length === 0) {
      setElapsedTimes({});
      return () => {};
    }

    // Initialize elapsed times for all active entries
    activeTimeEntries.forEach(entry => {
      const updateElapsedTime = () => {
        const elapsed = calculateElapsedTime(entry);
        setElapsedTimes(prev => ({
          ...prev,
          [entry.id]: elapsed
        }));
      };

      // Calculate once immediately
      updateElapsedTime();

      // If entry is running (not paused), update every second
      if (!entry.isPaused) {
        const interval = setInterval(updateElapsedTime, 1000);
        intervals.push(interval);
      }
    });

    // Cleanup function to clear all intervals
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [activeTimeEntries])


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

  // Handle cleanup (clear) for a specific entry
  const handleCleanup = async (entry) => {
    try {
      // Set loading state for this specific entry
      setActionLoadingMap(prev => ({ ...prev, [entry.id]: 'cleanup' }));

      const result = await cleanupTimeEntry(entry.id);
      if (result.success) {
        toast({
          title: "Timer Cleared",
          description: "Time entry has been cleared successfully.",
        });
        // Refresh active timers to ensure UI is up-to-date
        await fetchActiveTimers();
      } else {
        toast({
          variant: "destructive",
          title: "Error Clearing Timer",
          description: result.message || 'Failed to clear timer.'
        });
      }
    } catch (err) {
      console.error('Error clearing timer:', err);
      toast({
        variant: "destructive",
        title: "Error Clearing Timer",
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

  // Generate a color for the project based on its name/color property (same as Dashboard recent activity)
  const getProjectColor = (project) => {
    if (project?.color) {
      return project.color
    }
    // Generate a consistent color based on project name
    const colors = [
      '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', 
      '#F59E0B', '#EF4444', '#EC4899', '#6366F1'
    ]
    const hash = project?.name?.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  // Render project header
  const renderProjectHeader = (projectGroup) => {
    const projectColor = getProjectColor(projectGroup.project)
    const entryCount = projectGroup.entries.length
    
    return (
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border"
          style={{
            backgroundColor: `${projectColor}15`,
            borderColor: `${projectColor}40`,
            color: projectColor
          }}
        >
          <div 
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: projectColor }}
          ></div>
          {projectGroup.projectName}
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/60 rounded-full">
            {entryCount}
          </span>
        </div>
      </div>
    )
  }

  // Render a single timer card with enhanced visuals (now for nested display)
  const renderTimerCard = (entryWithDetails, isFirstInProject = false) => {
    const { task, project, ...entry } = entryWithDetails;
    const isLoading = actionLoadingMap[entry.id];
    const isPausing = isLoading === 'pauseResume';
    const isStopping = isLoading === 'stop';
    const isCleaningUp = isLoading === 'cleanup';
    const elapsedSeconds = elapsedTimes[entry.id] || 0;
    
    // Calculate progress if task has estimated hours using standardized utilities
    const progress = calculateTimeProgress(elapsedSeconds, task?.estimatedHours);
    const isOvertimeStatus = isOvertime(elapsedSeconds, task?.estimatedHours);

    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="group">
          {/* Hierarchical connector */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1">
              <FiCornerDownRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              {!isFirstInProject && (
                <div className="w-px h-6 bg-border/40 mt-1"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Task title and time display */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {task?.title || 'Unknown Task'}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <motion.div 
                        className="text-lg font-bold text-foreground font-mono tracking-tight"
                        animate={!entry.isPaused ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {formatTime(elapsedSeconds)}
                      </motion.div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {/* Status badges (no project badge since it's shown in header) */}
                    <div className="flex items-center gap-2">
                      {/* Status badge */}
                      <div className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium border",
                        entry.isPaused 
                          ? "bg-orange-100 text-orange-700 border-orange-200" 
                          : "bg-green-100 text-green-700 border-green-200"
                      )}>
                        {entry.isPaused ? 'Paused' : 'Running'}
                      </div>
                      
                      {isOvertimeStatus && (
                        <div className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          Overtime
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
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
                        className="h-8 w-8 p-0"
                      >
                        {isPausing ? (
                          <FiLoader className="h-3.5 w-3.5 animate-spin" />
                        ) : entry.isPaused ? (
                          <FiPlay className="h-3.5 w-3.5" />
                        ) : (
                          <FiPause className="h-3.5 w-3.5" />
                        )}
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
                        className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {isStopping ? (
                          <FiLoader className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FiStopCircle className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      {/* Cleanup button - only show for paused timers */}
                      {entry.isPaused && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCleanup(entry);
                          }}
                          disabled={loading || isLoading}
                          aria-label="Clear Timer"
                          className="h-8 w-8 p-0 text-orange-600 border-orange-200 hover:bg-orange-50"
                          title="Clear this timer"
                        >
                          {isCleaningUp ? (
                            <FiLoader className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FiTrash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress indicator for estimated time */}
                  {task?.estimatedHours && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <div className="flex items-center gap-1">
                          <FiTarget className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {task.estimatedHours}h estimated
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={progress} 
                        className={cn(
                          "h-1.5 transition-all duration-300",
                          isOvertimeStatus && "bg-red-100"
                        )}
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        {progress.toFixed(0)}% complete
                        {isOvertimeStatus && (
                          <span className="text-red-600 font-medium ml-1">
                            ({formatOvertime(elapsedSeconds, task.estimatedHours)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }


  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {activeTimeEntries.length > 0 ? (
          <motion.div 
            key="active-timers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-y-auto"
          >
            <div className="space-y-6">
              <AnimatePresence>
                {Object.entries(getGroupedTimeEntries()).map(([projectId, projectGroup]) => (
                  <motion.div
                    key={projectId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Project header */}
                    {renderProjectHeader(projectGroup)}
                    
                    {/* Tasks under this project */}
                    <div className="space-y-2">
                      {projectGroup.entries.map((entry, index) => 
                        renderTimerCard(entry, index === 0)
                      )}
                    </div>
                  </motion.div>
                ))}
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
            <div className="text-center py-8 px-2">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <FiClock className="h-6 w-6 text-muted-foreground" />
                </motion.div>
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No active timers</h3>
              <p className="text-xs text-muted-foreground">Start tracking time from a project task.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TimeTrackingWidget
