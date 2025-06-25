const express = require('express');
const pool = require('../database'); // Database connection pool
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const router = express.Router();

// GET /api/settings - Fetch the current settings
router.get('/', cacheMiddleware({
  ttl: 3600, // 1 hour cache for settings
  keyGenerator: () => 'cache:settings:main'
}), async (req, res, next) => {
  try {
    // Assuming settings always exist (created/defaulted in database.js)
    const result = await pool.query('SELECT "auto_pause_enabled", "auto_pause_time" FROM settings WHERE id = 1');

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

    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    next(err); // Pass error to the global error handler
  }
});

// PUT /api/settings - Update the settings
router.put('/', async (req, res, next) => {
  const { auto_pause_enabled, auto_pause_time } = req.body;

  // Basic Validation
  if (typeof auto_pause_enabled !== 'boolean') {
    return res.status(400).json({ message: 'Invalid value for auto_pause_enabled. Must be true or false.' });
  }
  // Validate time format (HH:MM) if enabled is true and time is provided
  if (auto_pause_enabled && auto_pause_time && !/^\d{2}:\d{2}$/.test(auto_pause_time)) {
     // Also check if time is valid, e.g., 00:00 to 23:59 (more complex regex needed for full validation)
     // For simplicity, we're just checking the basic format here. PostgreSQL will validate the actual time value.
    return res.status(400).json({ message: 'Invalid format for auto_pause_time. Must be HH:MM.' });
  }

  // Use NULL for time if auto-pause is disabled or time is empty/null
  const timeToSave = auto_pause_enabled && auto_pause_time ? `${auto_pause_time}:00` : null; // Append seconds for DB

  try {
    const result = await pool.query(
      'UPDATE settings SET "auto_pause_enabled" = $1, "auto_pause_time" = $2 WHERE id = 1 RETURNING "auto_pause_enabled", "auto_pause_time"',
      [auto_pause_enabled, timeToSave]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Settings not found (cannot update).' });
    }

     const updatedSettings = result.rows[0];
     // Format time back to HH:MM if needed for the response
     if (updatedSettings.auto_pause_time) {
       updatedSettings.auto_pause_time = updatedSettings.auto_pause_time.substring(0, 5);
     }

    // Invalidate settings cache
    await invalidateCache.settings();

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
