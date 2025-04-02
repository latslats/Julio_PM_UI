import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { 
  FiChevronLeft, FiCalendar, FiClock, FiAlertCircle, FiCheckCircle, 
  FiExternalLink, FiEdit2, FiTrash2, FiPlus, FiX, FiMessageCircle 
} from 'react-icons/fi';
import { useWaitingItems } from '../context/WaitingItemContext';
import { useProjects } from '../context/ProjectContext';
import WaitingItemForm from '../components/waitingItems/WaitingItemForm';

/**
 * WaitingItemDetail page component
 * Displays detailed information about a waiting item and its timeline
 */
const WaitingItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getWaitingItemDetails, addTimelineEvent, deleteWaitingItem } = useWaitingItems();
  const { projects } = useProjects();
  
  const [waitingItem, setWaitingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [eventFormLoading, setEventFormLoading] = useState(false);
  const [eventFormErrors, setEventFormErrors] = useState({});
  const [newEvent, setNewEvent] = useState({
    eventType: 'note',
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
    createdBy: ''
  });
  
  // Fetch waiting item details
  useEffect(() => {
    const fetchItemDetails = async () => {
      setLoading(true);
      try {
        const result = await getWaitingItemDetails(id);
        if (result.success) {
          setWaitingItem(result.data);
        } else {
          // Handle error, maybe redirect
          console.error('Failed to fetch waiting item details:', result.message);
        }
      } catch (err) {
        console.error('Error fetching waiting item details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItemDetails();
  }, [id]);
  
  // Handle edit button click
  const handleEditClick = () => {
    setShowEditModal(true);
  };
  
  // Handle form close
  const handleFormClose = () => {
    setShowEditModal(false);
  };
  
  // Handle form submit
  const handleFormSubmit = async () => {
    setShowEditModal(false);
    // Refresh data after update
    const result = await getWaitingItemDetails(id);
    if (result.success) {
      setWaitingItem(result.data);
    }
  };
  
  // Handle delete button click
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const result = await deleteWaitingItem(id, waitingItem.projectId);
      if (result.success) {
        navigate('/waiting-items');
      }
    } finally {
      setDeleteLoading(false);
    }
  };
  
  // Handle add event button click
  const handleAddEventClick = () => {
    setShowAddEventModal(true);
  };
  
  // Handle event form change
  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    setNewEvent(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (eventFormErrors[name]) {
      setEventFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Handle event form submit
  const handleEventFormSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setEventFormErrors({});
    
    // Validate form
    const errors = {};
    if (!newEvent.eventType) {
      errors.eventType = 'Event type is required';
    }
    
    if (!newEvent.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!newEvent.eventDate) {
      errors.eventDate = 'Event date is required';
    }
    
    // If there are validation errors, show them and stop submission
    if (Object.keys(errors).length > 0) {
      setEventFormErrors(errors);
      return;
    }
    
    // Submit form if validation passes
    setEventFormLoading(true);
    try {
      const result = await addTimelineEvent(id, newEvent);
      
      if (result.success) {
        setShowAddEventModal(false);
        setNewEvent({
          eventType: 'note',
          description: '',
          eventDate: new Date().toISOString().split('T')[0],
          createdBy: ''
        });
        
        // Refresh data after adding event
        const refreshResult = await getWaitingItemDetails(id);
        if (refreshResult.success) {
          setWaitingItem(refreshResult.data);
        }
      } else {
        // Handle API error
        setEventFormErrors({ api: result.message || 'Failed to add timeline event' });
      }
    } catch (err) {
      setEventFormErrors({ api: err.message || 'An unexpected error occurred' });
    } finally {
      setEventFormLoading(false);
    }
  };
  
  // Get status class for badge
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get priority class for badge
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get event type icon
  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'created':
        return <FiPlus className="h-4 w-4" />;
      case 'status-change':
        return <FiAlertCircle className="h-4 w-4" />;
      case 'received':
        return <FiCheckCircle className="h-4 w-4" />;
      case 'note':
        return <FiMessageCircle className="h-4 w-4" />;
      default:
        return <FiMessageCircle className="h-4 w-4" />;
    }
  };
  
  // Check if deadline is passed
  const isDeadlinePassed = waitingItem?.deadlineDate && 
    isAfter(new Date(), new Date(waitingItem.deadlineDate));
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading request details...</p>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!waitingItem) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-secondary-800 mb-2">Request Not Found</h2>
        <p className="text-secondary-600 mb-4">The request you are looking for does not exist.</p>
        <Link to="/waiting-items" className="btn btn-primary">
          Go Back to Waiting Items
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/waiting-items" className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-900">
            <FiChevronLeft className="mr-1 h-4 w-4" />
            Back to Waiting Items
          </Link>
          <h1 className="text-2xl font-semibold text-secondary-900 mt-1">{waitingItem.requestType}</h1>
          <div className="flex items-center mt-1">
            <span className="text-sm text-secondary-600">Requested from {waitingItem.requestedFrom}</span>
            <span className="mx-2 text-secondary-300">•</span>
            <Link 
              to={`/projects/${waitingItem.projectId}`}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              {waitingItem.projectName}
            </Link>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleEditClick}
            className="btn btn-secondary flex items-center"
          >
            <FiEdit2 className="mr-1.5 h-4 w-4" />
            Edit
          </button>
          <button 
            onClick={handleDeleteClick}
            className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center"
          >
            <FiTrash2 className="mr-1.5 h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Request Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-6">
            <h2 className="text-lg font-medium text-secondary-900 mb-4">Request Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-xs font-medium text-secondary-500 uppercase">Status</h3>
                <div className="mt-1">
                  <span className={`px-2 py-1 text-sm rounded-full ${getStatusClass(waitingItem.status)}`}>
                    {waitingItem.status === 'pending' ? 'Pending' : 
                     waitingItem.status === 'in-progress' ? 'In Progress' : 
                     waitingItem.status === 'completed' ? 'Completed' : 
                     waitingItem.status === 'cancelled' ? 'Cancelled' : waitingItem.status}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-medium text-secondary-500 uppercase">Priority</h3>
                <div className="mt-1">
                  <span className={`px-2 py-1 text-sm rounded-full ${getPriorityClass(waitingItem.priority)}`}>
                    {waitingItem.priority === 'high' ? 'High' : 
                     waitingItem.priority === 'medium' ? 'Medium' : 
                     waitingItem.priority === 'low' ? 'Low' : waitingItem.priority}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <h3 className="text-xs font-medium text-secondary-500 uppercase">Sent Date</h3>
                <div className="flex items-center mt-1">
                  <FiCalendar className="h-4 w-4 text-secondary-400 mr-1.5" />
                  <span className="text-sm text-secondary-900">
                    {format(new Date(waitingItem.sentDate), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              
              {waitingItem.deadlineDate && (
                <div>
                  <h3 className="text-xs font-medium text-secondary-500 uppercase">Deadline</h3>
                  <div className={`flex items-center mt-1 ${isDeadlinePassed ? 'text-red-600' : 'text-secondary-900'}`}>
                    <FiClock className="h-4 w-4 mr-1.5" />
                    <span className="text-sm">
                      {format(new Date(waitingItem.deadlineDate), 'MMM d, yyyy')}
                      {isDeadlinePassed && (
                        <span className="ml-1 font-medium">
                          (Overdue)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
              
              {waitingItem.receivedDate && (
                <div>
                  <h3 className="text-xs font-medium text-secondary-500 uppercase">Received</h3>
                  <div className="flex items-center mt-1 text-green-600">
                    <FiCheckCircle className="h-4 w-4 mr-1.5" />
                    <span className="text-sm">
                      {format(new Date(waitingItem.receivedDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {waitingItem.notes && (
              <div className="mb-6">
                <h3 className="text-xs font-medium text-secondary-500 uppercase mb-2">Notes</h3>
                <p className="text-sm text-secondary-700 whitespace-pre-line">
                  {waitingItem.notes}
                </p>
              </div>
            )}
            
            {waitingItem.link && (
              <div>
                <h3 className="text-xs font-medium text-secondary-500 uppercase mb-2">Resource Link</h3>
                <a 
                  href={waitingItem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
                >
                  <FiExternalLink className="mr-1.5 h-4 w-4" />
                  <span>{waitingItem.link}</span>
                </a>
              </div>
            )}
          </div>
          
          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-secondary-900">Timeline</h2>
              <button
                onClick={handleAddEventClick}
                className="btn btn-sm btn-secondary flex items-center"
              >
                <FiPlus className="mr-1 h-3 w-3" />
                Add Event
              </button>
            </div>
            
            {waitingItem.timelineEvents && waitingItem.timelineEvents.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-secondary-200"></div>
                
                {/* Timeline events */}
                <div className="space-y-4">
                  {waitingItem.timelineEvents.map((event, index) => (
                    <div key={event.id} className="flex items-start">
                      <div className={`
                        flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center
                        ${event.eventType === 'created' ? 'bg-blue-100 text-blue-600' :
                          event.eventType === 'status-change' ? 'bg-yellow-100 text-yellow-600' :
                          event.eventType === 'received' ? 'bg-green-100 text-green-600' :
                          'bg-secondary-100 text-secondary-600'}
                      `}>
                        {getEventTypeIcon(event.eventType)}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                          <p className="text-sm font-medium text-secondary-900">
                            {event.eventType === 'created' ? 'Request Created' :
                             event.eventType === 'status-change' ? 'Status Changed' :
                             event.eventType === 'received' ? 'Response Received' :
                             'Note Added'}
                          </p>
                          <p className="text-xs text-secondary-500">
                            {format(new Date(event.eventDate), 'MMM d, yyyy')}
                            {event.createdBy && ` by ${event.createdBy}`}
                          </p>
                        </div>
                        {event.description && (
                          <p className="mt-1 text-sm text-secondary-700">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-secondary-500">No timeline events yet.</p>
            )}
          </div>
        </div>
        
        {/* Right Column - Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-6">
            <h2 className="text-lg font-medium text-secondary-900 mb-4">Request Stats</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-medium text-secondary-500 uppercase">Time Waiting</h3>
                <p className="text-2xl font-semibold text-secondary-900 mt-1">
                  {waitingItem.receivedDate ? (
                    formatDistanceToNow(new Date(waitingItem.sentDate), { 
                      addSuffix: false, 
                      includeSeconds: false 
                    })
                  ) : (
                    formatDistanceToNow(new Date(waitingItem.sentDate), { 
                      addSuffix: false, 
                      includeSeconds: false 
                    })
                  )}
                </p>
                <p className="text-xs text-secondary-500 mt-1">
                  {waitingItem.receivedDate ? 'Total wait time' : 'Waiting since sent date'}
                </p>
              </div>
              
              {waitingItem.deadlineDate && !waitingItem.receivedDate && (
                <div>
                  <h3 className="text-xs font-medium text-secondary-500 uppercase">Time Remaining</h3>
                  <p className={`text-2xl font-semibold mt-1 ${isDeadlinePassed ? 'text-red-600' : 'text-secondary-900'}`}>
                    {isDeadlinePassed ? (
                      `${formatDistanceToNow(new Date(waitingItem.deadlineDate))} overdue`
                    ) : (
                      formatDistanceToNow(new Date(waitingItem.deadlineDate), { 
                        addSuffix: false 
                      })
                    )}
                  </p>
                  <p className="text-xs text-secondary-500 mt-1">
                    Until deadline
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-xs font-medium text-secondary-500 uppercase">Timeline Events</h3>
                <p className="text-2xl font-semibold text-secondary-900 mt-1">
                  {waitingItem.timelineEvents ? waitingItem.timelineEvents.length : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && (
        <WaitingItemForm
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          projects={projects}
          existingItem={waitingItem}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Delete Request</h3>
            <p className="text-secondary-600 mb-4">
              Are you sure you want to delete this request? This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="btn bg-red-500 text-white hover:bg-red-600 flex items-center justify-center min-w-[100px]"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Timeline Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-secondary-100">
              <h3 className="text-lg font-medium text-secondary-900">Add Timeline Event</h3>
              <button 
                onClick={() => setShowAddEventModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <form onSubmit={handleEventFormSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="eventType" className="block text-sm font-medium text-secondary-700 mb-1">
                      Event Type *
                    </label>
                    <select
                      id="eventType"
                      name="eventType"
                      value={newEvent.eventType}
                      onChange={handleEventFormChange}
                      className={`input w-full ${eventFormErrors.eventType ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      required
                      disabled={eventFormLoading}
                    >
                      <option value="note">Note</option>
                      <option value="status-change">Status Change</option>
                      <option value="received">Response Received</option>
                    </select>
                    {eventFormErrors.eventType && (
                      <p className="mt-1 text-sm text-red-600">{eventFormErrors.eventType}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={newEvent.description}
                      onChange={handleEventFormChange}
                      className={`input w-full h-24 ${eventFormErrors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Describe what happened"
                      required
                      disabled={eventFormLoading}
                    />
                    {eventFormErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{eventFormErrors.description}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="eventDate" className="block text-sm font-medium text-secondary-700 mb-1">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      id="eventDate"
                      name="eventDate"
                      value={newEvent.eventDate}
                      onChange={handleEventFormChange}
                      className={`input w-full ${eventFormErrors.eventDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      required
                      disabled={eventFormLoading}
                    />
                    {eventFormErrors.eventDate && (
                      <p className="mt-1 text-sm text-red-600">{eventFormErrors.eventDate}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="createdBy" className="block text-sm font-medium text-secondary-700 mb-1">
                      Created By
                    </label>
                    <input
                      type="text"
                      id="createdBy"
                      name="createdBy"
                      value={newEvent.createdBy}
                      onChange={handleEventFormChange}
                      className="input w-full"
                      placeholder="Your name (optional)"
                      disabled={eventFormLoading}
                    />
                  </div>
                </div>
                
                {/* Display API error if any */}
                {eventFormErrors.api && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <p>{eventFormErrors.api}</p>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="btn btn-secondary"
                    disabled={eventFormLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center justify-center min-w-[120px]"
                    disabled={eventFormLoading}
                  >
                    {eventFormLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      'Add Event'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitingItemDetail;
