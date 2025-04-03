import React from 'react';
import { FiClock, FiAlertCircle, FiCheckCircle, FiPieChart } from 'react-icons/fi';

/**
 * WaitingItemStats component
 * Displays statistics about waiting items with a modern, minimalistic design
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-primary-50 to-primary-100">
              <FiPieChart className="h-5 w-5 text-primary-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-secondary-500">Total Requests</h3>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-semibold text-secondary-900">{totalCount}</p>
          </div>
        </div>
        <div className="bg-secondary-50 px-4 py-2 flex flex-col space-y-1 text-xs text-secondary-600">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
            Pending: {pendingCount}
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
            In Progress: {inProgressCount}
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
            Completed: {completedCount}
          </span>
        </div>
      </div>
      
      {/* High Priority */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-red-50 to-red-100">
              <FiAlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-secondary-500">High Priority</h3>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-semibold text-secondary-900">{highPriorityCount}</p>
          </div>
        </div>
        <div className="bg-secondary-50 px-4 py-2 text-xs text-secondary-600">
          {highPriorityCount > 0 ? (
            <p>{Math.round((highPriorityCount / totalCount) * 100)}% of all requests are high priority</p>
          ) : (
            <p>No high priority requests at the moment</p>
          )}
        </div>
      </div>
      
      {/* Average Wait Time */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-blue-50 to-blue-100">
              <FiClock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-secondary-500">Average Wait Time</h3>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-semibold text-secondary-900">
              {typeof avgWaitDays === 'number' ? avgWaitDays.toFixed(1) : '0.0'} <span className="text-xl">days</span>
            </p>
          </div>
        </div>
        <div className="bg-secondary-50 px-4 py-2 text-xs text-secondary-600">
          {completedCount > 0 ? (
            <p>Based on {completedCount} completed requests</p>
          ) : (
            <p>No completed requests yet</p>
          )}
        </div>
      </div>
      
      {/* Completion Rate */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-green-50 to-green-100">
              <FiCheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-secondary-500">Completion Rate</h3>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-semibold text-secondary-900">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </p>
          </div>
        </div>
        <div className="bg-secondary-50 px-4 py-2 text-xs text-secondary-600">
          <p>{completedCount} of {totalCount} requests completed</p>
        </div>
      </div>
    </div>
  );
};

export default WaitingItemStats;
