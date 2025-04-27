import { useState, useEffect } from 'react';
import { useWaitingItems } from '../context/WaitingItemContext';
import { useProjects } from '../context/ProjectContext';
import { FiPlus, FiFilter, FiSearch, FiClock, FiCalendar, FiAlertCircle, FiCheckCircle, FiChevronLeft } from 'react-icons/fi';
import { format, formatDistanceToNow } from 'date-fns';

// Components
import WaitingItemCard from '../components/waitingItems/WaitingItemCard';
import WaitingItemForm from '../components/waitingItems/WaitingItemForm';
import WaitingItemStats from '../components/waitingItems/WaitingItemStats';

/**
 * WaitingItems page component
 * Displays a list of waiting items with filtering and creation capabilities
 */
const WaitingItems = () => {
  const { waitingItems, loading, fetchWaitingItems, fetchStats, stats } = useWaitingItems();
  const { projects, loading: projectsLoading } = useProjects();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Fetch waiting items and stats on component mount
  useEffect(() => {
    fetchWaitingItems();
    fetchStats();
  }, []);
  
  // Filtered waiting items
  const filteredItems = waitingItems.filter(item => {
    // Project filter
    if (selectedProject && item.projectId !== selectedProject) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    
    // Priority filter
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
      return false;
    }
    
    // Search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.requestType.toLowerCase().includes(searchLower) ||
        item.requestedFrom.toLowerCase().includes(searchLower) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower)) ||
        (item.projectName && item.projectName.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });
  
  // Handle project filter change
  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);
    fetchStats(projectId || null);
  };
  
  // Handle add button click
  const handleAddClick = () => {
    setShowAddModal(true);
  };
  
  // Handle form close
  const handleFormClose = () => {
    setShowAddModal(false);
  };
  
  // Handle form submit
  const handleFormSubmit = async () => {
    setShowAddModal(false);
    // The actual submission is handled in the form component
    // We just need to close the modal here
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
  
  // Loading state
  if (loading && projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading waiting items...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-900 mb-1">
            <FiChevronLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-secondary-900">Waiting On</h1>
          <p className="text-secondary-600">
            Track and manage items you're waiting on from external parties
          </p>
        </div>
        
        <button
          onClick={handleAddClick}
          className="btn btn-primary flex items-center"
        >
          <FiPlus className="mr-1.5 h-4 w-4" />
          New Request
        </button>
      </div>
      
      {/* Stats Cards */}
      <WaitingItemStats stats={stats} />
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="project-filter" className="block text-sm font-medium text-secondary-700 mb-1">
            Project
          </label>
          <select
            id="project-filter"
            value={selectedProject}
            onChange={handleProjectChange}
            className="input w-full"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-secondary-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="priority-filter" className="block text-sm font-medium text-secondary-700 mb-1">
            Priority
          </label>
          <select
            id="priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-full"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-secondary-700 mb-1">
            Search
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search requests..."
              className="input w-full pl-10"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
          </div>
        </div>
      </div>
      
      {/* Waiting Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-secondary-100">
            <FiClock className="mx-auto h-12 w-12 text-secondary-400" />
            <h3 className="mt-2 text-lg font-medium text-secondary-900">No waiting items found</h3>
            <p className="mt-1 text-secondary-500">
              {searchTerm || selectedProject || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new waiting item to get started'}
            </p>
            {!searchTerm && !selectedProject && statusFilter === 'all' && priorityFilter === 'all' && (
              <button
                onClick={handleAddClick}
                className="mt-4 btn btn-primary"
              >
                <FiPlus className="mr-1.5 h-4 w-4" />
                New Request
              </button>
            )}
          </div>
        ) : (
          filteredItems.map(item => (
            <WaitingItemCard 
              key={item.id} 
              item={item} 
              getStatusClass={getStatusClass}
              getPriorityClass={getPriorityClass}
            />
          ))
        )}
      </div>
      
      {/* Add Waiting Item Modal */}
      {showAddModal && (
        <WaitingItemForm
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          projects={projects}
        />
      )}
    </div>
  );
};

export default WaitingItems;
