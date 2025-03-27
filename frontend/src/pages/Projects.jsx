import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiPlus, FiFilter, FiSearch } from 'react-icons/fi'

// Components
import ProjectCard from '../components/projects/ProjectCard'

const Projects = () => {
  const { projects, loading } = useProjects()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Filter projects based on search term
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <button className="btn btn-secondary flex items-center">
          <FiFilter className="mr-1.5 h-4 w-4" />
          Filter
        </button>
      </div>
      
      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-secondary-50 rounded-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
            <FiPlus className="h-8 w-8" />
          </div>
          <h3 className="text-secondary-900 font-medium mb-1">No projects found</h3>
          <p className="text-secondary-600 text-sm mb-4">
            {searchTerm ? 'Try a different search term' : 'Create your first project to get started'}
          </p>
          {!searchTerm && (
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
      
      {/* Sample data for demonstration */}
      {filteredProjects.length === 0 && !searchTerm && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-secondary-900 mb-2">Sample Projects</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: 'sample1',
                name: 'Website Redesign',
                client: 'Acme Inc.',
                color: '#0ea5e9',
                totalTasks: 12,
                completedTasks: 5,
                totalHours: 24
              },
              {
                id: 'sample2',
                name: 'Mobile App Development',
                client: 'TechStart',
                color: '#8b5cf6',
                totalTasks: 18,
                completedTasks: 3,
                totalHours: 16
              },
              {
                id: 'sample3',
                name: 'Marketing Campaign',
                client: 'GreenLife',
                color: '#10b981',
                totalTasks: 8,
                completedTasks: 8,
                totalHours: 32
              }
            ].map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects
