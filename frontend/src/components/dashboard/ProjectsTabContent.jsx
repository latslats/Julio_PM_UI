import { useState, useMemo } from 'react'
import { FiPlus, FiSearch, FiFolder } from 'react-icons/fi'
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import ProjectCard from '../projects/ProjectCard'

const ProjectsTabContent = ({ 
  projects, 
  projectStats, 
  setShowCreateModal 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('all')

  // Get unique client names for the filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = new Set(projects.map(p => p.client).filter(Boolean))
    return ['all', ...Array.from(clients).sort()]
  }, [projects])

  // Filter projects based on search term and selected client
  const filteredProjects = useMemo(() => {
    return projects
      .filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedClient === 'all' || project.client === selectedClient)
      )
      .map(project => {
        const stats = projectStats[project.id] || { totalTasks: 0, completedTasks: 0, totalHours: 0, progress: 0 }
        return {
          ...project,
          totalTasks: stats.totalTasks,
          completedTasks: stats.completedTasks,
          totalHours: stats.totalHours,
          progress: stats.progress
        }
      })
  }, [projects, projectStats, searchTerm, selectedClient])

  return (
    <Card className="overflow-hidden border-secondary-100/80 shadow-sm">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-medium text-secondary-900">Projects</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreateModal(true)} className="text-xs">
            <FiPlus className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Button>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-secondary-400" />
            </div>
            <Input 
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="relative sm:w-48">
            <Select 
              value={selectedClient}
              onValueChange={(value) => setSelectedClient(value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                {uniqueClients.map(client => (
                  <SelectItem key={client} value={client}>
                    {client === 'all' ? 'All Clients' : client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary-50 rounded-xl border border-secondary-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
              <FiFolder className="h-8 w-8" />
            </div>
            <h3 className="text-secondary-900 font-medium mb-1">No projects found</h3>
            <p className="text-secondary-600 text-sm mb-4">
              {searchTerm || selectedClient !== 'all' ? 'Try adjusting your search or filter' : 'Create your first project to get started'}
            </p>
            {!searchTerm && selectedClient === 'all' && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center"
                size="sm"
              >
                <FiPlus className="mr-1.5 h-4 w-4" />
                Create Project
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProjectsTabContent