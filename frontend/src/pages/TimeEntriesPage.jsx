import { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Link } from 'react-router-dom';
import { FiClock, FiFilter, FiCalendar, FiSearch, FiX, FiArrowLeft } from 'react-icons/fi';
import BackButton from '../components/common/BackButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import TimeEntriesList from '../components/timeTracking/TimeEntriesList';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * TimeEntriesPage component displays and manages time entries
 * 
 * @returns {JSX.Element} - The rendered component
 */
const TimeEntriesPage = () => {
  const { projects, tasks, timeEntries, loading } = useProjects();
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalDuration: 0,
    activeEntries: 0
  });

  // Apply filters to time entries
  useEffect(() => {
    let filtered = [...timeEntries];
    
    // Filter by project
    if (selectedProject !== 'all') {
      const projectTasks = tasks.filter(task => task.projectId === selectedProject).map(task => task.id);
      filtered = filtered.filter(entry => projectTasks.includes(entry.taskId));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => {
        const task = tasks.find(t => t.id === entry.taskId);
        const project = task ? projects.find(p => p.id === task.projectId) : null;
        
        return (
          (task?.title?.toLowerCase().includes(query)) ||
          (project?.name?.toLowerCase().includes(query)) ||
          (entry.notes?.toLowerCase().includes(query))
        );
      });
    }
    
    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate, endDate;
      
      switch (dateRange) {
        case 'today':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'yesterday':
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case 'thisWeek':
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Week starts on Monday
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'thisMonth':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'custom':
          if (customStartDate) {
            startDate = startOfDay(customStartDate);
            endDate = customEndDate ? endOfDay(customEndDate) : endOfDay(now);
          }
          break;
        default:
          break;
      }
      
      if (startDate && endDate) {
        filtered = filtered.filter(entry => {
          const entryDate = new Date(entry.startTime);
          return entryDate >= startDate && entryDate <= endDate;
        });
      }
    }
    
    // Sort by start time (most recent first)
    filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    setFilteredEntries(filtered);
    
    // Calculate stats
    const totalDuration = filtered.reduce((sum, entry) => {
      // For completed entries, use the duration
      if (entry.endTime && entry.duration) {
        return sum + parseFloat(entry.duration);
      }
      // For active entries, calculate current duration
      else if (!entry.endTime) {
        const currentElapsed = parseFloat(entry.currentElapsedSeconds || 0);
        return sum + currentElapsed;
      }
      return sum;
    }, 0);
    
    console.log('Total duration calculation:', {
      totalDuration,
      entries: filtered.map(e => ({
        id: e.id,
        duration: e.duration,
        currentElapsedSeconds: e.currentElapsedSeconds,
        endTime: e.endTime
      }))
    });
    
    const activeEntries = filtered.filter(entry => !entry.endTime).length;
    
    setStats({
      totalEntries: filtered.length,
      totalDuration,
      activeEntries
    });
    
  }, [timeEntries, tasks, projects, selectedProject, searchQuery, dateRange, customStartDate, customEndDate]);

  // Format time as HH:MM
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0')
    ].join(':');
  };

  // Handle date range selection
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    if (value !== 'custom') {
      setShowDatePicker(false);
    } else {
      setShowDatePicker(true);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedProject('all');
    setSearchQuery('');
    setDateRange('all');
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center text-sm text-secondary-500 mb-1">
            <Link to="/settings" className="hover:text-primary-500 transition-colors">
              Settings
            </Link>
            <span className="mx-2">/</span>
            <span className="text-secondary-700">Time Entries</span>
          </div>
          <div className="flex items-center gap-2">
            <BackButton to="/" className="-ml-2" />
            <h1 className="text-2xl font-semibold text-secondary-900">Time Entries</h1>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600">
                <FiClock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-secondary-900">{stats.totalEntries}</p>
                <p className="text-sm text-secondary-500">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                <FiClock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-secondary-900">{formatTime(stats.totalDuration)}</p>
                <p className="text-sm text-secondary-500">Total Time <span className="text-xs">(HH:MM)</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <FiClock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-secondary-900">{stats.activeEntries}</p>
                <p className="text-sm text-secondary-500">Active Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <FiFilter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Filter */}
            <div>
              <label htmlFor="project-filter" className="block text-sm font-medium text-secondary-700 mb-1">
                Project
              </label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger id="project-filter" className="w-full">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Range Filter */}
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-secondary-700 mb-1">
                Date Range
              </label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger id="date-filter" className="w-full">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom Date Range Picker */}
              {dateRange === 'custom' && (
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <FiCalendar className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'PPP') : <span>Start Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <FiCalendar className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP') : <span>End Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        disabled={(date) => customStartDate && date < customStartDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            
            {/* Search Filter */}
            <div>
              <label htmlFor="search-filter" className="block text-sm font-medium text-secondary-700 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-4 w-4 text-secondary-400" />
                </div>
                <Input
                  id="search-filter"
                  type="text"
                  placeholder="Search tasks, projects, notes..."
                  className="pl-10 pr-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-secondary-400 hover:text-secondary-500"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(selectedProject !== 'all' || searchQuery || dateRange !== 'all') && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-secondary-600 hover:text-secondary-900"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {(selectedProject !== 'all' || searchQuery || dateRange !== 'all') && (
        <div className="flex flex-wrap gap-2">
          {selectedProject !== 'all' && (
            <Badge variant="outline" className="bg-secondary-50 text-secondary-700">
              Project: {projects.find(p => p.id === selectedProject)?.name}
              <button
                onClick={() => setSelectedProject('all')}
                className="ml-1 text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-3 w-3 inline" />
              </button>
            </Badge>
          )}
          
          {dateRange !== 'all' && (
            <Badge variant="outline" className="bg-secondary-50 text-secondary-700">
              Date: {dateRange === 'custom' ? 'Custom Range' : 
                     dateRange === 'today' ? 'Today' :
                     dateRange === 'yesterday' ? 'Yesterday' :
                     dateRange === 'thisWeek' ? 'This Week' :
                     'This Month'}
              <button
                onClick={() => setDateRange('all')}
                className="ml-1 text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-3 w-3 inline" />
              </button>
            </Badge>
          )}
          
          {searchQuery && (
            <Badge variant="outline" className="bg-secondary-50 text-secondary-700">
              Search: {searchQuery}
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-3 w-3 inline" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Time Entries List */}
      <TimeEntriesList 
        projectId={selectedProject !== 'all' ? selectedProject : undefined}
        key={`${selectedProject}-${dateRange}-${searchQuery}`} // Add key to force re-render when filters change
      />
    </div>
  );
};

export default TimeEntriesPage;
