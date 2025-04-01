const express = require('express');
const router = express.Router();
const pool = require('../database.js'); // Use the exported pool
const crypto = require('crypto');

// Re-use the helper function for consistent error handling
const handleDatabaseError = (err, res, next) => {
  console.error('Database Error:', err.stack);
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
  return next(err);
};

/**
 * Helper to calculate active duration for a time entry
 * 
 * @param {Object} client - Database client for queries
 * @param {string} entryId - ID of the time entry
 * @returns {Object} Object containing updated duration and state information
 */
const calculateCurrentActiveDuration = async (client, entryId) => {
  const res = await client.query(
    'SELECT "startTime", "isPaused", "lastResumedAt", "totalPausedDuration" FROM time_entries WHERE id = $1', 
    [entryId]
  );
  
  if (res.rows.length === 0) {
    throw new Error(`Time entry with ID ${entryId} not found`);
  }
  
  const entry = res.rows[0];
  let currentTotalPaused = parseFloat(entry.totalPausedDuration) || 0;
  let wasRunning = false;
  let elapsedTime = 0;
  
  const now = new Date();
  const startTime = new Date(entry.startTime);
  
  // Calculate total elapsed time from start to now
  const totalElapsedSeconds = (now.getTime() - startTime.getTime()) / 1000;
  
  if (!entry.isPaused && entry.lastResumedAt) {
    wasRunning = true;
    // Calculate time since last resume in seconds
    const lastResume = new Date(entry.lastResumedAt);
    const durationSinceResume = (now.getTime() - lastResume.getTime()) / 1000;
    
    // Add this active segment to the total active duration
    elapsedTime = totalElapsedSeconds - currentTotalPaused;
  } else {
    // If paused, the elapsed time is the total time minus paused time
    elapsedTime = totalElapsedSeconds - currentTotalPaused;
  }
  
  return { 
    updatedTotalPausedDuration: currentTotalPaused, 
    wasRunning,
    elapsedTime: Math.max(0, elapsedTime) // Ensure we don't return negative values
  };
};

