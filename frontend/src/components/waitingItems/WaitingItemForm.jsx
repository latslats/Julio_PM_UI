import { useState, useEffect } from 'react';
import { FiX, FiCalendar } from 'react-icons/fi';
import { useWaitingItems } from '../../context/WaitingItemContext';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "../../lib/utils";

/**
 * WaitingItemForm component
 * Form for creating or editing waiting items
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Function to call when form is closed
 * @param {Function} props.onSubmit - Function to call when form is submitted
 * @param {Array} props.projects - List of projects
 * @param {Object} props.existingItem - Existing item data for editing (optional)
 */
const WaitingItemForm = ({ onClose, onSubmit, projects, existingItem = null }) => {
  const { createWaitingItem, updateWaitingItem } = useWaitingItems();
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  // Initialize form data
  const [formData, setFormData] = useState({
    projectId: existingItem?.projectId || '',
    requestType: existingItem?.requestType || '',
    priority: existingItem?.priority || 'medium',
    requestedFrom: existingItem?.requestedFrom || '',
    status: existingItem?.status || 'pending',
    sentDate: existingItem?.sentDate ? new Date(existingItem.sentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    deadlineDate: existingItem?.deadlineDate ? new Date(existingItem.deadlineDate).toISOString().split('T')[0] : '',
    receivedDate: existingItem?.receivedDate ? new Date(existingItem.receivedDate).toISOString().split('T')[0] : '',
    notes: existingItem?.notes || '',
    link: existingItem?.link || ''
  });
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setFormErrors({});
    
    // Validate form
    const errors = {};
    if (!formData.projectId) {
      errors.projectId = 'Project is required';
    }
    
    const allowedRequestTypes = ['Information', 'Approval', 'Feedback', 'Resource', 'Other'];
    if (!formData.requestType) {
      errors.requestType = 'Request type is required';
    } else if (!allowedRequestTypes.includes(formData.requestType)) {
      errors.requestType = 'Request type must be one of the provided options';
    }
    
    if (!formData.requestedFrom.trim()) {
      errors.requestedFrom = 'Requested from is required';
    }
    
    if (!formData.sentDate) {
      errors.sentDate = 'Sent date is required';
    }
    
    // Validate dates if provided
    if (formData.sentDate && formData.deadlineDate) {
      const sentDate = new Date(formData.sentDate);
      const deadlineDate = new Date(formData.deadlineDate);
      if (deadlineDate < sentDate) {
        errors.deadlineDate = 'Deadline date cannot be before sent date';
      }
    }
    
    if (formData.sentDate && formData.receivedDate) {
      const sentDate = new Date(formData.sentDate);
      const receivedDate = new Date(formData.receivedDate);
      if (receivedDate < sentDate) {
        errors.receivedDate = 'Received date cannot be before sent date';
      }
    }
    
    // If there are validation errors, show them and stop submission
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Submit form if validation passes
    setFormLoading(true);
    try {
      let result;
      
      if (existingItem) {
        // Update existing item
        result = await updateWaitingItem(existingItem.id, formData);
      } else {
        // Create new item
        result = await createWaitingItem(formData);
      }
      
      if (result.success) {
        onSubmit();
      } else {
        // Handle API error
        if (result.errors && Array.isArray(result.errors)) {
          setFormErrors({ api: result.errors });
        } else {
          setFormErrors({ api: result.message || 'Failed to save request' });
        }
      }
    } catch (err) {
      console.error('Create/update waiting item error:', err);
      if (err.errors && Array.isArray(err.errors)) {
        setFormErrors({ api: err.errors });
      } else {
        setFormErrors({ api: err.message || 'An unexpected error occurred' });
      }
    } finally {
      setFormLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-secondary-100">
          <h3 className="text-lg font-medium text-secondary-900">
            {existingItem ? 'Edit Request' : 'New Request'}
          </h3>
          <button 
            onClick={onClose}
            className="text-secondary-500 hover:text-secondary-700"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectId" className="block text-sm font-medium text-secondary-700 mb-1">
                  Project *
                </Label>
                <Select 
                  value={formData.projectId || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                  disabled={formLoading}
                  name="projectId"
                >
                  <SelectTrigger id="projectId" className={formErrors.projectId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}>
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
                {formErrors.projectId && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.projectId}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="requestType" className="block text-sm font-medium text-secondary-700 mb-1">
                  Request Type *
                </Label>
                <Select 
                  value={formData.requestType || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, requestType: value }))}
                  disabled={formLoading}
                  name="requestType"
                >
                  <SelectTrigger id="requestType" className={formErrors.requestType ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Information">Information</SelectItem>
                    <SelectItem value="Approval">Approval</SelectItem>
                    <SelectItem value="Feedback">Feedback</SelectItem>
                    <SelectItem value="Resource">Resource</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.requestType && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.requestType}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="requestedFrom" className="block text-sm font-medium text-secondary-700 mb-1">
                  Requested From *
                </Label>
                <Input
                  id="requestedFrom"
                  type="text"
                  name="requestedFrom"
                  value={formData.requestedFrom}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                  placeholder="e.g., Client Name, Department, Person"
                  className={formErrors.requestedFrom ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {formErrors.requestedFrom && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.requestedFrom}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority" className="block text-sm font-medium text-secondary-700 mb-1">
                    Priority
                  </Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    disabled={formLoading}
                    name="priority"
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="status" className="block text-sm font-medium text-secondary-700 mb-1">
                    Status
                  </Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    disabled={formLoading}
                    name="status"
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sentDate" className="block text-sm font-medium text-secondary-700 mb-1">
                    Sent Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.sentDate && "text-muted-foreground",
                          formErrors.sentDate ? "border-red-500" : ""
                        )}
                        disabled={formLoading}
                      >
                        <FiCalendar className="mr-2 h-4 w-4" />
                        {formData.sentDate ? formData.sentDate : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.sentDate ? new Date(formData.sentDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const formattedDate = date.toISOString().split('T')[0];
                            setFormData(prev => ({ ...prev, sentDate: formattedDate }));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {formErrors.sentDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.sentDate}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="deadlineDate" className="block text-sm font-medium text-secondary-700 mb-1">
                    Deadline Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.deadlineDate && "text-muted-foreground"
                        )}
                        disabled={formLoading}
                      >
                        <FiCalendar className="mr-2 h-4 w-4" />
                        {formData.deadlineDate ? formData.deadlineDate : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.deadlineDate ? new Date(formData.deadlineDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const formattedDate = date.toISOString().split('T')[0];
                            setFormData(prev => ({ ...prev, deadlineDate: formattedDate }));
                          }
                        }}
                        initialFocus
                        disabled={(date) => formData.sentDate && date < new Date(formData.sentDate)} // Disable dates before sent date
                      />
                    </PopoverContent>
                  </Popover>
                  {formErrors.deadlineDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.deadlineDate}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="receivedDate" className="block text-sm font-medium text-secondary-700 mb-1">
                  Received Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.receivedDate && "text-muted-foreground"
                      )}
                      disabled={formLoading}
                    >
                      <FiCalendar className="mr-2 h-4 w-4" />
                      {formData.receivedDate ? formData.receivedDate : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.receivedDate ? new Date(formData.receivedDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const formattedDate = date.toISOString().split('T')[0];
                          setFormData(prev => ({ ...prev, receivedDate: formattedDate }));
                        }
                      }}
                      initialFocus
                      disabled={(date) => formData.sentDate && date < new Date(formData.sentDate)} // Disable dates before sent date
                    />
                  </PopoverContent>
                </Popover>
                {formErrors.receivedDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.receivedDate}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="notes" className="block text-sm font-medium text-secondary-700 mb-1">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={formLoading}
                  placeholder="Additional details about this request"
                  rows={4}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-secondary-500 text-right">
                  {formData.notes.length}/500
                </p>
              </div>
              
              <div>
                <Label htmlFor="link" className="block text-sm font-medium text-secondary-700 mb-1">
                  Link (Optional)
                </Label>
                <Input
                  id="link"
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  disabled={formLoading}
                  placeholder="https://example.com/resource"
                />
              </div>
            </div>
            
            {/* Display API error if any */}
            {formErrors.api && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {typeof formErrors.api === 'string' ? (
                  <p>{formErrors.api}</p>
                ) : Array.isArray(formErrors.api) ? (
                  <ul className="list-disc pl-5">
                    {formErrors.api.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                ) : (
                  <p>An error occurred while processing your request.</p>
                )}
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn-primary flex items-center justify-center min-w-[120px]"
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {existingItem ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  existingItem ? 'Update Request' : 'Create Request'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WaitingItemForm;
