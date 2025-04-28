import { useState, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { format, parseISO, addHours, addMinutes, startOfDay } from 'date-fns';
import { FiClock, FiCalendar, FiSave, FiX, FiPlus } from 'react-icons/fi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DialogFooter } from "@/components/ui/dialog";

/**
 * ManualTimeEntryForm component for adding manual time entries
 *
 * @param {Object} props - Component props
 * @param {string} props.projectId - Optional pre-selected project ID
 * @param {Function} props.onClose - Function to call when the form is closed
 * @param {Function} props.onSave - Function to call when the form is saved
 * @returns {JSX.Element} - The rendered component
 */
const ManualTimeEntryForm = ({ projectId, onClose, onSave }) => {
  const { projects, tasks, createManualTimeEntry, createTask, loading } = useProjects();
  const { toast } = useToast();
  const [formErrors, setFormErrors] = useState({});
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [formData, setFormData] = useState({
    taskId: '',
    entryDate: new Date(),
    hours: 0,
    minutes: 0,
    notes: '',
    newTaskTitle: ''
  });

  const [showNewTaskInput, setShowNewTaskInput] = useState(false);

  // Filter tasks based on selected project
  const projectTasks = tasks.filter(task => task.projectId === selectedProject);

  // Calculate duration in seconds
  const durationInSeconds = (formData.hours * 3600) + (formData.minutes * 60);

  // Handle project selection
  const handleProjectChange = (value) => {
    setSelectedProject(value);
    // Clear task selection when project changes
    setFormData(prev => ({ ...prev, taskId: '' }));
    setShowNewTaskInput(false);
  };

  // Handle task selection
  const handleTaskChange = (value) => {
    if (value === 'new-task') {
      setShowNewTaskInput(true);
      setFormData(prev => ({ ...prev, taskId: '' }));
    } else {
      setShowNewTaskInput(false);
      setFormData(prev => ({ ...prev, taskId: value }));
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle number input changes with validation
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);

    if (isNaN(numValue)) {
      setFormData(prev => ({ ...prev, [name]: 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: numValue }));
    }
  };

  // Handle date component change
  const handleDateComponentChange = (component, value) => {
    const currentDate = formData.entryDate || new Date();
    const newDate = new Date(currentDate);

    switch (component) {
      case 'day':
        newDate.setDate(parseInt(value, 10));
        break;
      case 'month':
        newDate.setMonth(parseInt(value, 10) - 1);
        break;
      case 'year':
        newDate.setFullYear(parseInt(value, 10));
        break;
      default:
        break;
    }

    setFormData(prev => ({ ...prev, entryDate: newDate }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = {};
    if (!selectedProject) errors.project = 'Project is required';

    // Validate task selection or new task input
    if (showNewTaskInput) {
      if (!formData.newTaskTitle.trim()) {
        errors.newTaskTitle = 'Task title is required';
      }
    } else if (!formData.taskId) {
      errors.taskId = 'Task is required';
    }

    // Validate duration
    if (durationInSeconds <= 0) {
      errors.duration = 'Duration must be greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      let taskId = formData.taskId;

      // If creating a new task, do that first
      if (showNewTaskInput) {
        const createTaskResult = await createTask({
          title: formData.newTaskTitle,
          projectId: selectedProject,
          status: 'not-started',
          priority: 'medium'
        });

        if (!createTaskResult.success) {
          setFormErrors({ api: createTaskResult.message || 'Failed to create task' });
          toast({
            variant: "destructive",
            title: "Error Creating Task",
            description: createTaskResult.message || 'An unexpected error occurred.'
          });
          return;
        }

        taskId = createTaskResult.data.id;
      }

      // Calculate start and end times based on the selected date and duration
      const entryDate = formData.entryDate || new Date();
      const startTime = startOfDay(entryDate);
      const endTime = addMinutes(addHours(startTime, formData.hours), formData.minutes);

      // Create time entry
      const result = await createManualTimeEntry({
        taskId: taskId,
        startTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(endTime, "yyyy-MM-dd'T'HH:mm"),
        duration: durationInSeconds,
        notes: formData.notes
      });

      if (result.success) {
        toast({
          title: "Time Entry Added",
          description: "Manual time entry added successfully.",
        });
        if (onSave) onSave(result.data);
      } else {
        // Handle API error
        setFormErrors({ api: result.message || 'Failed to add time entry' });
        toast({
          variant: "destructive",
          title: "Error Adding Time Entry",
          description: result.message || 'An unexpected error occurred.'
        });
      }
    } catch (err) {
      setFormErrors({ api: err.message || 'An unexpected error occurred' });
      toast({
        variant: "destructive",
        title: "Error Adding Time Entry",
        description: err.message || 'An unexpected error occurred.'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Project Selection */}
      <div>
        <Label htmlFor="project" className="text-xs font-medium">Project *</Label>
        <Select value={selectedProject} onValueChange={handleProjectChange} required>
          <SelectTrigger id="project" className="mt-1 h-8 text-sm">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id} className="text-sm">
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.project && (
          <p className="mt-1 text-xs text-red-600">{formErrors.project}</p>
        )}
      </div>

      {/* Task Selection */}
      <div>
        <Label htmlFor="taskId" className="text-xs font-medium">Task *</Label>
        <Select
          value={formData.taskId}
          onValueChange={handleTaskChange}
          disabled={!selectedProject}
          required
        >
          <SelectTrigger id="taskId" className="mt-1 h-8 text-sm">
            <SelectValue placeholder={selectedProject ? "Select a task" : "Select a project first"} />
          </SelectTrigger>
          <SelectContent>
            {projectTasks.map(task => (
              <SelectItem key={task.id} value={task.id} className="text-sm">
                {task.title}
              </SelectItem>
            ))}
            <SelectItem value="new-task" className="text-primary font-medium text-sm">
              <div className="flex items-center">
                <FiPlus className="mr-1.5 h-3.5 w-3.5" />
                Create new task
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {formErrors.taskId && !showNewTaskInput && (
          <p className="mt-1 text-xs text-red-600">{formErrors.taskId}</p>
        )}
      </div>

      {/* New Task Input (conditionally shown) */}
      {showNewTaskInput && (
        <div>
          <Label htmlFor="newTaskTitle" className="text-xs font-medium">New Task Title *</Label>
          <Input
            id="newTaskTitle"
            name="newTaskTitle"
            type="text"
            value={formData.newTaskTitle}
            onChange={handleChange}
            className="mt-1 h-8 text-sm"
            placeholder="Enter task title"
            required
          />
          {formErrors.newTaskTitle && (
            <p className="mt-1 text-xs text-red-600">{formErrors.newTaskTitle}</p>
          )}
        </div>
      )}

      {/* Date Selection - Simplified */}
      <div>
        <Label htmlFor="entryDate" className="text-xs font-medium">Date *</Label>
        <div className="mt-1 flex gap-2">
          <div className="grid grid-cols-3 gap-2 flex-1">
            {/* Day */}
            <Select
              value={formData.entryDate ? format(formData.entryDate, 'd') : format(new Date(), 'd')}
              onValueChange={(value) => handleDateComponentChange('day', value)}
            >
              <SelectTrigger id="day" className="h-8 text-sm">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <SelectItem key={day} value={day.toString()} className="text-sm">
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month */}
            <Select
              value={formData.entryDate ? format(formData.entryDate, 'M') : format(new Date(), 'M')}
              onValueChange={(value) => handleDateComponentChange('month', value)}
            >
              <SelectTrigger id="month" className="h-8 text-sm">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: '1', label: 'Jan' },
                  { value: '2', label: 'Feb' },
                  { value: '3', label: 'Mar' },
                  { value: '4', label: 'Apr' },
                  { value: '5', label: 'May' },
                  { value: '6', label: 'Jun' },
                  { value: '7', label: 'Jul' },
                  { value: '8', label: 'Aug' },
                  { value: '9', label: 'Sep' },
                  { value: '10', label: 'Oct' },
                  { value: '11', label: 'Nov' },
                  { value: '12', label: 'Dec' }
                ].map(month => (
                  <SelectItem key={month.value} value={month.value} className="text-sm">
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year */}
            <Select
              value={formData.entryDate ? format(formData.entryDate, 'yyyy') : format(new Date(), 'yyyy')}
              onValueChange={(value) => handleDateComponentChange('year', value)}
            >
              <SelectTrigger id="year" className="h-8 text-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <SelectItem key={year} value={year.toString()} className="text-sm">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Today button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFormData(prev => ({ ...prev, entryDate: new Date() }))}
          >
            <FiCalendar className="mr-1 h-3 w-3" />
            Today
          </Button>
        </div>
      </div>

      {/* Duration Input - Simplified */}
      <div>
        <Label className="text-xs font-medium">Duration *</Label>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1">
            <div className="relative">
              <Input
                id="hours"
                name="hours"
                type="number"
                min="0"
                value={formData.hours}
                onChange={handleNumberChange}
                className="h-8 text-sm pr-8"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <span className="text-xs text-secondary-500">hr</span>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <Input
                id="minutes"
                name="minutes"
                type="number"
                min="0"
                max="59"
                value={formData.minutes}
                onChange={handleNumberChange}
                className="h-8 text-sm pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <span className="text-xs text-secondary-500">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick duration buttons */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[15, 30, 45, 60].map(minutes => (
            <Button
              key={minutes}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                setFormData(prev => ({ ...prev, hours, minutes: mins }));
              }}
            >
              {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
            </Button>
          ))}
        </div>

        {formErrors.duration && (
          <p className="mt-1 text-xs text-red-600">{formErrors.duration}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="text-xs font-medium">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="mt-1 text-sm"
          placeholder="Add notes about this time entry..."
          rows={2}
        />
      </div>

      {/* API Error */}
      {formErrors.api && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          <p>{formErrors.api}</p>
        </div>
      )}

      {/* Form Actions */}
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
  );
};

export default ManualTimeEntryForm;
