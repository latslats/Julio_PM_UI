import React from 'react';
import { FiClock, FiAlertCircle, FiCheckCircle, FiPieChart } from 'react-icons/fi';

/**
 * WaitingItemStats component
 * Displays statistics about waiting items
 * 
 * @param {Object} props - Component props
 * @param {Object} props.stats - Statistics data
 */
const WaitingItemStats = ({ stats }) => {
  // Default values if stats are not available
  const pendingCount = stats.byStatus?.pending || 0;
  const completedCount = stats.byStatus?.completed || 0;
  const inProgressCount = stats.byStatus?.['in-progress'] || 0;
  const cancelledCount = stats.byStatus?.cancelled || 0;
  
  const highPriorityCount = stats.byPriority?.high || 0;
  const avgWaitDays = stats.avgWaitDays || 0;
  const totalCount = stats.total || 0;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Waiting Items */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-4">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-primary-100 text-primary-600">
            <FiPieChart className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary-500">Total Requests</h3>
            <div className="mt-1">
              <p className="text-2xl font-semibold text-secondary-900">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between text-xs text-secondary-500">
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span>
            Pending: {pendingCount}
          </div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1"></span>
            In Progress: {inProgressCount}
          </div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-1"></span>
            Completed: {completedCount}
          </div>
        </div>
      </div>
      
      {/* High Priority */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-4">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600">
            <FiAlertCircle className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary-500">High Priority</h3>
            <div className="mt-1">
              <p className="text-2xl font-semibold text-secondary-900">{highPriorityCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-secondary-500">
          {highPriorityCount > 0 ? (
            <p>{Math.round((highPriorityCount / totalCount) * 100)}% of all requests are high priority</p>
          ) : (
            <p>No high priority requests at the moment</p>
          )}
        </div>
      </div>
      
      {/* Average Wait Time */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-4">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <FiClock className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary-500">Average Wait Time</h3>
            <div className="mt-1">
              <p className="text-2xl font-semibold text-secondary-900">
                {typeof avgWaitDays === 'number' ? avgWaitDays.toFixed(1) : '0.0'} days
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-secondary-500">
          {completedCount > 0 ? (
            <p>Based on {completedCount} completed requests</p>
          ) : (
            <p>No completed requests yet</p>
          )}
        </div>
      </div>
      
      {/* Completion Rate */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-100 p-4">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <FiCheckCircle className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary-500">Completion Rate</h3>
            <div className="mt-1">
              <p className="text-2xl font-semibold text-secondary-900">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-secondary-500">
          <p>{completedCount} of {totalCount} requests completed</p>
        </div>
      </div>
    </div>
  );
};

export default WaitingItemStats;
