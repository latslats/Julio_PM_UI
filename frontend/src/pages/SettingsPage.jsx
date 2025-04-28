import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../components/common/BackButton';
import axios from 'axios';
import {
  FiSettings,
  FiClock,
  FiSave,
  FiLoader,
  FiList,
  FiChevronRight,
  FiTarget,
  FiCoffee,
  FiPlay,
  FiPause,
  FiRefreshCw
} from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  // Auto-pause settings
  const [isEnabled, setIsEnabled] = useState(false);
  const [time, setTime] = useState(''); // HH:MM format

  // Pomodoro settings
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [sessionsBeforeLongBreak, setSessionsBeforeLongBreak] = useState(4);
  const [autoStartNext, setAutoStartNext] = useState(true);
  const [pauseTasksDuringBreak, setPauseTasksDuringBreak] = useState(false);
  const [resumeTasksAfterBreak, setResumeTasksAfterBreak] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("general");
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

      // Auto-pause settings
      setIsEnabled(data.auto_pause_enabled || false);
      setTime(data.auto_pause_time || ''); // Expects HH:MM or empty

      // Pomodoro settings
      setWorkDuration(data.pomodoro_work_duration_minutes || 25);
      setBreakDuration(data.pomodoro_break_duration_minutes || 5);
      setLongBreakDuration(data.pomodoro_long_break_duration_minutes || 15);
      setSessionsBeforeLongBreak(data.pomodoro_sessions_before_long_break || 4);
      setAutoStartNext(data.pomodoro_auto_start_next !== undefined ? data.pomodoro_auto_start_next : true);
      setPauseTasksDuringBreak(data.pomodoro_pause_tasks_during_break || false);
      setResumeTasksAfterBreak(data.pomodoro_resume_tasks_after_break || false);

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
        // Auto-pause settings
        auto_pause_enabled: isEnabled,
        auto_pause_time: isEnabled && time ? time : null,

        // Pomodoro settings
        pomodoro_work_duration_minutes: parseInt(workDuration),
        pomodoro_break_duration_minutes: parseInt(breakDuration),
        pomodoro_long_break_duration_minutes: parseInt(longBreakDuration),
        pomodoro_sessions_before_long_break: parseInt(sessionsBeforeLongBreak),
        pomodoro_auto_start_next: autoStartNext,
        pomodoro_pause_tasks_during_break: pauseTasksDuringBreak,
        pomodoro_resume_tasks_after_break: resumeTasksAfterBreak
      };

      const response = await api.put('/settings', settingsToSave);
      const result = response.data;

      // Show success toast
      toast({
        title: "Settings Saved",
        description: "Your application settings have been updated.",
      });

      // Update state from response
      const updatedSettings = result.settings;

      // Auto-pause settings
      setIsEnabled(updatedSettings.auto_pause_enabled);
      setTime(updatedSettings.auto_pause_time || '');

      // Pomodoro settings
      setWorkDuration(updatedSettings.pomodoro_work_duration_minutes || 25);
      setBreakDuration(updatedSettings.pomodoro_break_duration_minutes || 5);
      setLongBreakDuration(updatedSettings.pomodoro_long_break_duration_minutes || 15);
      setSessionsBeforeLongBreak(updatedSettings.pomodoro_sessions_before_long_break || 4);
      setAutoStartNext(updatedSettings.pomodoro_auto_start_next !== undefined ? updatedSettings.pomodoro_auto_start_next : true);
      setPauseTasksDuringBreak(updatedSettings.pomodoro_pause_tasks_during_break || false);
      setResumeTasksAfterBreak(updatedSettings.pomodoro_resume_tasks_after_break || false);

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

  // Handle toggle change for auto-pause
  const handleToggleChange = (checked) => {
    setIsEnabled(checked);
    // Optionally clear time if disabling, or set default if enabling
    if (!checked) {
      // setTime(''); // Decide if time should be cleared when disabled
    }
  };

  // Handle time change for auto-pause
  const handleTimeChange = (event) => {
    setTime(event.target.value);
  };

  // Handle number input changes for Pomodoro settings
  const handleNumberChange = (setter) => (event) => {
    const value = event.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setter(value);
    }
  };

  // Handle toggle changes for Pomodoro settings
  const handlePomodoroToggle = (setter) => (checked) => {
    setter(checked);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BackButton to="/" className="-ml-2" />
          <h1 className="text-2xl font-semibold text-secondary-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <FiSettings className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="pomodoro" className="flex items-center gap-2">
              <FiTarget className="h-4 w-4" />
              <span>Pomodoro</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <FiList className="h-4 w-4" />
              <span>Features</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card className="overflow-hidden border border-secondary-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-secondary-100 pb-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-primary-500/10 mr-3">
                    <FiSettings className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-medium text-secondary-900">Application Settings</CardTitle>
                    <CardDescription className="text-secondary-500 mt-1">
                      Configure general application behavior
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-8">
                  <div className="bg-white rounded-lg p-6 border border-secondary-100 shadow-sm">
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
                        type="time"
                        value={time}
                        onChange={handleTimeChange}
                        disabled={!isEnabled}
                        className={`w-32 ${!isEnabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <p className="text-xs text-secondary-500 mt-1">Timers running at or after this time will be automatically paused.</p>
                    </div>
                  </div>

                  <div className="flex justify-end items-center">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-primary-500 hover:bg-primary-600 text-white"
                    >
                      {isSaving ? (
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
          </TabsContent>

          {/* Pomodoro Settings Tab */}
          <TabsContent value="pomodoro" className="space-y-6">
            <Card className="overflow-hidden border border-secondary-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-secondary-100 pb-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-primary-500/10 mr-3">
                    <FiTarget className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-medium text-secondary-900">Pomodoro Timer</CardTitle>
                    <CardDescription className="text-secondary-500 mt-1">
                      Configure your focus sessions and breaks
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-8">
                  {/* Pomodoro Preview */}
                  <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-6 border border-secondary-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between">
                      <div className="mb-4 sm:mb-0">
                        <h3 className="text-lg font-medium text-secondary-900 mb-1">Focus Session Preview</h3>
                        <p className="text-sm text-secondary-600">Your current Pomodoro cycle</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col items-center">
                          <div className="text-xs text-secondary-500 mb-1">Work</div>
                          <div className="bg-white rounded-lg px-3 py-2 border border-secondary-200 shadow-sm">
                            <span className="font-mono text-primary-700">{workDuration}:00</span>
                          </div>
                        </div>
                        <FiChevronRight className="text-secondary-400" />
                        <div className="flex flex-col items-center">
                          <div className="text-xs text-secondary-500 mb-1">Break</div>
                          <div className="bg-white rounded-lg px-3 py-2 border border-secondary-200 shadow-sm">
                            <span className="font-mono text-green-600">{breakDuration}:00</span>
                          </div>
                        </div>
                        <FiChevronRight className="text-secondary-400" />
                        <div className="flex flex-col items-center">
                          <div className="text-xs text-secondary-500 mb-1">Long Break</div>
                          <div className="bg-white rounded-lg px-3 py-2 border border-secondary-200 shadow-sm">
                            <span className="font-mono text-blue-600">{longBreakDuration}:00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Durations */}
                  <div className="bg-white rounded-lg p-6 border border-secondary-100 shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="p-2 rounded-lg bg-secondary-100 mr-3">
                        <FiClock className="h-5 w-5 text-secondary-600" />
                      </div>
                      <h3 className="text-md font-medium text-secondary-800">Session Durations</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-10">
                      <div>
                        <Label htmlFor="work-duration" className="block text-sm font-medium text-secondary-700 mb-1">
                          Work Duration (minutes)
                        </Label>
                        <Input
                          id="work-duration"
                          type="number"
                          min="1"
                          max="120"
                          value={workDuration}
                          onChange={handleNumberChange(setWorkDuration)}
                          className="w-24"
                        />
                        <p className="text-xs text-secondary-500 mt-1">Recommended: 25 minutes</p>
                      </div>

                      <div>
                        <Label htmlFor="break-duration" className="block text-sm font-medium text-secondary-700 mb-1">
                          Break Duration (minutes)
                        </Label>
                        <Input
                          id="break-duration"
                          type="number"
                          min="1"
                          max="30"
                          value={breakDuration}
                          onChange={handleNumberChange(setBreakDuration)}
                          className="w-24"
                        />
                        <p className="text-xs text-secondary-500 mt-1">Recommended: 5 minutes</p>
                      </div>

                      <div>
                        <Label htmlFor="long-break-duration" className="block text-sm font-medium text-secondary-700 mb-1">
                          Long Break Duration (minutes)
                        </Label>
                        <Input
                          id="long-break-duration"
                          type="number"
                          min="1"
                          max="60"
                          value={longBreakDuration}
                          onChange={handleNumberChange(setLongBreakDuration)}
                          className="w-24"
                        />
                        <p className="text-xs text-secondary-500 mt-1">Recommended: 15 minutes</p>
                      </div>

                      <div>
                        <Label htmlFor="sessions-before-long-break" className="block text-sm font-medium text-secondary-700 mb-1">
                          Sessions Before Long Break
                        </Label>
                        <Input
                          id="sessions-before-long-break"
                          type="number"
                          min="1"
                          max="10"
                          value={sessionsBeforeLongBreak}
                          onChange={handleNumberChange(setSessionsBeforeLongBreak)}
                          className="w-24"
                        />
                        <p className="text-xs text-secondary-500 mt-1">Recommended: 4 sessions</p>
                      </div>
                    </div>
                  </div>

                  {/* Behavior Settings */}
                  <div className="bg-white rounded-lg p-6 border border-secondary-100 shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="p-2 rounded-lg bg-secondary-100 mr-3">
                        <FiPlay className="h-5 w-5 text-secondary-600" />
                      </div>
                      <h3 className="text-md font-medium text-secondary-800">Behavior Settings</h3>
                    </div>

                    <div className="space-y-4 pl-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="auto-start-next" className="cursor-pointer">Auto-start Next Session</Label>
                          <p className="text-xs text-secondary-500 mt-1">Automatically start the next work/break session when the current one ends</p>
                        </div>
                        <Switch
                          id="auto-start-next"
                          checked={autoStartNext}
                          onCheckedChange={handlePomodoroToggle(setAutoStartNext)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="pause-tasks-during-break" className="cursor-pointer">Pause Tasks During Breaks</Label>
                          <p className="text-xs text-secondary-500 mt-1">Automatically pause all running task timers when a break starts</p>
                        </div>
                        <Switch
                          id="pause-tasks-during-break"
                          checked={pauseTasksDuringBreak}
                          onCheckedChange={handlePomodoroToggle(setPauseTasksDuringBreak)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="resume-tasks-after-break" className="cursor-pointer">Resume Tasks After Breaks</Label>
                          <p className="text-xs text-secondary-500 mt-1">Automatically resume paused task timers when a break ends</p>
                        </div>
                        <Switch
                          id="resume-tasks-after-break"
                          checked={resumeTasksAfterBreak}
                          onCheckedChange={handlePomodoroToggle(setResumeTasksAfterBreak)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-primary-500 hover:bg-primary-600 text-white"
                    >
                      {isSaving ? (
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
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card className="overflow-hidden border border-secondary-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-secondary-100 pb-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-primary-500/10 mr-3">
                    <FiList className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-medium text-secondary-900">Features & Modules</CardTitle>
                    <CardDescription className="text-secondary-500 mt-1">
                      Manage application modules and features
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Time Tracking Feature */}
                  <div className="bg-white rounded-lg p-6 border border-secondary-100 shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="p-2 rounded-lg bg-secondary-100 mr-3">
                        <FiClock className="h-5 w-5 text-secondary-600" />
                      </div>
                      <h3 className="text-md font-medium text-secondary-800">Time Tracking</h3>
                    </div>

                    <div className="pl-10 mb-4">
                      <p className="text-sm text-secondary-600 mb-4">
                        Manage your time entries and view reports on how your time is spent across projects and tasks.
                      </p>

                      <Link to="/time-entries">
                        <Button variant="outline" className="flex items-center w-full sm:w-auto">
                          <FiClock className="mr-2 h-4 w-4" />
                          Manage Time Entries
                          <FiChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Focus Mode Feature */}
                  <div className="bg-white rounded-lg p-6 border border-secondary-100 shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="p-2 rounded-lg bg-secondary-100 mr-3">
                        <FiTarget className="h-5 w-5 text-secondary-600" />
                      </div>
                      <h3 className="text-md font-medium text-secondary-800">Focus Mode</h3>
                    </div>

                    <div className="pl-10 mb-4">
                      <p className="text-sm text-secondary-600 mb-4">
                        Enter a distraction-free environment to concentrate on your tasks with the Pomodoro technique.
                      </p>

                      <Link to="/">
                        <Button variant="outline" className="flex items-center w-full sm:w-auto">
                          <FiTarget className="mr-2 h-4 w-4" />
                          Go to Dashboard
                          <FiChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
