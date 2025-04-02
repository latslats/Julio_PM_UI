import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiSettings, FiClock, FiSave, FiLoader } from 'react-icons/fi';

// Define the API base URL (adjust if necessary)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SettingsPage = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [time, setTime] = useState(''); // HH:MM format
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'success', 'error'

  // Fetch initial settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSaveStatus(''); // Reset save status on fetch
    try {
      const response = await api.get('/settings');
      const data = response.data;
      setIsEnabled(data.auto_pause_enabled || false);
      setTime(data.auto_pause_time || ''); // Expects HH:MM or empty
    } catch (e) {
      console.error("Failed to fetch settings:", e);
      // Handle axios error
      let errorMessage = 'Failed to load settings. Please try again later.';
      if (e.response) {
        errorMessage = e.response.data?.message || `HTTP error! status: ${e.response.status}`;
      } else if (e.request) {
        errorMessage = 'No response received from server';
      } else {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle saving settings
  const handleSave = async () => {
    setSaveStatus('saving');
    setError(null); // Clear previous errors
    try {
      const settingsToSave = {
        auto_pause_enabled: isEnabled,
        // Only send time if enabled is true and time is set
        auto_pause_time: isEnabled && time ? time : null,
      };

      const response = await api.put('/settings', settingsToSave);
      const result = response.data;

      setSaveStatus('success');
      // Optionally update state from response if backend formats differently
      setIsEnabled(result.settings.auto_pause_enabled);
      setTime(result.settings.auto_pause_time || '');

      setTimeout(() => setSaveStatus(''), 3000); // Clear success message after 3s

    } catch (e) {
      console.error("Failed to save settings:", e);
      
      // Handle axios error
      let errorMessage = 'Failed to save settings.';
      if (e.response) {
        errorMessage = e.response.data?.message || `HTTP error! status: ${e.response.status}`;
      } else if (e.request) {
        errorMessage = 'No response received from server';
      } else {
        errorMessage = e.message;
      }
      
      setError(`Failed to save settings: ${errorMessage}`);
      setSaveStatus('error');
    }
  };

  // Handle toggle change
  const handleToggleChange = (event) => {
    setIsEnabled(event.target.checked);
    // Optionally clear time if disabling, or set default if enabling
    if (!event.target.checked) {
      // setTime(''); // Decide if time should be cleared when disabled
    }
  };

  // Handle time change
  const handleTimeChange = (event) => {
    setTime(event.target.value);
  };


  // Render logic
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-3 text-secondary-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error && saveStatus !== 'saving') { // Show general fetch error only if not currently saving
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="mb-3">{error}</p>
        <button 
          onClick={fetchSettings} 
          className="btn btn-secondary inline-flex items-center"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-secondary-900">Settings</h1>
      </div>

      <div className="card max-w-2xl">
        <div className="flex items-center mb-6">
          <div className="p-3 rounded-lg bg-primary-500/10 mr-3">
            <FiSettings className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="text-lg font-medium text-secondary-900">Application Settings</h2>
        </div>

        <div className="space-y-6">
          <div className="border-b border-secondary-100 pb-6">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-lg bg-secondary-100 mr-3">
                <FiClock className="h-5 w-5 text-secondary-600" />
              </div>
              <h3 className="text-md font-medium text-secondary-800">Auto-Pause Timers</h3>
            </div>

            <div className="flex items-center justify-between mb-4 pl-10">
              <label htmlFor="auto-pause-toggle" className="text-sm font-medium text-secondary-700">
                Enable Auto-Pause
              </label>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="auto-pause-toggle"
                  checked={isEnabled}
                  onChange={handleToggleChange}
                  className="sr-only"
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isEnabled ? 'bg-primary-500' : 'bg-secondary-200'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform ${isEnabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </div>

            <div className={`pl-10 ${!isEnabled ? 'opacity-50' : ''}`}>
              <label htmlFor="auto-pause-time" className="block text-sm font-medium text-secondary-700 mb-1">
                Pause Time (Daily)
              </label>
              <input
                type="time"
                id="auto-pause-time"
                value={time}
                onChange={handleTimeChange}
                disabled={!isEnabled}
                className="input w-full max-w-xs"
              />
              <p className="text-xs text-secondary-500 mt-1">Timers running at or after this time will be automatically paused.</p>
            </div>
          </div>

          <div className="flex justify-end items-center">
            {/* Save Status Indicators */}
            {saveStatus === 'success' && (
              <span className="text-sm text-green-600 mr-3 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Settings saved!
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 mr-3">
                {error || 'Save failed.'}
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="btn btn-primary flex items-center justify-center min-w-[120px]"
            >
              {saveStatus === 'saving' ? (
                <>
                  <FiLoader className="animate-spin mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="mr-1.5 h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