// GET /api/time-entries - Get all time entries with flexible filtering options
router.get('/', async (req, res, next) => {
  const { taskId, projectId, active } = req.query;
  
  // Enhanced query to include task and project information
  let sql = `SELECT te.*, 
             t.title as "taskTitle", 
             t."projectId", 
             p.name as "projectName", 
             p.color as "projectColor"
             FROM time_entries te 
             JOIN tasks t ON te."taskId" = t.id
             JOIN projects p ON t."projectId" = p.id`;
             
  const params = [];
  const conditions = [];
  let paramIndex = 1;

  // Filter by taskId if provided
  if (taskId) {
    conditions.push(`te."taskId" = $${paramIndex++}`);
    params.push(taskId);
  }
  
  // Filter by projectId if provided
  if (projectId) {
    conditions.push(`t."projectId" = $${paramIndex++}`);
    params.push(projectId);
  }
  
  // Filter for active timers (where endTime is null) if requested
  if (active === 'true') {
    conditions.push(`te."endTime" IS NULL`);
  }

  // Add WHERE clause if we have conditions
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  // Order by most recent first, but put active timers at the top
  sql += ' ORDER BY te."endTime" IS NULL DESC, te."startTime" DESC';

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// GET /api/time-entries/:id - Get a single time entry
router.get('/:id', async (req, res, next) => {
  const sql = 'SELECT * FROM time_entries WHERE id = $1';
  try {
    const result = await pool.query(sql, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// POST /api/time-entries/start - Start a new time entry
router.post('/start', async (req, res, next) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  // TODO: Validate if taskId exists in the tasks table

  const id = crypto.randomUUID();
  const startTime = new Date(); // Use Date object for TIMESTAMPTZ
  // Use quotes for camelCase identifiers
  const sql = 'INSERT INTO time_entries (id, "taskId", "startTime", "isPaused", "lastResumedAt", "totalPausedDuration") VALUES ($1, $2, $3, false, $3, 0) RETURNING *';
  const params = [id, taskId, startTime];

  try {
    const result = await pool.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Handle potential foreign key violation if taskId doesn't exist
    if (err.code === '23503') { // Foreign key violation error code in PostgreSQL
      return res.status(400).json({ message: `Task with ID ${taskId} does not exist.` });
    }
    handleDatabaseError(err, res, next);
  }
});

// PUT /api/time-entries/stop/:id - Stop a running time entry
router.put('/stop/:id', async (req, res, next) => {
  const id = req.params.id;
  const endTime = new Date(); // Use Date object

  let client;
  try {
    client = await pool.connect(); // Get a client for transaction
    await client.query('BEGIN'); // Start transaction

    // Fetch the start time first to calculate duration, lock the row
    // Use quotes for camelCase identifiers
    const selectSql = 'SELECT "startTime", "isPaused", "lastResumedAt", "totalPausedDuration", "pausedAt" FROM time_entries WHERE id = $1 AND "endTime" IS NULL FOR UPDATE';
    const selectResult = await client.query(selectSql, [id]);

    if (selectResult.rows.length === 0) {
      await client.query('ROLLBACK'); // Rollback transaction
      return res.status(404).json({ message: 'Active time entry not found or already stopped' });
    }

    const entry = selectResult.rows[0];
    const startTime = new Date(entry.startTime);
    
    // Calculate total elapsed time from start to end
    const totalElapsedSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    
    // Get the total paused duration
    let totalPausedDuration = parseFloat(entry.totalPausedDuration) || 0;

    // If it was running (not paused), add the last active segment's duration
    if (!entry.isPaused && entry.lastResumedAt) {
      const lastResume = new Date(entry.lastResumedAt);
      // No need to add to totalPausedDuration here, as we're calculating active time
      console.log(`Stopping time entry ${id}: Last active segment from ${lastResume.toISOString()} to ${endTime.toISOString()}`);
    } else if (entry.isPaused) {
      console.log(`Stopping time entry ${id} while paused. Total paused duration: ${totalPausedDuration}s`);
    }
    
    // Final duration is the total elapsed time minus the total paused time
    const finalDuration = Math.max(0, totalElapsedSeconds - totalPausedDuration);
    
    console.log(`Time entry ${id} final stats: Total elapsed: ${totalElapsedSeconds}s, Total paused: ${totalPausedDuration}s, Final duration: ${finalDuration}s`);
    

    // Use quotes for camelCase identifiers
    const updateSql = 'UPDATE time_entries SET "endTime" = $1, duration = $2, "isPaused" = false, "lastResumedAt" = NULL WHERE id = $3 RETURNING *';
    const updateParams = [endTime, finalDuration, id];

    const updateResult = await client.query(updateSql, updateParams);
    
    await client.query('COMMIT'); // Commit transaction

    res.json(updateResult.rows[0]); // Return the completed entry

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK'); // Rollback transaction on error
    }
    handleDatabaseError(err, res, next);
  } finally {
    if (client) {
      client.release(); // Release client back to pool
    }
  }
});

// PUT /api/time-entries/pause/:id - Pause a running time entry
router.put('/pause/:id', async (req, res, next) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the row
    const checkRes = await client.query('SELECT id, "endTime", "isPaused", "lastResumedAt", "totalPausedDuration" FROM time_entries WHERE id = $1 FOR UPDATE', [id]);
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Time entry not found' });
    }
    const entry = checkRes.rows[0];
    if (entry.endTime !== null) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot pause a stopped entry' });
    }
    if (entry.isPaused) {
      await client.query('ROLLBACK');
      // Already paused, just return current state
      const fullEntry = await pool.query(
         'SELECT te.*, t.title as "taskTitle", p.name as "projectName", p.id as "projectId" FROM time_entries te JOIN tasks t ON te."taskId" = t.id JOIN projects p ON t."projectId" = p.id WHERE te.id = $1',
         [id]
      );
      return res.json(fullEntry.rows[0]);
    }

    // Calculate duration since last resume and update total paused duration
    const now = new Date();
    
    // Make sure lastResumedAt exists before trying to use it
    if (!entry.lastResumedAt) {
      console.warn(`Warning: Time entry ${id} has no lastResumedAt timestamp but is not paused`);
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot pause entry with invalid state' });
    }
    
    const lastResume = new Date(entry.lastResumedAt);
    
    // Validate that lastResume is a valid date
    if (isNaN(lastResume.getTime())) {
      console.error(`Error: Invalid lastResumedAt timestamp for time entry ${id}`);
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid resume timestamp' });
    }
    
    const durationSinceResume = (now.getTime() - lastResume.getTime()) / 1000;
    
    // Ensure we don't add negative durations (in case of clock issues)
    const durationToAdd = Math.max(0, durationSinceResume);
    const newTotalPausedDuration = (parseFloat(entry.totalPausedDuration) || 0) + durationToAdd;

    // Log the pause action for debugging
    console.log(`Pausing time entry ${id}: Adding ${durationToAdd}s to totalPausedDuration. New total: ${newTotalPausedDuration}s`);
    
    const result = await client.query(
      'UPDATE time_entries SET "isPaused" = true, "lastResumedAt" = NULL, "totalPausedDuration" = $1, "pausedAt" = $3 WHERE id = $2 RETURNING *',
      [newTotalPausedDuration, id, now]
    );

    await client.query('COMMIT');

    // Fetch details including project/task names for response
     const fullEntryRes = await pool.query(
         'SELECT te.*, t.title as "taskTitle", p.name as "projectName", p.id as "projectId" FROM time_entries te JOIN tasks t ON te."taskId" = t.id JOIN projects p ON t."projectId" = p.id WHERE te.id = $1',
         [id]
      );

    res.json(fullEntryRes.rows[0]);
  } catch (err) {
    console.error('Error pausing time entry:', err);
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/time-entries/resume/:id - Resume a paused time entry
router.put('/resume/:id', async (req, res, next) => {
  const { id } = req.params;
  const resumeTime = new Date();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

     // Lock the row
    const checkRes = await client.query('SELECT id, "endTime", "isPaused" FROM time_entries WHERE id = $1 FOR UPDATE', [id]);
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Time entry not found' });
    }
    const entry = checkRes.rows[0];
    if (entry.endTime !== null) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot resume a stopped entry' });
    }
    if (!entry.isPaused) {
      await client.query('ROLLBACK');
       // Already running, just return current state
      const fullEntry = await pool.query(
         'SELECT te.*, t.title as "taskTitle", p.name as "projectName", p.id as "projectId" FROM time_entries te JOIN tasks t ON te."taskId" = t.id JOIN projects p ON t."projectId" = p.id WHERE te.id = $1',
         [id]
      );
      return res.json(fullEntry.rows[0]);
    }

    // Log the resume action for debugging
    console.log(`Resuming time entry ${id} at ${resumeTime.toISOString()}`);
    
    const result = await client.query(
      'UPDATE time_entries SET "isPaused" = false, "lastResumedAt" = $1, "pausedAt" = NULL WHERE id = $2 RETURNING *',
      [resumeTime, id]
    );

    await client.query('COMMIT');

    // Fetch details including project/task names for response
     const fullEntryRes = await pool.query(
         'SELECT te.*, t.title as "taskTitle", p.name as "projectName", p.id as "projectId" FROM time_entries te JOIN tasks t ON te."taskId" = t.id JOIN projects p ON t."projectId" = p.id WHERE te.id = $1',
         [id]
      );

    res.json(fullEntryRes.rows[0]);
  } catch (err) {
    console.error('Error resuming time entry:', err);
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/time-entries/:id - Delete a time entry
router.delete('/:id', async (req, res, next) => {
  const sql = 'DELETE FROM time_entries WHERE id = $1';
  try {
    const result = await pool.query(sql, [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    res.status(200).json({ message: 'Time entry deleted successfully' });
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

module.exports = router;
