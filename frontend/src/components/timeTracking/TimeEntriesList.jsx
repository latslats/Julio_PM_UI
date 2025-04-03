import { useState, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { format, formatDistance } from 'date-fns';
import { FiClock, FiEdit2, FiTrash2, FiCalendar, FiFileText } from 'react-icons/fi';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import TimeEntryEditForm from './TimeEntryEditForm';
import { useToast } from "@/hooks/use-toast";

/**
 * TimeEntriesList component displays a list of time entries with editing capabilities
 * 
 * @param {Object} props - Component props
 * @param {string} props.projectId - Optional project ID to filter time entries
 * @param {string} props.taskId - Optional task ID to filter time entries
 * @returns {JSX.Element} - The rendered component
 */
const TimeEntriesList = ({ projectId, taskId }) => {
  const { timeEntries, tasks, projects, deleteTimeEntry, loading, fetchActiveTimers } = useProjects();
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const { toast } = useToast();

  // Filter time entries based on projectId and taskId props
  useEffect(() => {
    let filtered = [...timeEntries];
    
    // Filter by taskId if provided
    if (taskId) {
      filtered = filtered.filter(entry => entry.taskId === taskId);
    } 
    // Filter by projectId if provided
    else if (projectId) {
      const projectTasks = tasks.filter(task => task.projectId === projectId).map(task => task.id);
      filtered = filtered.filter(entry => projectTasks.includes(entry.taskId));
    }
    
    // Sort by start time (most recent first)
    filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    setFilteredEntries(filtered);
  }, [timeEntries, tasks, projectId, taskId]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  // Handle opening the edit dialog
  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setShowEditDialog(true);
  };

  // Handle closing the edit dialog
  const handleCloseEdit = () => {
    setSelectedEntry(null);
    setShowEditDialog(false);
  };

  // Handle saving the edited time entry
  const handleSaveEdit = (updatedEntry) => {
    setShowEditDialog(false);
    setSelectedEntry(null);
    // No need to update state manually as the ProjectContext handles it
  };

  // Handle deleting a time entry
  const handleDelete = async () => {
    if (!entryToDelete) return;
    
    try {
      const result = await deleteTimeEntry(entryToDelete.id);
      if (result.success) {
        toast({
          title: "Time Entry Deleted",
          description: "Time entry deleted successfully.",
        });
        // Refresh active timers if needed
        if (!entryToDelete.endTime) {
          await fetchActiveTimers();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error Deleting Time Entry",
          description: result.message || 'An unexpected error occurred.'
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error Deleting Time Entry",
        description: err.message || 'An unexpected error occurred.'
      });
    } finally {
      setEntryToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Get task and project for a time entry
  const getEntryDetails = (entry) => {
    // If the entry already has the details, use them
    if (entry.taskTitle && entry.projectName) {
      return {
        taskTitle: entry.taskTitle,
        projectName: entry.projectName,
        projectColor: entry.projectColor
      };
    }
    
    // Otherwise, look them up
    const task = tasks.find(t => t.id === entry.taskId);
    const project = task ? projects.find(p => p.id === task.projectId) : null;
    
    return {
      taskTitle: task?.title || 'Unknown Task',
      projectName: project?.name || 'Unknown Project',
      projectColor: project?.color || '#0ea5e9'
    };
  };

  // Render a single time entry card
  const renderTimeEntry = (entry) => {
    const { taskTitle, projectName, projectColor } = getEntryDetails(entry);
    const isActive = !entry.endTime;
    
    return (
      <Card key={entry.id} className={`mb-4 ${isActive ? 'border-primary-200' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-medium">{taskTitle}</CardTitle>
              <div className="text-xs text-secondary-500 mt-1">
                {projectName}
              </div>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(entry)}
                className="h-8 w-8 text-secondary-500 hover:text-secondary-900"
                title="Edit time entry"
              >
                <FiEdit2 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEntryToDelete(entry)}
                    className="h-8 w-8 text-secondary-500 hover:text-red-600"
                    title="Delete time entry"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this time entry. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center text-secondary-500 text-xs mb-1">
                <FiCalendar className="mr-1 h-3 w-3" />
                <span>Start</span>
              </div>
              <div className="text-sm">
                {format(new Date(entry.startTime), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
            <div>
              <div className="flex items-center text-secondary-500 text-xs mb-1">
                <FiCalendar className="mr-1 h-3 w-3" />
                <span>End</span>
              </div>
              <div className="text-sm">
                {entry.endTime ? 
                  format(new Date(entry.endTime), 'MMM d, yyyy h:mm a') : 
                  <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                    Active
                  </Badge>
                }
              </div>
            </div>
            <div>
              <div className="flex items-center text-secondary-500 text-xs mb-1">
                <FiClock className="mr-1 h-3 w-3" />
                <span>Duration</span>
              </div>
              <div className="text-sm font-medium">
                {isActive && entry.formattedElapsed ? 
                  entry.formattedElapsed : 
                  formatTime(entry.duration)
                }
              </div>
            </div>
            {entry.notes && (
              <div>
                <div className="flex items-center text-secondary-500 text-xs mb-1">
                  <FiFileText className="mr-1 h-3 w-3" />
                  <span>Notes</span>
                </div>
                <div className="text-sm">
                  {entry.notes}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      {/* Time Entries List */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-4">
          {filteredEntries.map(entry => renderTimeEntry(entry))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FiClock className="mx-auto h-10 w-10 text-secondary-300" />
          <p className="mt-2 text-secondary-600">No time entries found</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <TimeEntryEditForm 
            timeEntry={selectedEntry} 
            onClose={handleCloseEdit} 
            onSave={handleSaveEdit} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeEntriesList;
