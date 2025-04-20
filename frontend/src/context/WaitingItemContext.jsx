import { createContext, useContext, useState, useEffect } from 'react';
import { useNotification } from './NotificationContext';

// Create the context
const WaitingItemContext = createContext();

/**
 * Provider component for waiting items functionality
 * Manages state and API calls for waiting items and timeline events
 */
export function WaitingItemProvider({ children }) {
  const [waitingItems, setWaitingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    byStatus: {},
    byPriority: {},
    avgWaitDays: 0,
    total: 0
  });
  const { showNotification } = useNotification();
  
  // Base API URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  /**
   * Helper function to make API requests
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data or error
   */
  const apiRequest = async (endpoint, options = {}) => {
    try {
      const url = `${API_BASE_URL}/waiting-items${endpoint}`;
      
      // Set default headers if not provided
      if (!options.headers) {
        options.headers = {
          'Content-Type': 'application/json'
        };
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        } catch (e) {
          errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // If response has content, parse it, otherwise return success status
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
         return { success: true, data: await response.json() };
      } else {
         return { success: true }; // For DELETE or other requests with no body response
      }
    } catch (err) {
      console.error('API Request Error:', err);
      return { success: false, message: err.message };
    }
  };

  /**
   * Fetch all waiting items
   * @param {string} projectId - Optional project ID to filter by
   */
  const fetchWaitingItems = async (projectId = null) => {
    setLoading(true);
    try {
      const endpoint = projectId ? `?projectId=${projectId}` : '';
      const result = await apiRequest(endpoint);
      
      if (result.success) {
        setWaitingItems(result.data);
      } else {
        showNotification('error', `Failed to fetch waiting items: ${result.message}`);
      }
    } catch (err) {
      console.error('Error fetching waiting items:', err);
      showNotification('error', `Failed to fetch waiting items: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch statistics for waiting items
   * @param {string} projectId - Optional project ID to filter by
   */
  const fetchStats = async (projectId = null) => {
    try {
      const endpoint = `/stats/overview${projectId ? `?projectId=${projectId}` : ''}`;
      const result = await apiRequest(endpoint);
      
      if (result.success) {
        // Ensure avgWaitDays is always a number
        const processedStats = {
          ...result.data,
          avgWaitDays: typeof result.data.avgWaitDays === 'number' ? result.data.avgWaitDays : 0
        };
        setStats(processedStats);
      } else {
        console.error('Failed to fetch waiting items stats:', result.message);
      }
    } catch (err) {
      console.error('Error fetching waiting items stats:', err);
    }
  };

  /**
   * Create a new waiting item
   * @param {Object} waitingItemData - Data for the new waiting item
   * @returns {Promise<Object>} Result of the operation
   */
  const createWaitingItem = async (waitingItemData) => {
    setLoading(true);
    try {
      const result = await apiRequest('', {
        method: 'POST',
        body: JSON.stringify(waitingItemData),
      });
      
      if (result.success) {
        await fetchWaitingItems();
        showNotification('success', `Request "${waitingItemData.requestType}" created successfully`);
        await fetchStats(waitingItemData.projectId);
        return { success: true };
      } else {
        showNotification('error', `Failed to create request: ${result.message}`);
        return result;
      }
    } catch (err) {
      console.error('Error creating waiting item:', err);
      showNotification('error', `Failed to create request: ${err.message}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing waiting item
   * @param {string} id - ID of the waiting item to update
   * @param {Object} waitingItemData - Updated data
   * @returns {Promise<Object>} Result of the operation
   */
  const updateWaitingItem = async (id, waitingItemData) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/${id}`, {
        method: 'PUT',
        body: JSON.stringify(waitingItemData),
      });
      
      if (result.success) {
        setWaitingItems(prev => prev.map(item => item.id === id ? result.data : item));
        showNotification('success', `Request updated successfully`);
        await fetchStats(waitingItemData.projectId);
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to update request: ${result.message}`);
        return result;
      }
    } catch (err) {
      console.error('Error updating waiting item:', err);
      showNotification('error', `Failed to update request: ${err.message}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a waiting item
   * @param {string} id - ID of the waiting item to delete
   * @param {string} projectId - Project ID for refreshing stats
   * @returns {Promise<Object>} Result of the operation
   */
  const deleteWaitingItem = async (id, projectId) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/${id}`, {
        method: 'DELETE',
      });
      
      if (result.success) {
        setWaitingItems(prev => prev.filter(item => item.id !== id));
        showNotification('success', 'Request deleted successfully');
        await fetchStats(projectId);
        return { success: true };
      } else {
        showNotification('error', `Failed to delete request: ${result.message}`);
        return result;
      }
    } catch (err) {
      console.error('Error deleting waiting item:', err);
      showNotification('error', `Failed to delete request: ${err.message}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a timeline event to a waiting item
   * @param {string} waitingItemId - ID of the waiting item
   * @param {Object} eventData - Timeline event data
   * @returns {Promise<Object>} Result of the operation
   */
  const addTimelineEvent = async (waitingItemId, eventData) => {
    try {
      const result = await apiRequest(`/${waitingItemId}/timeline`, {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      
      if (result.success) {
        showNotification('success', 'Timeline event added successfully');
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to add timeline event: ${result.message}`);
        return result;
      }
    } catch (err) {
      console.error('Error adding timeline event:', err);
      showNotification('error', `Failed to add timeline event: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  /**
   * Get a specific waiting item with its timeline events
   * @param {string} id - ID of the waiting item
   * @returns {Promise<Object>} Result of the operation
   */
  const getWaitingItemDetails = async (id) => {
    try {
      const result = await apiRequest(`/${id}`);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        showNotification('error', `Failed to fetch request details: ${result.message}`);
        return result;
      }
    } catch (err) {
      console.error('Error fetching waiting item details:', err);
      showNotification('error', `Failed to fetch request details: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  // Context value to be provided
  const contextValue = {
    waitingItems,
    stats,
    loading,
    fetchWaitingItems,
    fetchStats,
    createWaitingItem,
    updateWaitingItem,
    deleteWaitingItem,
    addTimelineEvent,
    getWaitingItemDetails
  };

  return (
    <WaitingItemContext.Provider value={contextValue}>
      {children}
    </WaitingItemContext.Provider>
  );
}

/**
 * Custom hook to use the waiting item context
 * @returns {Object} Waiting item context
 */
export function useWaitingItems() {
  const context = useContext(WaitingItemContext);
  if (!context) {
    throw new Error('useWaitingItems must be used within a WaitingItemProvider');
  }
  return context;
}
