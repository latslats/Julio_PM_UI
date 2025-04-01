import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { parseISO, format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Component for displaying time tracking data as a bar chart
 * 
 * @param {Object} props Component props
 * @param {Array} props.timeEntries Array of time entries
 * @param {Array} props.projects Array of projects
 * @param {string} props.dateRange Selected date range (today, week, month, etc.)
 * @param {string} props.groupBy How to group the data (project, day, etc.)
 * @returns {JSX.Element} The TimeTrackingChart component
 */
const TimeTrackingChart = ({ timeEntries, projects, dateRange, groupBy }) => {
  // Process data based on date range and grouping
  const chartData = useMemo(() => {
    if (!timeEntries.length || !projects.length) {
      return {
        labels: [],
        datasets: [{
          label: 'No data',
          data: [],
          backgroundColor: '#e0e0e0',
        }]
      };
    }

    // Get date range
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
    }

    // Filter entries by date range
    const filteredEntries = timeEntries.filter(entry => {
      const entryDate = parseISO(entry.startTime);
      return isWithinInterval(entryDate, { start: startDate, end: endDate }) && entry.duration;
    });

    // Group data based on groupBy parameter
    if (groupBy === 'project') {
      // Group by project
      const projectData = {};
      const projectColors = {};
      
      projects.forEach(project => {
        projectData[project.id] = 0;
        projectColors[project.id] = project.color || '#0ea5e9';
      });

      filteredEntries.forEach(entry => {
        const projectId = entry.projectId;
        if (projectId && projectData[projectId] !== undefined) {
          projectData[projectId] += parseFloat(entry.duration) / 3600; // Convert seconds to hours
        }
      });

      const labels = Object.keys(projectData).map(id => {
        const project = projects.find(p => p.id === id);
        return project ? project.name : 'Unknown';
      });

      const data = Object.keys(projectData).map(id => parseFloat(projectData[id].toFixed(2)));
      const backgroundColor = Object.keys(projectData).map(id => projectColors[id]);

      return {
        labels,
        datasets: [{
          label: 'Hours',
          data,
          backgroundColor,
          borderWidth: 1,
          borderRadius: 4,
        }]
      };
    } else if (groupBy === 'day') {
      // Group by day
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dayData = {};
      
      days.forEach(day => {
        dayData[format(day, 'yyyy-MM-dd')] = 0;
      });

      filteredEntries.forEach(entry => {
        const entryDate = format(parseISO(entry.startTime), 'yyyy-MM-dd');
        if (dayData[entryDate] !== undefined) {
          dayData[entryDate] += parseFloat(entry.duration) / 3600; // Convert seconds to hours
        }
      });

      const labels = Object.keys(dayData).map(date => format(parseISO(date), 'MMM d'));
      const data = Object.keys(dayData).map(date => parseFloat(dayData[date].toFixed(2)));

      return {
        labels,
        datasets: [{
          label: 'Hours',
          data,
          backgroundColor: '#0ea5e9',
          borderWidth: 1,
          borderRadius: 4,
        }]
      };
    }

    // Default fallback
    return {
      labels: ['No data'],
      datasets: [{
        label: 'Hours',
        data: [0],
        backgroundColor: '#e0e0e0',
      }]
    };
  }, [timeEntries, projects, dateRange, groupBy]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw} hours`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours'
        }
      }
    }
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default TimeTrackingChart;
