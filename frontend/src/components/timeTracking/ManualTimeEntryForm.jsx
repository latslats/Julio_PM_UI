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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Project Selection */}
      <div>
        <Label htmlFor="project" className="text-sm font-medium">Project *</Label>
        <Select value={selectedProject} onValueChange={handleProjectChange} required>
          <SelectTrigger id="project" className="mt-1">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.project && (
          <p className="mt-1 text-sm text-red-600">{formErrors.project}</p>
        )}
      </div>

      {/* Task Selection */}
      <div>
        <Label htmlFor="taskId" className="text-sm font-medium">Task *</Label>
        <Select
          value={formData.taskId}
          onValueChange={handleTaskChange}
          disabled={!selectedProject}
          required
        >
          <SelectTrigger id="taskId" className="mt-1">
            <SelectValue placeholder={selectedProject ? "Select a task" : "Select a project first"} />
          </SelectTrigger>
          <SelectContent>
            {projectTasks.map(task => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
            <SelectItem value="new-task" className="text-primary-600 font-medium">
              <div className="flex items-center">
                <FiPlus className="mr-1.5 h-4 w-4" />
                Create new task
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {formErrors.taskId && !showNewTaskInput && (
          <p className="mt-1 text-sm text-red-600">{formErrors.taskId}</p>
        )}
      </div>

      {/* New Task Input (conditionally shown) */}
      {showNewTaskInput && (
        <div>
          <Label htmlFor="newTaskTitle" className="text-sm font-medium">New Task Title *</Label>
          <Input
            id="newTaskTitle"
            name="newTaskTitle"
            type="text"
            value={formData.newTaskTitle}
            onChange={handleChange}
            className="mt-1"
            placeholder="Enter task title"
            required
          />
          {formErrors.newTaskTitle && (
            <p className="mt-1 text-sm text-red-600">{formErrors.newTaskTitle}</p>
          )}
        </div>
      )}

      {/* Date Selection */}
      <div>
        <Label htmlFor="entryDate" className="text-sm font-medium">Date *</Label>
        <div className="mt-1">
          <div className="grid grid-cols-3 gap-2">
            {/* Day */}
            <div>
              <Label htmlFor="day" className="text-xs text-secondary-500">Day</Label>
              <Select
                value={formData.entryDate ? format(formData.entryDate, 'd') : format(new Date(), 'd')}
                onValueChange={(value) => handleDateComponentChange('day', value)}
              >
                <SelectTrigger id="day" className="mt-1">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div>
              <Label htmlFor="month" className="text-xs text-secondary-500">Month</Label>
              <Select
                value={formData.entryDate ? format(formData.entryDate, 'M') : format(new Date(), 'M')}
                onValueChange={(value) => handleDateComponentChange('month', value)}
              >
                <SelectTrigger id="month" className="mt-1">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: '1', label: 'January' },
                    { value: '2', label: 'February' },
                    { value: '3', label: 'March' },
                    { value: '4', label: 'April' },
                    { value: '5', label: 'May' },
                    { value: '6', label: 'June' },
                    { value: '7', label: 'July' },
                    { value: '8', label: 'August' },
                    { value: '9', label: 'September' },
                    { value: '10', label: 'October' },
                    { value: '11', label: 'November' },
                    { value: '12', label: 'December' }
                  ].map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div>
              <Label htmlFor="year" className="text-xs text-secondary-500">Year</Label>
              <Select
                value={formData.entryDate ? format(formData.entryDate, 'yyyy') : format(new Date(), 'yyyy')}
                onValueChange={(value) => handleDateComponentChange('year', value)}
              >
                <SelectTrigger id="year" className="mt-1">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Today button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setFormData(prev => ({ ...prev, entryDate: new Date() }))}
          >
            <FiCalendar className="mr-1.5 h-3 w-3" />
            Set to Today
          </Button>
        </div>
      </div>

      {/* Duration Input */}
      <div>
        <Label className="text-sm font-medium">Duration *</Label>
        <div className="flex items-center space-x-2 mt-1">
          <div className="flex-1">
            <div className="relative">
              <Label htmlFor="hours" className="text-xs text-secondary-500">Hours</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="hours"
                  name="hours"
                  type="number"
                  min="0"
                  value={formData.hours}
                  onChange={handleNumberChange}
                  className="pr-12"
                />
                <div className="absolute inset-y-0 right-0 flex items-center mt-5 pr-3 pointer-events-none">
                  <span className="text-xs text-secondary-500">hr</span>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center mt-5 space-x-1 pr-10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-secondary-500 hover:text-secondary-700"
                    onClick={() => {
                      const currentHours = parseInt(formData.hours, 10) || 0;
                      if (currentHours > 0) {
                        setFormData(prev => ({ ...prev, hours: currentHours - 1 }));
                      }
                    }}
                  >
                    <span className="text-lg font-bold">-</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-secondary-500 hover:text-secondary-700"
                    onClick={() => {
                      const currentHours = parseInt(formData.hours, 10) || 0;
                      setFormData(prev => ({ ...prev, hours: currentHours + 1 }));
                    }}
                  >
                    <span className="text-lg font-bold">+</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <Label htmlFor="minutes" className="text-xs text-secondary-500">Minutes</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="minutes"
                  name="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={formData.minutes}
                  onChange={handleNumberChange}
                  className="pr-12"
                />
                <div className="absolute inset-y-0 right-0 flex items-center mt-5 pr-3 pointer-events-none">
                  <span className="text-xs text-secondary-500">min</span>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center mt-5 space-x-1 pr-10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-secondary-500 hover:text-secondary-700"
                    onClick={() => {
                      const currentMinutes = parseInt(formData.minutes, 10) || 0;
                      if (currentMinutes > 0) {
                        setFormData(prev => ({ ...prev, minutes: currentMinutes - 1 }));
                      }
                    }}
                  >
                    <span className="text-lg font-bold">-</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-secondary-500 hover:text-secondary-700"
                    onClick={() => {
                      const currentMinutes = parseInt(formData.minutes, 10) || 0;
                      if (currentMinutes < 59) {
                        setFormData(prev => ({ ...prev, minutes: currentMinutes + 1 }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          minutes: 0,
                          hours: (parseInt(prev.hours, 10) || 0) + 1
                        }));
                      }
                    }}
                  >
                    <span className="text-lg font-bold">+</span>
                  </Button>
                </div>
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
              className="text-xs"
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
          <p className="mt-1 text-sm text-red-600">{formErrors.duration}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="mt-1"
          placeholder="Add any notes about this time entry"
          rows={3}
        />
      </div>

      {/* API Error */}
      {formErrors.api && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {formErrors.api}
        </div>
      )}

      {/* Form Actions */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          <FiX className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <FiSave className="mr-1.5 h-4 w-4" />
          Save Time Entry
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ManualTimeEntryForm;
