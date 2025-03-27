import { useState } from 'react'
import { useProjects } from '../context/ProjectContext'
import { FiDownload, FiCalendar, FiPieChart, FiBarChart2, FiTrendingUp } from 'react-icons/fi'

const Reports = () => {
  const { projects, tasks, timeEntries, loading } = useProjects()
  const [reportType, setReportType] = useState('time')
  const [dateRange, setDateRange] = useState('week')
  
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
        <h1 className="text-2xl font-semibold text-secondary-900">Reports</h1>
        <button className="btn btn-secondary flex items-center">
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
              className="input w-full"
            >
              <option value="project">Project</option>
              <option value="task">Task</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
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
              <button className={`p-1.5 rounded-lg ${
                reportType === 'time' ? 'bg-primary-50 text-primary-600' : 'text-secondary-500 hover:bg-secondary-100'
              }`}>
                <FiBarChart2 className="h-5 w-5" />
              </button>
              <button className={`p-1.5 rounded-lg ${
                reportType === 'projects' ? 'bg-primary-50 text-primary-600' : 'text-secondary-500 hover:bg-secondary-100'
              }`}>
                <FiTrendingUp className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="h-64 flex items-center justify-center bg-secondary-50 rounded-lg">
            {/* Chart placeholder */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 mb-3">
                <FiBarChart2 className="h-8 w-8" />
              </div>
              <p className="text-secondary-600">Chart visualization will appear here</p>
              <p className="text-sm text-secondary-500 mt-1">
                {reportType === 'time' ? 'Hours tracked per project' : 
                 reportType === 'projects' ? 'Project completion over time' : 
                 reportType === 'tasks' ? 'Tasks completed vs. pending' : 'Productivity trends'}
              </p>
            </div>
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
                  {reportType === 'time' ? '32h 15m' : 
                   reportType === 'projects' ? '68%' : 
                   reportType === 'tasks' ? '24/35' : '85%'}
                </p>
                <p className="text-sm text-secondary-500 mt-1">
                  {reportType === 'time' ? 'This week' : 
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
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#0ea5e9' }}
                  ></div>
                  <div className="ml-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-700">
                        {reportType === 'time' ? 'Website Redesign' : 
                         reportType === 'projects' ? 'In Progress' : 
                         reportType === 'tasks' ? 'High Priority' : 'Morning (8-12)'}
                      </span>
                      <span className="font-medium text-secondary-900">
                        {reportType === 'time' ? '12h 30m' : 
                         reportType === 'projects' ? '4' : 
                         reportType === 'tasks' ? '8' : '10h 15m'}
                      </span>
                    </div>
                    <div className="w-full bg-secondary-100 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full"
                        style={{ width: '45%', backgroundColor: '#0ea5e9' }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#8b5cf6' }}
                  ></div>
                  <div className="ml-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-700">
                        {reportType === 'time' ? 'Mobile App' : 
                         reportType === 'projects' ? 'Completed' : 
                         reportType === 'tasks' ? 'Medium Priority' : 'Afternoon (12-5)'}
                      </span>
                      <span className="font-medium text-secondary-900">
                        {reportType === 'time' ? '8h 45m' : 
                         reportType === 'projects' ? '2' : 
                         reportType === 'tasks' ? '12' : '15h 30m'}
                      </span>
                    </div>
                    <div className="w-full bg-secondary-100 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full"
                        style={{ width: '30%', backgroundColor: '#8b5cf6' }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#10b981' }}
                  ></div>
                  <div className="ml-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-700">
                        {reportType === 'time' ? 'Marketing' : 
                         reportType === 'projects' ? 'Not Started' : 
                         reportType === 'tasks' ? 'Low Priority' : 'Evening (5-8)'}
                      </span>
                      <span className="font-medium text-secondary-900">
                        {reportType === 'time' ? '6h 15m' : 
                         reportType === 'projects' ? '1' : 
                         reportType === 'tasks' ? '15' : '6h 30m'}
                      </span>
                    </div>
                    <div className="w-full bg-secondary-100 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full"
                        style={{ width: '25%', backgroundColor: '#10b981' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-secondary-700 mb-2">Insights</h3>
              <div className="bg-secondary-50 rounded-lg p-3 text-sm text-secondary-700">
                <p>
                  {reportType === 'time' 
                    ? 'Most time was spent on the Website Redesign project. Tuesday was your most productive day.'
                    : reportType === 'projects'
                    ? 'You completed 2 projects this month, which is 50% more than last month.'
                    : reportType === 'tasks'
                    ? 'You completed 8 high-priority tasks this week, a 33% improvement over last week.'
                    : 'Your productivity peaks between 9-11 AM. Consider scheduling important tasks during this time.'}
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
              {[1, 2, 3, 4, 5].map((item) => (
                <tr key={item} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 text-sm text-secondary-900">
                    {reportType === 'time' ? 'Website Redesign - Homepage Design' : 
                     reportType === 'projects' ? 'Website Redesign' : 
                     reportType === 'tasks' ? 'Design homepage mockup' : 'Monday, Mar 24'}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-700">
                    {reportType === 'time' ? 'Mar 26, 2025' : 
                     reportType === 'projects' ? 'In Progress' : 
                     reportType === 'tasks' ? 'Completed' : '8h 15m'}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-700">
                    {reportType === 'time' ? '2h 15m' : 
                     reportType === 'projects' ? '65%' : 
                     reportType === 'tasks' ? 'Mar 10, 2025' : '92%'}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-700">
                    {reportType === 'time' ? 'Completed initial mockups' : 
                     reportType === 'projects' ? '45h' : 
                     reportType === 'tasks' ? 'High' : '12'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports
