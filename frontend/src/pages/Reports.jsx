import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectContext'
import { FiDownload, FiCalendar, FiPieChart, FiBarChart2, FiTrendingUp, FiChevronLeft } from 'react-icons/fi'
import TimeTrackingChart from '../components/reports/TimeTrackingChart'
import ProjectProgressChart from '../components/reports/ProjectProgressChart'
import TaskCompletionChart from '../components/reports/TaskCompletionChart'

const Reports = () => {
  const { projects, tasks, timeEntries, loading } = useProjects()
  const [reportType, setReportType] = useState('time')
  const [dateRange, setDateRange] = useState('week')
  const [groupBy, setGroupBy] = useState('project')
  const [chartType, setChartType] = useState('bar')
  
  // Calculate summary statistics for the reports
  const {
    totalHours,
    dateRangeLabel,
    projectCompletionRate,
    completedTasks,
    totalTasks,
    summaryItems
  } = useMemo(() => {
    // For time tracking report
    let totalSeconds = 0;
    timeEntries.forEach(entry => {
      if (entry.duration) {
        totalSeconds += parseFloat(entry.duration);
      }
    });
    const totalHours = Math.round(totalSeconds / 36) / 100; // Convert seconds to hours with 2 decimal places
    
    // Get date range label
    let dateRangeLabel = 'This Week';
    switch (dateRange) {
      case 'today': dateRangeLabel = 'Today'; break;
      case 'yesterday': dateRangeLabel = 'Yesterday'; break;
      case 'week': dateRangeLabel = 'This Week'; break;
      case 'month': dateRangeLabel = 'This Month'; break;
      case 'quarter': dateRangeLabel = 'This Quarter'; break;
      case 'year': dateRangeLabel = 'This Year'; break;
      default: dateRangeLabel = 'This Week';
    }
    
    // For projects report
    let totalCompletion = 0;
    let projectsWithTasks = 0;
    projects.forEach(project => {
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      if (projectTasks.length > 0) {
        const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
        totalCompletion += (completedTasks / projectTasks.length) * 100;
        projectsWithTasks++;
      }
    });
    const projectCompletionRate = projectsWithTasks > 0 ? Math.round(totalCompletion / projectsWithTasks) : 0;
    
    // For tasks report
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTasks = tasks.length;
    
    // Generate summary items based on report type
    let summaryItems = [];
    
    if (reportType === 'time') {
      // Get top 3 projects by time spent
      const projectTimeMap = {};
      timeEntries.forEach(entry => {
        if (!entry.duration) return;
        
        const task = tasks.find(t => t.id === entry.taskId);
        if (!task) return;
        
        const projectId = task.projectId;
        if (!projectTimeMap[projectId]) {
          projectTimeMap[projectId] = 0;
        }
        projectTimeMap[projectId] += parseFloat(entry.duration);
      });
      
      // Convert to array and sort
      const projectTimes = Object.entries(projectTimeMap)
        .map(([projectId, seconds]) => {
          const project = projects.find(p => p.id === projectId);
          return {
            projectId,
            projectName: project ? project.name : 'Unknown Project',
            seconds,
            color: project ? project.color || '#0ea5e9' : '#0ea5e9'
          };
        })
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 3);
      
      // Calculate percentages
      const totalProjectSeconds = projectTimes.reduce((sum, item) => sum + item.seconds, 0);
      
      summaryItems = projectTimes.map(item => ({
        label: item.projectName,
        value: `${Math.round(item.seconds / 36) / 100}h`,
        percentage: totalProjectSeconds > 0 ? Math.round((item.seconds / totalProjectSeconds) * 100) : 0,
        color: item.color
      }));
    } else if (reportType === 'projects') {
      // Group projects by status
      const statusCounts = { completed: 0, inProgress: 0, notStarted: 0 };
      
      projects.forEach(project => {
        const projectTasks = tasks.filter(task => task.projectId === project.id);
        if (projectTasks.length === 0) {
          statusCounts.notStarted++;
          return;
        }
        
        const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
        const completionPercentage = Math.round((completedTasks / projectTasks.length) * 100);
        
        if (completionPercentage === 100) {
          statusCounts.completed++;
        } else if (completionPercentage > 0) {
          statusCounts.inProgress++;
        } else {
          statusCounts.notStarted++;
        }
      });
      
      const totalProjects = projects.length;
      
      summaryItems = [
        {
          label: 'Completed',
          value: statusCounts.completed,
          percentage: totalProjects > 0 ? Math.round((statusCounts.completed / totalProjects) * 100) : 0,
          color: '#10b981' // Green
        },
        {
          label: 'In Progress',
          value: statusCounts.inProgress,
          percentage: totalProjects > 0 ? Math.round((statusCounts.inProgress / totalProjects) * 100) : 0,
          color: '#f59e0b' // Amber
        },
        {
          label: 'Not Started',
          value: statusCounts.notStarted,
          percentage: totalProjects > 0 ? Math.round((statusCounts.notStarted / totalProjects) * 100) : 0,
          color: '#6b7280' // Gray
        }
      ];
    } else if (reportType === 'tasks') {
      // Group tasks by priority
      const priorityCounts = { high: 0, medium: 0, low: 0 };
      
      tasks.forEach(task => {
        if (priorityCounts[task.priority] !== undefined) {
          priorityCounts[task.priority]++;
        } else {
          priorityCounts.medium++; // Default
        }
      });
      
      summaryItems = [
        {
          label: 'High Priority',
          value: priorityCounts.high,
          percentage: totalTasks > 0 ? Math.round((priorityCounts.high / totalTasks) * 100) : 0,
          color: '#ef4444' // Red
        },
        {
          label: 'Medium Priority',
          value: priorityCounts.medium,
          percentage: totalTasks > 0 ? Math.round((priorityCounts.medium / totalTasks) * 100) : 0,
          color: '#f59e0b' // Amber
        },
        {
          label: 'Low Priority',
          value: priorityCounts.low,
          percentage: totalTasks > 0 ? Math.round((priorityCounts.low / totalTasks) * 100) : 0,
          color: '#10b981' // Green
        }
      ];
    } else {
      // Productivity (placeholder)
      summaryItems = [
        {
          label: 'Morning (8-12)',
          value: '10h 15m',
          percentage: 45,
          color: '#0ea5e9' // Blue
        },
        {
          label: 'Afternoon (12-5)',
          value: '8h 20m',
          percentage: 30,
          color: '#8b5cf6' // Purple
        },
        {
          label: 'Evening (5-8)',
          value: '4h 45m',
          percentage: 25,
          color: '#ec4899' // Pink
        }
      ];
    }
    
    return {
      totalHours,
      dateRangeLabel,
      projectCompletionRate,
      completedTasks,
      totalTasks,
      summaryItems
    };
  }, [reportType, dateRange, projects, tasks, timeEntries]);
  
  // Handle exporting data
  const handleExportData = () => {
    // Prepare data based on report type
    let csvContent = '';
    let filename = '';
    
    if (reportType === 'time') {
      // Time tracking export
      filename = `time-tracking-${dateRange}.csv`;
      csvContent = 'Task,Project,Start Time,End Time,Duration (hours)\n';
      
      timeEntries.forEach(entry => {
        const task = tasks.find(t => t.id === entry.taskId) || { title: 'Unknown Task' };
        const project = projects.find(p => p.id === task.projectId) || { name: 'Unknown Project' };
        const duration = entry.duration ? (parseFloat(entry.duration) / 3600).toFixed(2) : '0';
        
        csvContent += `"${task.title}","${project.name}","${entry.startTime}","${entry.endTime || 'Active'}",${duration}\n`;
      });
    } else if (reportType === 'projects') {
      // Project progress export
      filename = 'project-progress.csv';
      csvContent = 'Project,Total Tasks,Completed Tasks,Completion %\n';
      
      projects.forEach(project => {
        const projectTasks = tasks.filter(task => task.projectId === project.id);
        const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
        const completionPercentage = projectTasks.length > 0 
          ? Math.round((completedTasks / projectTasks.length) * 100) 
          : 0;
        
        csvContent += `"${project.name}",${projectTasks.length},${completedTasks},${completionPercentage}\n`;
      });
    } else if (reportType === 'tasks') {
      // Task status export
      filename = 'task-status.csv';
      csvContent = 'Task,Project,Status,Priority,Due Date\n';
      
      tasks.forEach(task => {
        const project = projects.find(p => p.id === task.projectId) || { name: 'Unknown Project' };
        
        csvContent += `"${task.title}","${project.name}","${task.status}","${task.priority}","${task.dueDate || ''}"\n`;
      });
    }
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading reports data...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-secondary-600 hover:text-secondary-900 mb-1">
            <FiChevronLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-secondary-900">Reports</h1>
        </div>
        <button 
          onClick={handleExportData} 
          className="btn btn-secondary flex items-center"
        >
          <FiDownload className="mr-1.5 h-4 w-4" />
          Export
        </button>
      </div>
      
      {/* Report Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="report-type" className="block text-sm font-medium text-secondary-700 mb-1">
              Report Type
            </label>
            <select
              id="report-type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input w-full"
            >
              <option value="time">Time Tracking</option>
              <option value="projects">Project Progress</option>
              <option value="tasks">Task Completion</option>
              <option value="productivity">Productivity</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label htmlFor="date-range" className="block text-sm font-medium text-secondary-700 mb-1">
              Date Range
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-5 w-5 text-secondary-400" />
              </div>
              <select
                id="date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input pl-10 w-full"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1">
            <label htmlFor="group-by" className="block text-sm font-medium text-secondary-700 mb-1">
              Group By
            </label>
            <select
              id="group-by"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="input w-full"
            >
              <option value="project">Project</option>
              <option value="day">Day</option>
              {reportType === 'tasks' && <option value="priority">Priority</option>}
              {reportType === 'tasks' && <option value="status">Status</option>}
            </select>
          </div>
        </div>
      </div>
      
      {/* Report Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-secondary-900">
              {reportType === 'time' ? 'Time Tracked' : 
               reportType === 'projects' ? 'Project Progress' : 
               reportType === 'tasks' ? 'Task Completion' : 'Productivity'}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => setChartType('bar')} 
                className={`p-1.5 rounded-lg ${chartType === 'bar' ? 'bg-primary-50 text-primary-600' : 'text-secondary-500 hover:bg-secondary-100'}`}
                title="Bar Chart"
              >
                <FiBarChart2 className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setChartType('line')} 
                className={`p-1.5 rounded-lg ${chartType === 'line' ? 'bg-primary-50 text-primary-600' : 'text-secondary-500 hover:bg-secondary-100'}`}
                title="Line Chart"
              >
                <FiTrendingUp className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setChartType('pie')} 
                className={`p-1.5 rounded-lg ${chartType === 'pie' ? 'bg-primary-50 text-primary-600' : 'text-secondary-500 hover:bg-secondary-100'}`}
                title="Pie Chart"
              >
                <FiPieChart className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="h-64 bg-white rounded-lg">
            {reportType === 'time' && (
              <TimeTrackingChart 
                timeEntries={timeEntries} 
                projects={projects} 
                dateRange={dateRange} 
                groupBy={groupBy} 
              />
            )}
            {reportType === 'projects' && (
              <ProjectProgressChart 
                projects={projects} 
                tasks={tasks} 
              />
            )}
            {reportType === 'tasks' && (
              <TaskCompletionChart 
                tasks={tasks} 
              />
            )}
            {reportType === 'productivity' && (
              <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
                    <FiTrendingUp className="h-8 w-8" />
                  </div>
                  <p className="text-secondary-600">Productivity tracking coming soon</p>
                  <p className="text-sm text-secondary-500 mt-1">This feature is under development</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-medium text-secondary-900 mb-4">Summary</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-secondary-700 mb-2">
                {reportType === 'time' ? 'Total Time Tracked' : 
                 reportType === 'projects' ? 'Project Status' : 
                 reportType === 'tasks' ? 'Task Status' : 'Productivity Score'}
              </h3>
              
              <div className="bg-secondary-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-semibold text-secondary-900">
                  {reportType === 'time' ? `${totalHours}h` : 
                   reportType === 'projects' ? `${projectCompletionRate}%` : 
                   reportType === 'tasks' ? `${completedTasks}/${totalTasks}` : '85%'}
                </p>
                <p className="text-sm text-secondary-500 mt-1">
                  {reportType === 'time' ? dateRangeLabel : 
                   reportType === 'projects' ? 'Average completion' : 
                   reportType === 'tasks' ? 'Tasks completed' : 'Efficiency score'}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-secondary-700 mb-2">
                {reportType === 'time' ? 'Time Distribution' : 
                 reportType === 'projects' ? 'Project Distribution' : 
                 reportType === 'tasks' ? 'Task Priority' : 'Peak Hours'}
              </h3>
              
              <div className="space-y-2">
                {summaryItems.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div className="ml-2 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary-700 truncate pr-2">
                          {item.label}
                        </span>
                        <span className="font-medium text-secondary-900">
                          {item.value}
                        </span>
                      </div>
                      <div className="w-full bg-secondary-100 rounded-full h-1.5 mt-1">
                        <div 
                          className="h-1.5 rounded-full"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                {summaryItems.length === 0 && (
                  <div className="text-center py-3 text-secondary-500">
                    No data available for this report type
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-secondary-700 mb-2">Insights</h3>
              <div className="bg-secondary-50 rounded-lg p-3 text-sm text-secondary-700">
                <p>
                  {reportType === 'time' 
                    ? `Most time was spent on ${summaryItems[0]?.label || 'projects'}. You tracked ${totalHours} hours in ${dateRangeLabel.toLowerCase()}.`
                    : reportType === 'projects'
                    ? `Projects are ${projectCompletionRate}% complete on average. ${projects.filter(p => tasks.filter(t => t.projectId === p.id && t.status === 'completed').length === tasks.filter(t => t.projectId === p.id).length).length} projects are fully completed.`
                    : reportType === 'tasks'
                    ? `You've completed ${completedTasks} out of ${totalTasks} tasks (${Math.round((completedTasks/totalTasks || 0) * 100)}%). ${tasks.filter(t => t.priority === 'high' && t.status === 'completed').length} high-priority tasks are completed.`
                    : 'Your productivity data will be available once you track more time entries across different times of day.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Detailed Data */}
      <div className="card">
        <h2 className="text-lg font-medium text-secondary-900 mb-4">Detailed Data</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  {reportType === 'time' ? 'Project/Task' : 
                   reportType === 'projects' ? 'Project' : 
                   reportType === 'tasks' ? 'Task' : 'Date'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  {reportType === 'time' ? 'Date' : 
                   reportType === 'projects' ? 'Status' : 
                   reportType === 'tasks' ? 'Status' : 'Hours'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  {reportType === 'time' ? 'Duration' : 
                   reportType === 'projects' ? 'Progress' : 
                   reportType === 'tasks' ? 'Due Date' : 'Productivity'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  {reportType === 'time' ? 'Notes' : 
                   reportType === 'projects' ? 'Hours' : 
                   reportType === 'tasks' ? 'Priority' : 'Tasks'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-100">
              {reportType === 'time' ? (
                // Time tracking detailed data
                timeEntries.slice(0, 10).map((entry) => {
                  const task = tasks.find(t => t.id === entry.taskId) || { title: 'Unknown Task', projectId: null };
                  const project = projects.find(p => p.id === task.projectId) || { name: 'Unknown Project' };
                  const duration = entry.duration ? Math.round(parseFloat(entry.duration) / 36) / 100 : 0;
                  const formattedDate = entry.startTime ? new Date(entry.startTime).toLocaleDateString() : 'N/A';
                  
                  return (
                    <tr key={entry.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 text-sm text-secondary-900">
                        {`${project.name} - ${task.title}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {`${duration}h`}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {entry.notes || 'No notes'}
                      </td>
                    </tr>
                  );
                })
              ) : reportType === 'projects' ? (
                // Projects detailed data
                projects.slice(0, 10).map((project) => {
                  const projectTasks = tasks.filter(task => task.projectId === project.id);
                  const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
                  const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                  
                  // Calculate total hours spent on this project
                  let totalHours = 0;
                  timeEntries.forEach(entry => {
                    const task = tasks.find(t => t.id === entry.taskId);
                    if (task && task.projectId === project.id && entry.duration) {
                      totalHours += parseFloat(entry.duration) / 3600; // Convert seconds to hours
                    }
                  });
                  
                  return (
                    <tr key={project.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 text-sm text-secondary-900">
                        {project.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {`${progress}%`}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {`${totalHours.toFixed(2)}h`}
                      </td>
                    </tr>
                  );
                })
              ) : reportType === 'tasks' ? (
                // Tasks detailed data
                tasks.slice(0, 10).map((task) => {
                  const project = projects.find(p => p.id === task.projectId) || { name: 'Unknown Project' };
                  const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
                  
                  return (
                    <tr key={task.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 text-sm text-secondary-900">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {formattedDueDate}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-700">
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Productivity detailed data (placeholder until implemented)
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 text-sm text-secondary-900">
                      {`${new Date(new Date().setDate(new Date().getDate() - item)).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-700">
                      {`${Math.floor(Math.random() * 4 + 6)}h ${Math.floor(Math.random() * 59)}m`}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-700">
                      {`${Math.floor(Math.random() * 30 + 70)}%`}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-700">
                      {`${Math.floor(Math.random() * 8 + 5)}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports
