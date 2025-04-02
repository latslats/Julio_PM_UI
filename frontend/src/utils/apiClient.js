/**
 * API Client utility using axios for consistent API requests
 */
import axios from 'axios';

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

/**
 * Handle API requests with consistent error handling and response formatting
 * 
 * @param {Function} apiCall - The axios API call function to execute
 * @returns {Object} Response object with success status and data or error message
 */
export const handleApiRequest = async (apiCall) => {
  try {
    const response = await apiCall();
    return { 
      success: true, 
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('API Request Error:', error);
    
    // Extract error message from axios error object
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { data, status } = error.response;
      errorMessage = data.message || data.error || `HTTP error! status: ${status}`;
      console.error('API response error:', status, data);
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from server';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
      status: error.response?.status
    };
  }
};

export default apiClient;
