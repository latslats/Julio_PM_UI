import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiPlus, FiFilter, FiSearch, FiX } from 'react-icons/fi'
import BackButton from '../components/common/BackButton'; // Import BackButton
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Components
import ProjectCard from '../components/projects/ProjectCard'

const Projects = () => {
  const { projects, loading, createProject, projectStats } = useProjects()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({});
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
    return ['all', ...Array.from(clients).sort()]
  }, [projects]);

  // Filter projects based on search term and selected client
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedClient === 'all' || project.client === selectedClient)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading projects...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton to="/" className="-ml-2" />
          <h1 className="text-2xl font-semibold text-secondary-900">Projects</h1>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
             <Button>
               <FiPlus className="mr-1.5 h-4 w-4" />
               New Project
             </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>Create New Project</DialogTitle>
             </DialogHeader>
            
             <form onSubmit={async (e) => {
                 e.preventDefault()
                 
                 // Reset previous errors
                 setFormErrors({});
                 
                 // Validate form
                 const errors = {};
                 if (!newProject.name.trim()) {
                   errors.name = 'Project name is required';
                 } else if (newProject.name.length > 100) {
                   errors.name = 'Project name must be less than 100 characters';
                 }
                 
                 // Validate dates if provided
                 if (newProject.startDate && newProject.dueDate) {
                   const start = new Date(newProject.startDate);
                   const due = new Date(newProject.dueDate);
                   if (due < start) {
                     errors.dueDate = 'Due date cannot be before start date';
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
                   const result = await createProject(newProject);
                   if (result.success) {
                     setShowCreateModal(false);
                     setNewProject({
                       name: '',
                       description: '',
                       client: '',
                       color: '#0ea5e9',
                       startDate: '',
                       dueDate: ''
                     });
                   } else {
                     // Handle API error
                     setFormErrors({ api: result.message || 'Failed to create project' });
                   }
                 } catch (err) {
                   setFormErrors({ api: err.message || 'An unexpected error occurred' });
                 } finally {
                   setFormLoading(false);
                 }
               }}>
                 <div className="space-y-4 py-4"> 
                   <div>
                     <Label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                       Project Name *
                     </Label>
                     <Input
                       id="name"
                       type="text"
                       value={newProject.name}
                       onChange={(e) => {
                         setNewProject({...newProject, name: e.target.value});
                         // Clear error when user starts typing
                         if (formErrors.name) {
                           setFormErrors({...formErrors, name: null});
                         }
                       }}
                       className={`w-full ${formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                       required
                       disabled={formLoading}
                       placeholder="Enter project name"
                       maxLength={100}
                     />
                     {formErrors.name && (
                       <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                     )}
                   </div>
                   
                   <div>
                     <Label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                       Description
                     </Label>
                     <Textarea
                       id="description"
                       value={newProject.description}
                       onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                       className="w-full h-24"
                       disabled={formLoading}
                       placeholder="Describe the project (optional)"
                       maxLength={500}
                     />
                     <p className="mt-1 text-xs text-secondary-500 text-right">
                       {newProject.description.length}/500
                     </p>
                   </div>
                   
                   <div>
                     <Label htmlFor="client" className="block text-sm font-medium text-secondary-700 mb-1">
                       Client
                     </Label>
                     <Input
                       id="client"
                       type="text"
                       value={newProject.client}
                       onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                       className="w-full"
                     />
                   </div>
                   
                   <div>
                     <Label htmlFor="color" className="block text-sm font-medium text-secondary-700 mb-1">
                       Color
                     </Label>
                     <Input
                       id="color"
                       type="color"
                       value={newProject.color}
                       onChange={(e) => setNewProject({...newProject, color: e.target.value})}
                       className="h-10 w-full rounded-md border border-secondary-200 p-1"
                     />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="startDate" className="block text-sm font-medium text-secondary-700 mb-1">
                         Start Date
                       </Label>
                       <Input
                         id="startDate"
                         type="date"
                         value={newProject.startDate}
                         onChange={(e) => {
                           setNewProject({...newProject, startDate: e.target.value});
                           // Clear date errors when user changes dates
                           if (formErrors.dueDate) {
                             setFormErrors({...formErrors, dueDate: null});
                           }
                         }}
                         className="w-full"
                         disabled={formLoading}
                         min={new Date().toISOString().split('T')[0]} // Today as min date
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="dueDate" className="block text-sm font-medium text-secondary-700 mb-1">
                         Due Date
                       </Label>
                       <Input
                         id="dueDate"
                         type="date"
                         value={newProject.dueDate}
                         onChange={(e) => {
                           setNewProject({...newProject, dueDate: e.target.value});
                           // Clear date errors when user changes dates
                           if (formErrors.dueDate) {
                             setFormErrors({...formErrors, dueDate: null});
                           }
                         }}
                         className={`w-full ${formErrors.dueDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                         disabled={formLoading}
                         min={newProject.startDate || new Date().toISOString().split('T')[0]} // Start date or today as min date
                       />
                       {formErrors.dueDate && (
                         <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>
                       )}
                     </div>
                   </div>
                 </div>
                 
                 {/* Display API error if any */}
                 {formErrors.api && (
                   <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                     <p>{formErrors.api}</p>
                   </div>
                 )}
                 
                 <DialogFooter className="mt-6">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => {
                       setShowCreateModal(false);
                       setFormErrors({});
                     }}
                     disabled={formLoading}
                   >
                     Cancel
                   </Button>
                   <Button
                     type="submit"
                     className="flex items-center justify-center min-w-[120px]"
                     disabled={formLoading}
                   >
                     {formLoading ? (
                       <>
                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         Creating...
                       </>
                     ) : (
                       'Create Project'
                     )}
                   </Button>
                 </DialogFooter>
               </form>
             </DialogContent>
           </Dialog>
         </div>
       
       {/* --- Content Area Wrapped in Card --- */}
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
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="relative sm:w-48">
              <Select 
                value={selectedClient}
                onValueChange={(value) => setSelectedClient(value)}
                className="w-full"
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueClients.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
            <div className="text-center py-12 bg-secondary-50 rounded-xl border border-secondary-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
                <FiPlus className="h-8 w-8" />
              </div>
              <h3 className="text-secondary-900 font-medium mb-1">No projects found</h3>
              <p className="text-secondary-600 text-sm mb-4">
                {searchTerm || selectedClient ? 'Try adjusting your search or filter' : 'Create your first project to get started'}
              </p>
              {!searchTerm && !selectedClient && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center"
                >
                  <FiPlus className="mr-1.5 h-4 w-4" />
                  Create Project
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* --- End of Card Wrapper --- */}
    </div>
  )
}

export default Projects
