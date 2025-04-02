import React, { useState, useEffect, useCallback } from 'react';

// Define the API base URL (adjust if necessary)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
      const response = await fetch(`${API_BASE_URL}/settings`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setIsEnabled(data.auto_pause_enabled || false);
      setTime(data.auto_pause_time || ''); // Expects HH:MM or empty
    } catch (e) {
      console.error("Failed to fetch settings:", e);
      setError('Failed to load settings. Please try again later.');
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

      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      const result = await response.json(); // Read body regardless of ok status

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      setSaveStatus('success');
      // Optionally update state from response if backend formats differently
      setIsEnabled(result.settings.auto_pause_enabled);
      setTime(result.settings.auto_pause_time || '');

      setTimeout(() => setSaveStatus(''), 3000); // Clear success message after 3s

    } catch (e) {
      console.error("Failed to save settings:", e);
      setError(`Failed to save settings: ${e.message}`);
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
    return <div className="p-4">Loading settings...</div>;
  }

  if (error && saveStatus !== 'saving') { // Show general fetch error only if not currently saving
    return <div className="p-4 text-red-600">{error} <button onClick={fetchSettings} className="ml-2 text-blue-600 underline">Retry</button></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Settings</h1>

      <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Auto-Pause Timers</h2>

        <div className="flex items-center justify-between mb-4">
          <label htmlFor="auto-pause-toggle" className="text-sm font-medium text-gray-600">
            Enable Auto-Pause
          </label>
          {/* Basic Toggle Switch (Replace with styled component if available) */}
          <input
            type="checkbox"
            id="auto-pause-toggle"
            checked={isEnabled}
            onChange={handleToggleChange}
            className="form-checkbox h-5 w-5 text-blue-600" // Basic styling
          />
        </div>

        <div className={`mb-4 ${!isEnabled ? 'opacity-50' : ''}`}>
          <label htmlFor="auto-pause-time" className="block text-sm font-medium text-gray-600 mb-1">
            Pause Time (Daily)
          </label>
          <input
            type="time"
            id="auto-pause-time"
            value={time}
            onChange={handleTimeChange}
            disabled={!isEnabled}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          />
           <p className="text-xs text-gray-500 mt-1">Timers running at or after this time will be automatically paused.</p>
        </div>

        <div className="flex justify-end items-center mt-6">
           {/* Save Status Indicators */}
           {saveStatus === 'saving' && <span className="text-sm text-gray-500 mr-3">Saving...</span>}
           {saveStatus === 'success' && <span className="text-sm text-green-600 mr-3">Settings saved!</span>}
           {saveStatus === 'error' && <span className="text-sm text-red-600 mr-3">{error || 'Save failed.'}</span>}

          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
