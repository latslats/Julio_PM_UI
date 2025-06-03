import { useState, useMemo } from 'react';
import { useWaitingItems } from '../context/WaitingItemContext';
import { useProjects } from '../context/ProjectContext';
import { FiPlus, FiSearch } from 'react-icons/fi';
import BackButton from '../components/common/BackButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WaitingItemCard from '../components/waitingItems/WaitingItemCard';
import WaitingItemForm from '../components/waitingItems/WaitingItemForm';

const WaitingItems = () => {
  const { waitingItems, loading } = useWaitingItems();
  const { projects } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get unique project names for the filter dropdown
  const uniqueProjects = useMemo(() => {
    const projectMap = new Map();
    projects.forEach(p => projectMap.set(p.id, p.name));
    const usedProjects = new Set(waitingItems.map(item => item.projectId).filter(Boolean));
    const filteredProjects = Array.from(usedProjects).map(id => ({ id, name: projectMap.get(id) })).filter(p => p.name);
    return ['all', ...filteredProjects.sort((a, b) => a.name.localeCompare(b.name))];
  }, [waitingItems, projects]);

  // Filter waiting items based on search term, project, and status
  const filteredItems = waitingItems.filter(item => {
    const matchesSearch = item.requestType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.requestedFrom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === 'all' || item.projectId === selectedProject;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    
    return matchesSearch && matchesProject && matchesStatus;
  });

  // Helper functions for status and priority classes
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b'; // yellow
      case 'in-progress':
        return '#3b82f6'; // blue
      case 'completed':
        return '#10b981'; // green
      case 'cancelled':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // orange
      case 'low':
        return '#10b981'; // green
      default:
        return '#6b7280';
    }
  };

  // Handle form submit
  const handleFormSubmit = () => {
    setShowCreateModal(false);
  };

  if (loading) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton to="/" className="-ml-2" />
          <h1 className="text-2xl font-semibold text-secondary-900">Waiting On</h1>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <FiPlus className="mr-1.5 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Content Area Wrapped in Card */}
      <Card>
        <CardHeader>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-secondary-400" />
              </div>
              <Input 
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="relative sm:w-48">
              <Select 
                value={selectedProject}
                onValueChange={(value) => setSelectedProject(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {uniqueProjects.slice(1).map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative sm:w-32">
              <Select 
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Waiting Items Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <WaitingItemCard
                  key={item.id}
                  item={item}
                  getStatusClass={getStatusClass}
                  getPriorityClass={getPriorityClass}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-secondary-50 rounded-xl border border-secondary-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
                <FiPlus className="h-8 w-8" />
              </div>
              <h3 className="text-secondary-900 font-medium mb-1">No requests found</h3>
              <p className="text-secondary-600 text-sm mb-4">
                {searchTerm || selectedProject !== 'all' || selectedStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first request to get started'
                }
              </p>
              {!searchTerm && selectedProject === 'all' && selectedStatus === 'all' && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center"
                >
                  <FiPlus className="mr-1.5 h-4 w-4" />
                  Create Request
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <WaitingItemForm
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleFormSubmit}
          projects={projects}
        />
      )}
    </div>
  );
};

export default WaitingItems;