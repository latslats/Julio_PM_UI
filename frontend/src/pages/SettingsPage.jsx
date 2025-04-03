import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiSettings, FiClock, FiSave, FiLoader } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from "@/components/ui/input"; 
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { useToast } from "@/hooks/use-toast"; 

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
  const [isSaving, setIsSaving] = useState(false); // State for save button loading
  const { toast } = useToast(); // Get toast function

  // Fetch initial settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
    setIsSaving(true); // Set saving state for button
    setError(null); // Clear previous errors
    try {
      const settingsToSave = {
        auto_pause_enabled: isEnabled,
        // Only send time if enabled is true and time is set
        auto_pause_time: isEnabled && time ? time : null,
      };

      const response = await api.put('/settings', settingsToSave);
      const result = response.data;

      // Show success toast
      toast({
        title: "Settings Saved",
        description: "Your application settings have been updated.",
      });

      // Optionally update state from response if backend formats differently
      setIsEnabled(result.settings.auto_pause_enabled);
      setTime(result.settings.auto_pause_time || '');

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
      // Show error toast
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: errorMessage,
      });

    } finally {
      setIsSaving(false); // Reset saving state regardless of outcome
    }
  };

  // Handle toggle change
  const handleToggleChange = (checked) => { 
    setIsEnabled(checked);
    // Optionally clear time if disabling, or set default if enabling
    if (!checked) {
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

  if (error && !isSaving) { // Show general fetch error only if not currently saving
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="mb-3">{error}</p>
        <Button 
          onClick={fetchSettings} 
          className="inline-flex items-center"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-secondary-900">Settings</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-500/10 mr-3">
              <FiSettings className="h-6 w-6 text-primary-600" />
            </div>
            <CardTitle className="text-lg font-medium text-secondary-900">Application Settings</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="border-b border-secondary-100 pb-6">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-secondary-100 mr-3">
                  <FiClock className="h-5 w-5 text-secondary-600" />
                </div>
                <h3 className="text-md font-medium text-secondary-800">Auto-Pause Timers</h3>
              </div>

              <div className="flex items-center justify-between mb-4 pl-10">
                <Label htmlFor="auto-pause-toggle" className="cursor-pointer">Enable Auto-Pause</Label> 
                <Switch
                  id="auto-pause-toggle"
                  checked={isEnabled}
                  onCheckedChange={handleToggleChange} 
                />
              </div>

              <div className={`pl-10 ${!isEnabled ? 'opacity-50' : ''}`}>
                <Label htmlFor="auto-pause-time" className="block text-sm font-medium text-secondary-700 mb-1">Pause Time (Daily)</Label>
                <Input
                  id="auto-pause-time"
                  type="text" 
                  pattern="[0-9]{2}:[0-9]{2}" 
                  placeholder="HH:MM" 
                  value={time}
                  onChange={handleTimeChange}
                  disabled={!isEnabled}
                  className={`w-32 ${!isEnabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="text-xs text-secondary-500 mt-1">Timers running at or after this time will be automatically paused.</p>
              </div>
            </div>

            <div className="flex justify-end items-center">
              {/* --- Updated Save Button using isSaving state --- */}
              <Button
                onClick={handleSave}
                disabled={isSaving} // Disable button while saving
              >
                {isSaving ? ( // Show loading indicator when saving
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
              </Button>
            </div>
          </div>
        </CardContent> 
      </Card>

    </div>
  );
};

export default SettingsPage;
