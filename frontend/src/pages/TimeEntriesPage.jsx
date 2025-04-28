import { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Link } from 'react-router-dom';
import { FiClock, FiFilter, FiCalendar, FiSearch, FiX, FiArrowLeft, FiPlus, FiChevronDown, FiSliders } from 'react-icons/fi';
import BackButton from '../components/common/BackButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import TimeEntriesList from '../components/timeTracking/TimeEntriesList';
import ManualTimeEntryForm from '../components/timeTracking/ManualTimeEntryForm';
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

  // State for manual time entry dialog
  const [showManualTimeEntryModal, setShowManualTimeEntryModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-5">
      {/* Header with breadcrumb and title */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center text-xs text-secondary-500">
          <Link to="/settings" className="hover:text-primary transition-colors">
            Settings
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-secondary-700">Time Entries</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton to="/" className="-ml-2" />
            <h1 className="text-xl font-medium text-secondary-900">Time Entries</h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showManualTimeEntryModal} onOpenChange={setShowManualTimeEntryModal}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <FiPlus className="h-3.5 w-3.5" />
                  <span>New Entry</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Time Entry</DialogTitle>
                  <DialogDescription>
                    Create a new time entry for a task.
                  </DialogDescription>
                </DialogHeader>
                <ManualTimeEntryForm onClose={() => setShowManualTimeEntryModal(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Bar - Minimalist approach */}
      <div className="flex flex-wrap gap-6 py-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
            <FiClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">Entries</p>
            <p className="text-lg font-medium">{stats.totalEntries}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <FiClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">Total Time</p>
            <p className="text-lg font-medium">{formatTime(stats.totalDuration)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <FiClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">Active</p>
            <p className="text-lg font-medium">{stats.activeEntries}</p>
          </div>
        </div>
      </div>

      {/* Compact Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 py-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <FiSearch className="h-3.5 w-3.5 text-secondary-400" />
          </div>
          <Input
            type="text"
            placeholder="Search..."
            className="pl-8 h-8 text-sm w-[200px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-secondary-400 hover:text-secondary-500"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="h-8 text-sm w-[180px]">
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

        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="h-8 text-sm w-[150px]">
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

        {dateRange === 'custom' && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  <FiCalendar className="mr-1.5 h-3.5 w-3.5" />
                  {customStartDate ? format(customStartDate, 'MMM d') : <span>Start</span>}
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
                  size="sm"
                  className="h-8 text-xs"
                >
                  <FiCalendar className="mr-1.5 h-3.5 w-3.5" />
                  {customEndDate ? format(customEndDate, 'MMM d') : <span>End</span>}
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

        {(selectedProject !== 'all' || searchQuery || dateRange !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-secondary-600 hover:text-secondary-900"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters - Subtle badges */}
      {(selectedProject !== 'all' || searchQuery || dateRange !== 'all') && (
        <div className="flex flex-wrap gap-1.5 py-1">
          {selectedProject !== 'all' && (
            <Badge variant="outline" className="px-2 py-0.5 h-5 text-xs bg-secondary-50 text-secondary-700 font-normal">
              {projects.find(p => p.id === selectedProject)?.name}
              <button
                onClick={() => setSelectedProject('all')}
                className="ml-1 text-secondary-500 hover:text-secondary-700"
              >
                <FiX className="h-3 w-3 inline" />
              </button>
            </Badge>
          )}

          {dateRange !== 'all' && (
            <Badge variant="outline" className="px-2 py-0.5 h-5 text-xs bg-secondary-50 text-secondary-700 font-normal">
              {dateRange === 'custom' ? 'Custom Range' :
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
            <Badge variant="outline" className="px-2 py-0.5 h-5 text-xs bg-secondary-50 text-secondary-700 font-normal">
              "{searchQuery}"
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

      <Separator className="my-1" />

      {/* Time Entries List - Using the redesigned component */}
      <TimeEntriesList
        projectId={selectedProject !== 'all' ? selectedProject : undefined}
        key={`${selectedProject}-${dateRange}-${searchQuery}`}
        filteredEntries={filteredEntries}
      />
    </div>
  );
};

export default TimeEntriesPage;
