import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiPlus, FiFilter, FiSearch, FiX } from 'react-icons/fi'

// Components
import ProjectCard from '../components/projects/ProjectCard'

const Projects = () => {
  const { projects, loading, createProject, projectStats } = useProjects()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client: '',
    color: '#0ea5e9',
    startDate: '',
    dueDate: ''
  })
  
  // Get unique client names for the filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = new Set(projects.map(p => p.client).filter(Boolean))
    return ['', ...Array.from(clients).sort()]
  }, [projects])

  // Filter projects based on search term and selected client
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedClient === '' || project.client === selectedClient)
  )
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading projects...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-secondary-900">Projects</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center"
        >
          <FiPlus className="mr-1.5 h-4 w-4" />
          New Project
        </button>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-secondary-400" />
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="relative sm:w-48">
          <select 
            id="client-filter"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="input w-full appearance-none pr-8"
            aria-label="Filter by client"
          >
            <option value="">All Clients</option>
            {uniqueClients.slice(1).map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-secondary-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => {
            // Enhance project with stats from projectStats
            const stats = projectStats[project.id] || { totalTasks: 0, completedTasks: 0, totalHours: 0, progress: 0 };
            const enhancedProject = {
              ...project,
              totalTasks: stats.totalTasks,
              completedTasks: stats.completedTasks,
              totalHours: stats.totalHours,
              progress: stats.progress
            };
            return <ProjectCard key={project.id} project={enhancedProject} />;
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-secondary-50 rounded-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
            <FiPlus className="h-8 w-8" />
          </div>
          <h3 className="text-secondary-900 font-medium mb-1">No projects found</h3>
          <p className="text-secondary-600 text-sm mb-4">
            {searchTerm || selectedClient ? 'Try adjusting your search or filter' : 'Create your first project to get started'}
          </p>
          {!searchTerm && !selectedClient && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary inline-flex items-center"
            >
              <FiPlus className="mr-1.5 h-4 w-4" />
              Create Project
            </button>
          )}
        </div>
      )}
      
      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-secondary-100">
              <h3 className="text-lg font-medium text-secondary-900">Create New Project</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <form onSubmit={async (e) => {
                e.preventDefault()
                const result = await createProject(newProject)
                if (result.success) {
                  setShowCreateModal(false)
                  setNewProject({
                    name: '',
                    description: '',
                    client: '',
                    color: '#0ea5e9',
                    startDate: '',
                    dueDate: ''
                  })
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                      className="input w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      className="input w-full h-24"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="client" className="block text-sm font-medium text-secondary-700 mb-1">
                      Client
                    </label>
                    <input
                      type="text"
                      id="client"
                      value={newProject.client}
                      onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                      className="input w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-secondary-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      id="color"
                      value={newProject.color}
                      onChange={(e) => setNewProject({...newProject, color: e.target.value})}
                      className="h-10 w-full rounded-md border border-secondary-200 p-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-secondary-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                        className="input w-full"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="dueDate" className="block text-sm font-medium text-secondary-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="dueDate"
                        value={newProject.dueDate}
                        onChange={(e) => setNewProject({...newProject, dueDate: e.target.value})}
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects
