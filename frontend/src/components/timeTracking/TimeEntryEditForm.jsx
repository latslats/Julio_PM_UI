import { useState, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { format, parseISO } from 'date-fns';
import { FiClock, FiCalendar, FiEdit2, FiX, FiSave } from 'react-icons/fi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

/**
 * TimeEntryEditForm component for editing time entries
 *
 * @param {Object} props - Component props
 * @param {Object} props.timeEntry - The time entry to edit
 * @param {Function} props.onClose - Function to call when the form is closed
 * @param {Function} props.onSave - Function to call when the form is saved
 * @returns {JSX.Element} - The rendered component
 */
const TimeEntryEditForm = ({ timeEntry, onClose, onSave }) => {
  const { tasks, updateTimeEntry, loading } = useProjects();
  const { toast } = useToast();
  const [formErrors, setFormErrors] = useState({});
  const [editableEntry, setEditableEntry] = useState(null);

  // Initialize form with time entry data
  useEffect(() => {
    if (timeEntry) {
      // Format dates for form inputs
      const formattedEntry = {
        ...timeEntry,
        startTime: timeEntry.startTime ? format(new Date(timeEntry.startTime), "yyyy-MM-dd'T'HH:mm") : '',
        endTime: timeEntry.endTime ? format(new Date(timeEntry.endTime), "yyyy-MM-dd'T'HH:mm") : '',
        // Convert seconds to minutes for the form
        duration: timeEntry.duration ? Math.round(timeEntry.duration / 60) : '',
      };
      setEditableEntry(formattedEntry);
    }
  }, [timeEntry]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset previous errors
    setFormErrors({});

    // Validate form
    const errors = {};
    if (!editableEntry.startTime) {
      errors.startTime = 'Start time is required';
    }

    // Validate that endTime is after startTime if both are provided
    if (editableEntry.startTime && editableEntry.endTime) {
      const start = new Date(editableEntry.startTime);
      const end = new Date(editableEntry.endTime);
      if (end < start) {
        errors.endTime = 'End time cannot be before start time';
      }
    }

    // If there are validation errors, show them and stop submission
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Prepare the data for submission - convert formatted dates back to ISO strings
    let updatedEntry = { ...editableEntry };

    // Convert startTime from form format to ISO string
    if (updatedEntry.startTime) {
      const start = new Date(updatedEntry.startTime);
      if (!isNaN(start.getTime())) {
        updatedEntry.startTime = start.toISOString();
      }
    }

    // Convert endTime from form format to ISO string if it exists
    if (updatedEntry.endTime) {
      const end = new Date(updatedEntry.endTime);
      if (!isNaN(end.getTime())) {
        updatedEntry.endTime = end.toISOString();
      }
    } else {
      // If endTime is empty string, set it to null explicitly
      updatedEntry.endTime = null;
    }

    // Calculate duration if start and end times are provided
    if (updatedEntry.startTime && updatedEntry.endTime) {
      const start = new Date(updatedEntry.startTime);
      const end = new Date(updatedEntry.endTime);
      const durationInSeconds = (end.getTime() - start.getTime()) / 1000;
      updatedEntry.duration = durationInSeconds;
    } else if (updatedEntry.duration) {
      // Convert minutes to seconds for storage
      updatedEntry.duration = updatedEntry.duration * 60;
    }

    // Remove any properties that might cause issues with the backend
    const cleanedEntry = {
      startTime: updatedEntry.startTime,
      endTime: updatedEntry.endTime,
      duration: updatedEntry.duration,
      notes: updatedEntry.notes
    };

    console.log('Submitting time entry update:', cleanedEntry);

    // Submit form if validation passes
    try {
      const result = await updateTimeEntry(timeEntry.id, cleanedEntry);
      if (result.success) {
        toast({
          title: "Time Entry Updated",
          description: "Time entry updated successfully.",
        });
        if (onSave) onSave(result.data);
      } else {
        // Handle API error
        setFormErrors({ api: result.message || 'Failed to update time entry' });
        toast({
          variant: "destructive",
          title: "Error Updating Time Entry",
          description: result.message || 'An unexpected error occurred.'
        });
      }
    } catch (err) {
      setFormErrors({ api: err.message || 'An unexpected error occurred' });
      toast({
        variant: "destructive",
        title: "Error Updating Time Entry",
        description: err.message || 'An unexpected error occurred.'
      });
    }
  };

  // If no time entry is provided, don't render anything
  if (!editableEntry) {
    return null;
  }

  // Get the task for this time entry
  const task = tasks.find(t => t.id === editableEntry.taskId);

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {/* Task Information (Read-only) */}
          <div className="flex items-center gap-2 bg-secondary-50/70 rounded-md border border-secondary-100 p-2">
            <div className="h-6 w-6 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
              <FiClock className="h-3 w-3" />
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-900">{task?.title || 'Unknown Task'}</p>
              <p className="text-xs text-secondary-500">{editableEntry.projectName || 'Unknown Project'}</p>
            </div>
          </div>

          {/* Time Inputs - Compact Layout */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Time */}
            <div>
              <Label htmlFor="startTime" className="text-xs font-medium">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={editableEntry.startTime}
                onChange={(e) => setEditableEntry({ ...editableEntry, startTime: e.target.value })}
                className="mt-1 h-8 text-sm"
                required
              />
              {formErrors.startTime && (
                <p className="mt-1 text-xs text-red-600">{formErrors.startTime}</p>
              )}
            </div>

            {/* End Time */}
            <div>
              <Label htmlFor="endTime" className="text-xs font-medium">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={editableEntry.endTime || ''}
                onChange={(e) => setEditableEntry({ ...editableEntry, endTime: e.target.value || null })}
                className="mt-1 h-8 text-sm"
              />
              {formErrors.endTime && (
                <p className="mt-1 text-xs text-red-600">{formErrors.endTime}</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration" className="text-xs font-medium">Duration (minutes)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="duration"
                type="number"
                value={editableEntry.duration || ''}
                onChange={(e) => setEditableEntry({ ...editableEntry, duration: parseFloat(e.target.value) || 0 })}
                className="mt-1 h-8 text-sm"
                min="0"
                step="1"
              />
              <p className="text-xs text-secondary-500 mt-1">
                {editableEntry.startTime && editableEntry.endTime ?
                  'Auto-calculated' :
                  'Manual entry'}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-xs font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={editableEntry.notes || ''}
              onChange={(e) => setEditableEntry({ ...editableEntry, notes: e.target.value })}
              className="mt-1 text-sm"
              placeholder="Add notes about this time entry..."
              rows={2}
            />
          </div>
        </div>

        {/* Display API error if any */}
        {formErrors.api && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            <p>{formErrors.api}</p>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            size="sm"
            className="h-8"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            size="sm"
            className="h-8"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="mr-1.5 h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
};

export default TimeEntryEditForm;
