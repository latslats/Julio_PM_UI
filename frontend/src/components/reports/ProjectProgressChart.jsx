import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
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
 * Component for displaying project progress as a doughnut chart
 * 
 * @param {Object} props Component props
 * @param {Array} props.projects Array of projects
 * @param {Array} props.tasks Array of tasks
 * @returns {JSX.Element} The ProjectProgressChart component
 */
const ProjectProgressChart = ({ projects, tasks }) => {
  // Process data for the chart
  const chartData = useMemo(() => {
    if (!projects.length || !tasks.length) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
        }]
      };
    }

    // Calculate project completion percentages
    const projectData = projects.map(project => {
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
      const totalTasks = projectTasks.length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return {
        name: project.name,
        completion: completionPercentage,
        color: project.color || '#0ea5e9'
      };
    });

    // Sort by completion percentage (descending)
    projectData.sort((a, b) => b.completion - a.completion);

    // Prepare chart data
    return {
      labels: projectData.map(p => p.name),
      datasets: [{
        label: 'Completion',
        data: projectData.map(p => p.completion),
        backgroundColor: projectData.map(p => p.color),
        borderWidth: 1,
      }]
    };
  }, [projects, tasks]);

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
            return `${context.label}: ${context.raw}% complete`;
          }
        }
      }
    },
    cutout: '70%'
  };

  // Calculate average project completion
  const averageCompletion = useMemo(() => {
    if (!projects.length || !tasks.length) return 0;
    
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
    
    return projectsWithTasks > 0 ? Math.round(totalCompletion / projectsWithTasks) : 0;
  }, [projects, tasks]);

  return (
    <div className="h-64 relative">
      <Doughnut data={chartData} options={options} />
      {projects.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-semibold text-secondary-900">{averageCompletion}%</p>
            <p className="text-xs text-secondary-500">Average completion</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectProgressChart;
