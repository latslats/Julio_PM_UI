const express = require('express');
const pool = require('../database'); // Database connection pool

const router = express.Router();

// GET /api/settings - Fetch the current settings
router.get('/', async (req, res, next) => {
  try {
    // Assuming settings always exist (created/defaulted in database.js)
    const result = await pool.query(`
      SELECT
        "auto_pause_enabled",
        "auto_pause_time",
        "pomodoro_work_duration",
        "pomodoro_break_duration",
        "pomodoro_long_break_duration",
        "pomodoro_sessions_before_long_break",
        "pomodoro_auto_start_next",
        "pomodoro_pause_tasks_during_break",
        "pomodoro_resume_tasks_after_break"
      FROM settings
      WHERE id = 1
    `);

    if (result.rows.length === 0) {
      // This case should ideally not happen due to the default insert logic
      return res.status(404).json({ message: 'Settings not found.' });
    }

    const settings = result.rows[0];
    // Format time to HH:MM if it exists
    if (settings.auto_pause_time) {
      // The TIME type in PostgreSQL returns HH:MM:SS. We might only need HH:MM for input type="time".
      settings.auto_pause_time = settings.auto_pause_time.substring(0, 5);
    }

    // Convert pomodoro durations from seconds to minutes for frontend
    settings.pomodoro_work_duration_minutes = Math.floor(settings.pomodoro_work_duration / 60);
    settings.pomodoro_break_duration_minutes = Math.floor(settings.pomodoro_break_duration / 60);
    settings.pomodoro_long_break_duration_minutes = Math.floor(settings.pomodoro_long_break_duration / 60);

    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    next(err); // Pass error to the global error handler
  }
});

