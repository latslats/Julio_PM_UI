import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { FiCalendar, FiClock, FiAlertCircle, FiExternalLink, FiChevronRight, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useWaitingItems } from '../../context/WaitingItemContext';
import WaitingItemForm from './WaitingItemForm';
import { useProjects } from '../../context/ProjectContext';

/**
 * WaitingItemCard component
 * Displays a single waiting item with its details and actions
 * 
 * @param {Object} props - Component props
 * @param {Object} props.item - The waiting item data
 * @param {Function} props.getStatusClass - Function to get status badge class
 * @param {Function} props.getPriorityClass - Function to get priority badge class
 */
const WaitingItemCard = ({ item, getStatusClass, getPriorityClass }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { deleteWaitingItem } = useWaitingItems();
  const { projects } = useProjects();
  
  // Check if deadline is passed
  const isDeadlinePassed = item.deadlineDate && isAfter(new Date(), new Date(item.deadlineDate));
  
  // Handle edit button click
  const handleEditClick = () => {
    setShowEditModal(true);
  };
  
  // Handle form close
  const handleFormClose = () => {
    setShowEditModal(false);
  };
  
  // Handle delete button click
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deleteWaitingItem(item.id, item.projectId);
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusClass(item.status)}`}>
                {item.status === 'pending' ? 'Pending' : 
                 item.status === 'in-progress' ? 'In Progress' : 
                 item.status === 'completed' ? 'Completed' : 
                 item.status === 'cancelled' ? 'Cancelled' : item.status}
              </span>
              
              <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityClass(item.priority)}`}>
                {item.priority === 'high' ? 'High Priority' : 
                 item.priority === 'medium' ? 'Medium Priority' : 
                 item.priority === 'low' ? 'Low Priority' : item.priority}
              </span>
              
              <Link 
                to={`/projects/${item.projectId}`}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                {item.projectName}
              </Link>
            </div>
            
            <h3 className="text-lg font-medium text-secondary-900">{item.requestType}</h3>
            
            <div className="mt-1 text-sm text-secondary-600">
              Requested from <span className="font-medium">{item.requestedFrom}</span>
            </div>
            
            {item.notes && (
              <p className="mt-2 text-sm text-secondary-700 line-clamp-2">{item.notes}</p>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 text-sm">
            <div className="flex items-center text-secondary-600">
              <FiCalendar className="mr-1.5 h-4 w-4" />
              <span>Sent: {format(new Date(item.sentDate), 'MMM d, yyyy')}</span>
            </div>
            
            {item.deadlineDate && (
              <div className={`flex items-center ${isDeadlinePassed ? 'text-red-600' : 'text-secondary-600'}`}>
                <FiClock className="mr-1.5 h-4 w-4" />
                <span>
                  Due: {format(new Date(item.deadlineDate), 'MMM d, yyyy')}
                  {isDeadlinePassed && (
                    <span className="ml-1 font-medium">
                      (Overdue)
                    </span>
                  )}
                </span>
              </div>
            )}
            
            {item.receivedDate && (
              <div className="flex items-center text-green-600">
                <FiCheckCircle className="mr-1.5 h-4 w-4" />
                <span>Received: {format(new Date(item.receivedDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            
            {item.link && (
              <a 
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-primary-600 hover:text-primary-800"
              >
                <FiExternalLink className="mr-1.5 h-4 w-4" />
                <span>View Resource</span>
              </a>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEditClick}
              className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50 rounded-full"
              title="Edit"
            >
              <FiEdit2 className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleDeleteClick}
              className="p-2 text-secondary-600 hover:text-red-600 hover:bg-red-50 rounded-full"
              title="Delete"
            >
              <FiTrash2 className="h-5 w-5" />
            </button>
            
            <Link
              to={`/waiting-items/${item.id}`}
              className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50 rounded-full"
              title="View Details"
            >
              <FiChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && (
        <WaitingItemForm
          onClose={handleFormClose}
          onSubmit={() => setShowEditModal(false)}
          projects={projects}
          existingItem={item}
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
    </>
  );
};

export default WaitingItemCard;
