import { useState, useEffect, useRef } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { format, formatDistance, isToday, isYesterday, isSameWeek } from 'date-fns';
import { FiClock, FiEdit2, FiTrash2, FiCalendar, FiFileText, FiCheck, FiX, FiMoreHorizontal, FiPlay, FiPause } from 'react-icons/fi';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import TimeEntryEditForm from './TimeEntryEditForm';
import { useToast } from "@/hooks/use-toast";

/**
 * TimeEntriesList component displays a list of time entries with editing capabilities
 *
 * @param {Object} props - Component props
 * @param {string} props.projectId - Optional project ID to filter time entries
 * @param {string} props.taskId - Optional task ID to filter time entries
 * @param {Array} props.filteredEntries - Optional pre-filtered entries from parent component
 * @returns {JSX.Element} - The rendered component
 */
const TimeEntriesList = ({ projectId, taskId, filteredEntries: externalFilteredEntries }) => {
  const { timeEntries, tasks, projects, deleteTimeEntry, updateTimeEntry, loading, fetchActiveTimers } = useProjects();
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [editingInlineId, setEditingInlineId] = useState(null);
  const [inlineFormData, setInlineFormData] = useState({});
  const inlineFormRef = useRef(null);
  const { toast } = useToast();

  // Group entries by date
  const [groupedEntries, setGroupedEntries] = useState({});

  // Use external filtered entries if provided, otherwise filter internally
  useEffect(() => {
    if (externalFilteredEntries) {
      setFilteredEntries(externalFilteredEntries);
    } else {
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
    }
  }, [timeEntries, tasks, projectId, taskId, externalFilteredEntries]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    // Don't show seconds for consistency with the edit form
    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0')
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

  // Group entries by date
  useEffect(() => {
    const grouped = {};

    filteredEntries.forEach(entry => {
      const date = new Date(entry.startTime);
      const dateKey = format(date, 'yyyy-MM-dd');

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date,
          entries: []
        };
      }

      grouped[dateKey].entries.push(entry);
    });

    setGroupedEntries(grouped);
  }, [filteredEntries]);

  // Get task and project for a time entry
  const getEntryDetails = (entry) => {
    // If the entry already has the details, use them
    if (entry.taskTitle && entry.projectName) {
      return {
        taskTitle: entry.taskTitle,
        projectName: entry.projectName,
        projectColor: entry.projectColor,
        projectId: entry.projectId || (tasks.find(t => t.id === entry.taskId)?.projectId)
      };
    }

    // Otherwise, look them up
    const task = tasks.find(t => t.id === entry.taskId);
    const project = task ? projects.find(p => p.id === task.projectId) : null;

    return {
      taskTitle: task?.title || 'Unknown Task',
      projectName: project?.name || 'Unknown Project',
      projectColor: project?.color || '#0ea5e9',
      projectId: project?.id
    };
  };

  // Format date for display
  const formatDateHeader = (date) => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isSameWeek(date, new Date(), { weekStartsOn: 1 })) {
      return `This Week - ${format(date, 'EEEE')}`;
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  // Start inline editing
  const startInlineEdit = (entry) => {
    const { taskTitle, projectName } = getEntryDetails(entry);

    setInlineFormData({
      duration: entry.duration ? Math.round(entry.duration / 60) : 0, // Convert seconds to minutes
      notes: entry.notes || '',
      taskTitle,
      projectName
    });

    setEditingInlineId(entry.id);

    // Focus the input after rendering
    setTimeout(() => {
      if (inlineFormRef.current) {
        inlineFormRef.current.focus();
      }
    }, 50);
  };

  // Cancel inline editing
  const cancelInlineEdit = () => {
    setEditingInlineId(null);
    setInlineFormData({});
  };

  // Save inline edit
  const saveInlineEdit = async (entry) => {
    try {
      // Convert minutes back to seconds
      const updatedEntry = {
        ...entry,
        duration: inlineFormData.duration * 60,
        notes: inlineFormData.notes
      };

      const result = await updateTimeEntry(entry.id, {
        duration: updatedEntry.duration,
        notes: updatedEntry.notes
      });

      if (result.success) {
        toast({
          title: "Time Entry Updated",
          description: "Time entry updated successfully.",
        });
        setEditingInlineId(null);
      } else {
        toast({
          variant: "destructive",
          title: "Error Updating Time Entry",
          description: result.message || 'An unexpected error occurred.'
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error Updating Time Entry",
        description: err.message || 'An unexpected error occurred.'
      });
    }
  };

  // Render a single time entry row
  const renderTimeEntryRow = (entry) => {
    const { taskTitle, projectName, projectColor, projectId } = getEntryDetails(entry);
    const isActive = !entry.endTime;
    const isEditing = editingInlineId === entry.id;

    // Format times
    const startTime = format(new Date(entry.startTime), 'h:mm a');
    const endTime = entry.endTime ? format(new Date(entry.endTime), 'h:mm a') : null;
    const duration = isActive && entry.formattedElapsed ?
      entry.formattedElapsed :
      formatTime(entry.duration);

    if (isEditing) {
      return (
        <TableRow key={entry.id} className="group hover:bg-secondary-50">
          <TableCell className="py-2 pl-4">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{taskTitle}</span>
              <span className="text-xs text-secondary-500">{projectName}</span>
            </div>
          </TableCell>
          <TableCell className="py-2">
            <div className="flex items-center text-sm">
              {startTime} - {endTime || 'Active'}
            </div>
          </TableCell>
          <TableCell className="py-2">
            <Input
              ref={inlineFormRef}
              type="number"
              value={inlineFormData.duration}
              onChange={(e) => setInlineFormData({...inlineFormData, duration: parseInt(e.target.value) || 0})}
              className="h-7 text-sm w-16"
              min="0"
            />
            <span className="text-xs text-secondary-500 ml-1">min</span>
          </TableCell>
          <TableCell className="py-2">
            <Input
              type="text"
              value={inlineFormData.notes || ''}
              onChange={(e) => setInlineFormData({...inlineFormData, notes: e.target.value})}
              className="h-7 text-sm"
              placeholder="Add notes..."
            />
          </TableCell>
          <TableCell className="py-2 text-right">
            <div className="flex justify-end space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => saveInlineEdit(entry)}
                className="h-7 w-7 text-green-600"
              >
                <FiCheck className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelInlineEdit}
                className="h-7 w-7 text-secondary-500"
              >
                <FiX className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow key={entry.id} className="group hover:bg-secondary-50">
        <TableCell className="py-2 pl-4">
          <div className="flex flex-col">
            <span className="font-medium text-sm">{taskTitle}</span>
            <span className="text-xs text-secondary-500">{projectName}</span>
          </div>
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center text-sm">
            {startTime}
            <span className="mx-1 text-secondary-300">-</span>
            {endTime || (
              <Badge variant="outline" className="h-5 px-1.5 py-0 text-xs bg-primary-50 text-primary-700 border-primary-200">
                Active
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="py-2">
          <div className="text-sm font-medium">
            {duration}
          </div>
        </TableCell>
        <TableCell className="py-2">
          <div className="text-sm text-secondary-600 truncate max-w-[200px]">
            {entry.notes || <span className="text-secondary-400 text-xs italic">No notes</span>}
          </div>
        </TableCell>
        <TableCell className="py-2 text-right">
          <div className="invisible group-hover:visible">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-secondary-500"
                >
                  <FiMoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => startInlineEdit(entry)} className="text-xs">
                  <FiEdit2 className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setEntryToDelete(entry)}
                  className="text-xs text-red-600 focus:text-red-600"
                >
                  <FiTrash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div>
      {/* Time Entries Table */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-6">
          {/* Render entries grouped by date */}
          {Object.keys(groupedEntries)
            .sort((a, b) => new Date(b) - new Date(a)) // Sort dates newest first
            .map(dateKey => {
              const { date, entries } = groupedEntries[dateKey];
              return (
                <div key={dateKey} className="space-y-2">
                  {/* Date header */}
                  <h3 className="text-sm font-medium text-secondary-700 px-1">
                    {formatDateHeader(date)}
                  </h3>

                  {/* Table for this date group */}
                  <div className="rounded-lg border border-secondary-100 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary-50/50">
                          <TableHead className="w-1/4 py-2 pl-4 text-xs font-medium">Task / Project</TableHead>
                          <TableHead className="w-1/5 py-2 text-xs font-medium">Time</TableHead>
                          <TableHead className="w-1/6 py-2 text-xs font-medium">Duration</TableHead>
                          <TableHead className="py-2 text-xs font-medium">Notes</TableHead>
                          <TableHead className="w-[60px] py-2 text-xs font-medium"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map(entry => renderTimeEntryRow(entry))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-secondary-200 rounded-lg bg-secondary-50/30">
          <FiClock className="mx-auto h-8 w-8 text-secondary-300" />
          <p className="mt-2 text-secondary-600 text-sm">No time entries found</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Make changes to the time entry details below.
            </DialogDescription>
          </DialogHeader>
          <TimeEntryEditForm
            timeEntry={selectedEntry}
            onClose={handleCloseEdit}
            onSave={handleSaveEdit}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
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
  );
};

export default TimeEntriesList;
