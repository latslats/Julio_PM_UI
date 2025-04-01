import { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

/**
 * Component for displaying task completion status as a pie chart
 * 
 * @param {Object} props Component props
 * @param {Array} props.tasks Array of tasks
 * @returns {JSX.Element} The TaskCompletionChart component
 */
const TaskCompletionChart = ({ tasks }) => {
  // Process data for the chart
  const chartData = useMemo(() => {
    if (!tasks.length) {
      return {
        labels: ['No tasks'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e0e0e0'],
        }]
      };
    }

    // Count tasks by status
    const statusCounts = {
      'completed': 0,
      'in-progress': 0,
      'not-started': 0
    };

    tasks.forEach(task => {
      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status]++;
      } else {
        // Default to not-started if status is unknown
        statusCounts['not-started']++;
      }
    });

    // Prepare chart data
    return {
      labels: ['Completed', 'In Progress', 'Not Started'],
      datasets: [{
        data: [
          statusCounts['completed'],
          statusCounts['in-progress'],
          statusCounts['not-started']
        ],
        backgroundColor: [
          '#10b981', // Green for completed
          '#f59e0b', // Amber for in-progress
          '#6b7280'  // Gray for not-started
        ],
        borderWidth: 1,
      }]
    };
  }, [tasks]);

  // Count tasks by priority
  const tasksByPriority = useMemo(() => {
    if (!tasks.length) return { high: 0, medium: 0, low: 0 };
    
    const priorityCounts = {
      'high': 0,
      'medium': 0,
      'low': 0
    };
    
    tasks.forEach(task => {
      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority]++;
      } else {
        // Default to medium if priority is unknown
        priorityCounts['medium']++;
      }
    });
    
    return priorityCounts;
  }, [tasks]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((context.raw / total) * 100);
            return `${context.label}: ${context.raw} tasks (${percentage}%)`;
          }
        }
      }
    }
  };

  // Calculate completion rate
  const completionStats = useMemo(() => {
    if (!tasks.length) return { completed: 0, total: 0, rate: 0 };
    
    const completed = tasks.filter(task => task.status === 'completed').length;
    const total = tasks.length;
    const rate = Math.round((completed / total) * 100);
    
    return { completed, total, rate };
  }, [tasks]);

  return (
    <div className="h-64">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default TaskCompletionChart;
