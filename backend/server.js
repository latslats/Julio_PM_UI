// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const pool = require('./database.js'); // Import the database connection pool directly

const projectRoutes = require('./routes/projects'); // Import project routes
const taskRoutes = require('./routes/tasks'); // Import task routes
const timeEntryRoutes = require('./routes/timeEntries'); // Import time entry routes
const waitingItemRoutes = require('./routes/waitingItems'); // Import waiting item routes
const reportRoutes = require('./routes/reports'); // Import report routes
const settingsRoutes = require('./routes/settings'); // Import settings routes

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Enable parsing JSON request bodies

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'TaskFlow API is running!' });
});

// Health Check Endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount API Routes
app.use('/api/projects', projectRoutes); // Use project routes
app.use('/api/tasks', taskRoutes); // Use task routes
app.use('/api/time-entries', timeEntryRoutes); // Use time entry routes
app.use('/api/waiting-items', waitingItemRoutes); // Use waiting item routes
app.use('/api/reports', reportRoutes); // Use report routes
app.use('/api/settings', settingsRoutes); // Use settings routes

// Error Handling Middleware (Basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 5001; // Use a different port than the frontend (usually 5173 or 3000)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Auto-Pause Cron Job ---

// Function to perform the pause logic for a specific time entry
const performPause = async (entryId, entryLastResumedAt, entryTotalPausedDuration) => {
    const now = new Date(); // Use Date object for calculations
    const lastResumed = new Date(entryLastResumedAt); // Convert stored timestamp back to Date

    // Calculate the duration of the last running segment in seconds
    const lastSegmentDuration = (now.getTime() - lastResumed.getTime()) / 1000;

    // Calculate the new total paused duration
    // Note: We are pausing now, so the time elapsed since last resume is ADDED to total runtime, not pause time.
    // The totalPausedDuration accumulates time ONLY when it *was* paused. We are just setting the state now.
    const newTotalPausedDuration = entryTotalPausedDuration; // Remains the same until resumed then paused again

    try {
        await pool.query(
            `UPDATE time_entries
             SET "isPaused" = true,
                 "pausedAt" = $1,
                 duration = COALESCE(duration, 0) + $2 -- Update total duration up to the pause point
             WHERE id = $3`,
            [now, lastSegmentDuration, entryId]
            // Using COALESCE for duration in case it was NULL (first run segment)
        );
        console.log(`[Auto-Pause] Paused time entry ${entryId} at ${now.toISOString()}`);
    } catch(err) {
        console.error(`[Auto-Pause] Error pausing time entry ${entryId}:`, err);
    }
};


// Function to check settings and pause applicable timers
const checkAndPauseTimers = async () => {
  console.log('[Cron] Running auto-pause check...');
  try {
    // 1. Get settings
    const settingsResult = await pool.query('SELECT "auto_pause_enabled", "auto_pause_time" FROM settings WHERE id = 1');
    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].auto_pause_enabled || !settingsResult.rows[0].auto_pause_time) {
      console.log('[Cron] Auto-pause is disabled or not configured. Skipping.');
      return;
    }

    const { auto_pause_time } = settingsResult.rows[0]; // e.g., "18:00:00"
    const [pauseHour, pauseMinute] = auto_pause_time.split(':').map(Number);

    // 2. Get current time (server time)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 3. Check if current time is past the configured auto-pause time for today
    // Note: This simple check works if the job runs frequently (e.g., every minute).
    // It pauses timers if the current time is >= pause time.
    // More robust logic might be needed for jobs running less frequently or across midnight.
    if (currentHour > pauseHour || (currentHour === pauseHour && currentMinute >= pauseMinute)) {
        console.log(`[Cron] Current time (${currentHour}:${currentMinute}) is at or past auto-pause time (${pauseHour}:${pauseMinute}). Checking running timers.`);

      // 4. Find running timers ("endTime" IS NULL AND "isPaused" = false)
      const runningTimersResult = await pool.query(
        `SELECT id, "lastResumedAt", "totalPausedDuration"
         FROM time_entries
         WHERE "endTime" IS NULL AND "isPaused" = false`
      );

      if (runningTimersResult.rows.length === 0) {
        console.log('[Cron] No running timers found to auto-pause.');
        return;
      }

      console.log(`[Cron] Found ${runningTimersResult.rows.length} running timers. Attempting to pause...`);
      // 5. Pause each running timer
      for (const timer of runningTimersResult.rows) {
          // We need lastResumedAt to calculate the duration up to the pause point
          if (!timer.lastResumedAt) {
              console.warn(`[Cron] Skipping timer ${timer.id}: lastResumedAt is null.`);
              continue;
          }
          await performPause(timer.id, timer.lastResumedAt, timer.totalPausedDuration);
      }

    } else {
       console.log(`[Cron] Current time (${currentHour}:${currentMinute}) is before auto-pause time (${pauseHour}:${pauseMinute}). No action needed.`);
    }

  } catch (err) {
    console.error('[Cron] Error during auto-pause check:', err);
  }
};

// Schedule the job to run with the interval defined in environment variables or default to every minute
// Note: Consider the server's timezone. If the server is UTC and users expect local time, adjustments are needed.
cron.schedule(process.env.AUTO_PAUSE_CHECK_INTERVAL || '* * * * *', checkAndPauseTimers, {
    scheduled: true,
    timezone: process.env.TIMEZONE || process.env.TZ || undefined // Use environment variable timezone or system default
});

console.log(`[Cron] Auto-pause job scheduled to run with interval: ${process.env.AUTO_PAUSE_CHECK_INTERVAL || '* * * * *'}. Timezone: ${process.env.TIMEZONE || process.env.TZ || 'System Default'}`);

// --- End Cron Job ---
