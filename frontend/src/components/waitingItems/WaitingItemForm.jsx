import { useState, useEffect } from 'react';
import { FiX, FiCalendar } from 'react-icons/fi';
import { useWaitingItems } from '../../context/WaitingItemContext';

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
    
    if (!formData.requestType.trim()) {
      errors.requestType = 'Request type is required';
    } else if (formData.requestType.length > 100) {
      errors.requestType = 'Request type must be less than 100 characters';
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
        setFormErrors({ api: result.message || 'Failed to save request' });
      }
    } catch (err) {
      setFormErrors({ api: err.message || 'An unexpected error occurred' });
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
                <label htmlFor="projectId" className="block text-sm font-medium text-secondary-700 mb-1">
                  Project *
                </label>
                <select
                  id="projectId"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  className={`input w-full ${formErrors.projectId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  required
                  disabled={formLoading}
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {formErrors.projectId && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.projectId}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="requestType" className="block text-sm font-medium text-secondary-700 mb-1">
                  Request Type *
                </label>
                <select
                  id="requestType"
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleChange}
                  className={`input w-full ${formErrors.requestType ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  required
                  disabled={formLoading}
                >
                  <option value="">Select a request type</option>
                  <option value="Information">Information</option>
                  <option value="Approval">Approval</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Resource">Resource</option>
                  <option value="Other">Other</option>
                </select>
                {formErrors.requestType && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.requestType}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="requestedFrom" className="block text-sm font-medium text-secondary-700 mb-1">
                  Requested From *
                </label>
                <input
                  type="text"
                  id="requestedFrom"
                  name="requestedFrom"
                  value={formData.requestedFrom}
                  onChange={handleChange}
                  className={`input w-full ${formErrors.requestedFrom ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="e.g., Client Name, Department, Person"
                  required
                  disabled={formLoading}
                />
                {formErrors.requestedFrom && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.requestedFrom}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-secondary-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="input w-full"
                    disabled={formLoading}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-secondary-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input w-full"
                    disabled={formLoading}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sentDate" className="block text-sm font-medium text-secondary-700 mb-1">
                    Sent Date *
                  </label>
                  <input
                    type="date"
                    id="sentDate"
                    name="sentDate"
                    value={formData.sentDate}
                    onChange={handleChange}
                    className={`input w-full ${formErrors.sentDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    required
                    disabled={formLoading}
                  />
                  {formErrors.sentDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.sentDate}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="deadlineDate" className="block text-sm font-medium text-secondary-700 mb-1">
                    Deadline Date
                  </label>
                  <input
                    type="date"
                    id="deadlineDate"
                    name="deadlineDate"
                    value={formData.deadlineDate}
                    onChange={handleChange}
                    className={`input w-full ${formErrors.deadlineDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={formLoading}
                    min={formData.sentDate}
                  />
                  {formErrors.deadlineDate && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.deadlineDate}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="receivedDate" className="block text-sm font-medium text-secondary-700 mb-1">
                  Received Date
                </label>
                <input
                  type="date"
                  id="receivedDate"
                  name="receivedDate"
                  value={formData.receivedDate}
                  onChange={handleChange}
                  className={`input w-full ${formErrors.receivedDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  disabled={formLoading}
                  min={formData.sentDate}
                />
                {formErrors.receivedDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.receivedDate}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-secondary-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="input w-full h-24"
                  placeholder="Additional details about this request"
                  disabled={formLoading}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-secondary-500 text-right">
                  {formData.notes.length}/500
                </p>
              </div>
              
              <div>
                <label htmlFor="link" className="block text-sm font-medium text-secondary-700 mb-1">
                  Link (Optional)
                </label>
                <input
                  type="url"
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="https://example.com/resource"
                  disabled={formLoading}
                />
              </div>
            </div>
            
            {/* Display API error if any */}
            {formErrors.api && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <p>{formErrors.api}</p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
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
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WaitingItemForm;