// PUT /api/settings - Update the settings
router.put('/', async (req, res, next) => {
  const {
    auto_pause_enabled,
    auto_pause_time,
    pomodoro_work_duration_minutes,
    pomodoro_break_duration_minutes,
    pomodoro_long_break_duration_minutes,
    pomodoro_sessions_before_long_break,
    pomodoro_auto_start_next,
    pomodoro_pause_tasks_during_break,
    pomodoro_resume_tasks_after_break
  } = req.body;

  // Basic Validation
  if (auto_pause_enabled !== undefined && typeof auto_pause_enabled !== 'boolean') {
    return res.status(400).json({ message: 'Invalid value for auto_pause_enabled. Must be true or false.' });
  }

  // Validate time format (HH:MM) if enabled is true and time is provided
  if (auto_pause_enabled && auto_pause_time && !/^\d{2}:\d{2}$/.test(auto_pause_time)) {
    // Also check if time is valid, e.g., 00:00 to 23:59 (more complex regex needed for full validation)
    // For simplicity, we're just checking the basic format here. PostgreSQL will validate the actual time value.
    return res.status(400).json({ message: 'Invalid format for auto_pause_time. Must be HH:MM.' });
  }

  // Validate pomodoro settings if provided
  if (pomodoro_work_duration_minutes !== undefined && (isNaN(pomodoro_work_duration_minutes) || pomodoro_work_duration_minutes <= 0)) {
    return res.status(400).json({ message: 'Invalid value for pomodoro_work_duration_minutes. Must be a positive number.' });
  }

  if (pomodoro_break_duration_minutes !== undefined && (isNaN(pomodoro_break_duration_minutes) || pomodoro_break_duration_minutes <= 0)) {
    return res.status(400).json({ message: 'Invalid value for pomodoro_break_duration_minutes. Must be a positive number.' });
  }

  if (pomodoro_long_break_duration_minutes !== undefined && (isNaN(pomodoro_long_break_duration_minutes) || pomodoro_long_break_duration_minutes <= 0)) {
    return res.status(400).json({ message: 'Invalid value for pomodoro_long_break_duration_minutes. Must be a positive number.' });
  }

  if (pomodoro_sessions_before_long_break !== undefined && (isNaN(pomodoro_sessions_before_long_break) || pomodoro_sessions_before_long_break <= 0)) {
    return res.status(400).json({ message: 'Invalid value for pomodoro_sessions_before_long_break. Must be a positive number.' });
  }

  // Convert minutes to seconds for storage
  const workDuration = pomodoro_work_duration_minutes !== undefined ? pomodoro_work_duration_minutes * 60 : undefined;
  const breakDuration = pomodoro_break_duration_minutes !== undefined ? pomodoro_break_duration_minutes * 60 : undefined;
  const longBreakDuration = pomodoro_long_break_duration_minutes !== undefined ? pomodoro_long_break_duration_minutes * 60 : undefined;

  // Use NULL for time if auto-pause is disabled or time is empty/null
  const timeToSave = auto_pause_enabled && auto_pause_time ? `${auto_pause_time}:00` : null; // Append seconds for DB

  // Build the query dynamically based on which fields are provided
  let updateFields = [];
  let queryParams = [];
  let paramIndex = 1;

  // Helper function to add a field to the update query if it's defined
  const addFieldIfDefined = (fieldName, value) => {
    if (value !== undefined) {
      updateFields.push(`"${fieldName}" = $${paramIndex}`);
      queryParams.push(value);
      paramIndex++;
      return true;
    }
    return false;
  };

  // Add fields to update query
  addFieldIfDefined('auto_pause_enabled', auto_pause_enabled);
  addFieldIfDefined('auto_pause_time', timeToSave);
  addFieldIfDefined('pomodoro_work_duration', workDuration);
  addFieldIfDefined('pomodoro_break_duration', breakDuration);
  addFieldIfDefined('pomodoro_long_break_duration', longBreakDuration);
  addFieldIfDefined('pomodoro_sessions_before_long_break', pomodoro_sessions_before_long_break);
  addFieldIfDefined('pomodoro_auto_start_next', pomodoro_auto_start_next);
  addFieldIfDefined('pomodoro_pause_tasks_during_break', pomodoro_pause_tasks_during_break);
  addFieldIfDefined('pomodoro_resume_tasks_after_break', pomodoro_resume_tasks_after_break);

  // If no fields to update, return early
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No valid fields provided for update.' });
  }

  // Build the final query
  const updateQuery = `
    UPDATE settings
    SET ${updateFields.join(', ')}
    WHERE id = 1
    RETURNING
      "auto_pause_enabled",
      "auto_pause_time",
      "pomodoro_work_duration",
      "pomodoro_break_duration",
      "pomodoro_long_break_duration",
      "pomodoro_sessions_before_long_break",
      "pomodoro_auto_start_next",
      "pomodoro_pause_tasks_during_break",
      "pomodoro_resume_tasks_after_break"
  `;

  try {
    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Settings not found (cannot update).' });
    }

    const updatedSettings = result.rows[0];

    // Format time back to HH:MM if needed for the response
    if (updatedSettings.auto_pause_time) {
      updatedSettings.auto_pause_time = updatedSettings.auto_pause_time.substring(0, 5);
    }

    // Convert pomodoro durations from seconds to minutes for frontend
    updatedSettings.pomodoro_work_duration_minutes = Math.floor(updatedSettings.pomodoro_work_duration / 60);
    updatedSettings.pomodoro_break_duration_minutes = Math.floor(updatedSettings.pomodoro_break_duration / 60);
    updatedSettings.pomodoro_long_break_duration_minutes = Math.floor(updatedSettings.pomodoro_long_break_duration / 60);

    res.json({ message: 'Settings updated successfully.', settings: updatedSettings });
  } catch (err) {
    console.error('Error updating settings:', err);
    // Check for specific DB errors like invalid time format if needed
    if (err.code === '22007') { // Example: Invalid datetime format error code in PostgreSQL
      return res.status(400).json({ message: 'Invalid time value provided for auto_pause_time.' });
    }
    next(err); // Pass other errors to the global error handler
  }
});

module.exports = router;
