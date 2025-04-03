import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiClock, FiAlertCircle, FiExternalLink, FiChevronRight, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  
  const statusColor = getStatusClass(item.status);
  const priorityColor = getPriorityClass(item.priority);

  const timeWaiting = item.sentDate ? formatDistanceToNow(new Date(item.sentDate), { addSuffix: false }) : 'N/A';
  const daysOverdue = item.deadlineDate && item.status !== 'Received' && isAfter(new Date(), new Date(item.deadlineDate))
    ? Math.round((new Date() - new Date(item.deadlineDate)) / (1000 * 3600 * 24))
    : null;

  const formattedSentDate = item.sentDate ? format(new Date(item.sentDate), 'MMM d, yyyy') : 'N/A';
  const formattedDeadline = item.deadlineDate ? format(new Date(item.deadlineDate), 'MMM d, yyyy') : 'None';

  return (
    <div>
      <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md border h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <Link to={`/waiting-items/${item.id}`} className="block hover:text-primary-600 flex-1 mr-2">
              <CardTitle className="text-base font-semibold leading-tight">
                {item.requestType}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">From: {item.requestedFrom}</p>
            </Link>
            <div className="flex flex-col items-end space-y-1">
               <Badge variant="outline" style={{ borderColor: priorityColor, color: priorityColor }}>{item.priority || 'Medium'}</Badge>
               <Badge variant="secondary" style={{ backgroundColor: `${statusColor}1A`, color: statusColor }}> 
                 {item.status || 'Pending'}
               </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow pt-0 pb-3 text-sm text-gray-700 space-y-2">
            {item.notes && (
               <p className="line-clamp-2 text-xs italic text-gray-500">Notes: {item.notes}</p>
            )}
            {daysOverdue !== null && (
               <p className="text-red-600 font-medium text-xs flex items-center">
                  <FiAlertCircle className="mr-1" /> Overdue by {daysOverdue} day{daysOverdue > 1 ? 's' : ''}
               </p>
            )}
            {item.link && (
               <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline text-xs flex items-center truncate"
                  onClick={(e) => e.stopPropagation()} // Prevent card link navigation
               >
                 <FiExternalLink className="mr-1 flex-shrink-0" /> <span className="truncate">{item.link}</span>
               </a>
            )}
       
        </CardContent>
         <CardFooter className="bg-gray-50 text-xs text-gray-500 py-2 px-4 border-t flex justify-between items-center">
            <div className="flex items-center" title={`Sent on ${formattedSentDate}`}>
               <FiClock className="mr-1" />
               <span>Waiting: {timeWaiting}</span>
            </div>
            <div className="flex items-center" title={`Deadline: ${formattedDeadline}`}>
               <FiCalendar className="mr-1" />
               <span>Due: {formattedDeadline}</span>
            </div>
            {item.project && (
                <Link 
                   to={`/projects/${item.projectId}`}
                   className="text-xs text-blue-600 hover:underline truncate ml-2"
                   onClick={(e) => e.stopPropagation()} // Prevent card link navigation
                >
                   ({item.projectName})
                </Link>
              )}
            <div className="flex items-center">
              <button
                onClick={handleEditClick}
                className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50 rounded-full"
                title="Edit Request"
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
         </CardFooter>
      </Card>
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
                  <div>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitingItemCard;
