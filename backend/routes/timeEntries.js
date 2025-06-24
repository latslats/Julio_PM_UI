const express = require('express');
const router = express.Router();
const pool = require('../database.js'); // Use the exported pool
const crypto = require('crypto');

// Enhanced helper function for consistent error handling with specific error messages
const handleDatabaseError = (err, res, next) => {
  console.error('Database Error:', err.stack);
  
  // Only show detailed errors in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
  
  // Provide more specific error messages based on error type
  if (err.code) {
    switch(err.code) {
      case '23503': // Foreign key violation
        return res.status(400).json({ 
          message: 'Referenced record does not exist', 
          detail: err.detail || 'A record you referenced does not exist',
          code: err.code 
        });
      case '23505': // Unique violation
        return res.status(409).json({ 
          message: 'Duplicate record', 
          detail: err.detail || 'A record with this key already exists',
          code: err.code 
        });
      case '22P02': // Invalid text representation (often invalid UUID)
        return res.status(400).json({ 
          message: 'Invalid input format', 
          detail: err.detail || 'The format of your input is invalid',
          code: err.code 
        });
      case '42P01': // Undefined table
        return res.status(500).json({ 
          message: 'Database schema error', 
          detail: 'A required table does not exist',
          code: err.code 
        });
      default:
        return res.status(500).json({ 
          message: 'Database error', 
          detail: err.message,
          code: err.code 
        });
    }
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
  const { taskId, projectId, active, limit } = req.query;
  
  // Enhanced query to include task and project information
  let sql = `SELECT te.*, 
             t.title as "taskTitle", 
             t."projectId", 
             t.status as "taskStatus",
             t.priority as "taskPriority",
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
  
  // Add limit if provided
  if (limit && !isNaN(parseInt(limit))) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(parseInt(limit));
  }

  try {
    const result = await pool.query(sql, params);
    
    // For active timers, calculate and add real-time information
    const now = new Date();
    const enhancedRows = result.rows.map(entry => {
      // If this is an active timer (endTime is null), add real-time calculations
      if (entry.endTime === null) {
        const startTime = new Date(entry.startTime);
        const totalElapsedSeconds = (now.getTime() - startTime.getTime()) / 1000;
        let currentTotalPaused = parseFloat(entry.totalPausedDuration) || 0;
        let currentElapsed = 0;
        
        // Calculate current elapsed time based on pause state
        if (!entry.isPaused && entry.lastResumedAt) {
          // Timer is currently running - add time since last resume to existing duration
          const lastResume = new Date(entry.lastResumedAt);
          const timeSinceResume = (now.getTime() - lastResume.getTime()) / 1000;
          const baseDuration = parseFloat(entry.duration) || 0;
          currentElapsed = baseDuration + Math.max(0, timeSinceResume);
        } else {
          // Timer is paused - just use the stored duration (frozen at pause time)
          currentElapsed = parseFloat(entry.duration) || 0;
        }
        
        return {
          ...entry,
          currentElapsedSeconds: Math.max(0, currentElapsed),
          isActive: true,
          formattedElapsed: formatTimeFromSeconds(Math.max(0, currentElapsed))
        };
      }
      
      // For completed timers, just add formatted duration
      return {
        ...entry,
        isActive: false,
        formattedDuration: entry.duration ? formatTimeFromSeconds(entry.duration) : '00:00:00'
      };
    });
    
    res.json(enhancedRows);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

/**
 * Helper function to format seconds into HH:MM:SS
 * 
 * @param {number} seconds - Number of seconds to format
 * @returns {string} Formatted time string
 */
const formatTimeFromSeconds = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');
};

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

  // Explicitly validate if taskId exists in the tasks table
  try {
    const taskCheckResult = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheckResult.rows.length === 0) {
      return res.status(400).json({ message: `Task with ID ${taskId} does not exist.` });
    }
  } catch (err) {
    return handleDatabaseError(err, res, next);
  }

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

    // If it was running (not paused), log the active segment
    if (!entry.isPaused && entry.lastResumedAt) {
      const lastResume = new Date(entry.lastResumedAt);
      console.log(`Stopping time entry ${id}: Last active segment from ${lastResume.toISOString()} to ${endTime.toISOString()}`);
    } else if (entry.isPaused && entry.pausedAt) {
      // Timer is currently paused - no additional time calculation needed
      // The paused duration was already calculated and stored during the pause/resume cycle
      console.log(`Stopping time entry ${id} while paused. Using existing total paused duration: ${totalPausedDuration}s`);
    }
    
    // Final duration is the total elapsed time minus the total paused time
    const finalDuration = Math.max(0, totalElapsedSeconds - totalPausedDuration);
    
    console.log(`Time entry ${id} final stats: Total elapsed: ${totalElapsedSeconds}s, Total paused: ${totalPausedDuration}s, Final duration: ${finalDuration}s`);
    

    // Use quotes for camelCase identifiers
    const updateSql = 'UPDATE time_entries SET "endTime" = $1, duration = $2, "isPaused" = false, "lastResumedAt" = NULL, "totalPausedDuration" = $4, "pausedAt" = NULL WHERE id = $3 RETURNING *';
    const updateParams = [endTime, finalDuration, id, totalPausedDuration];

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
    const checkRes = await client.query('SELECT id, "endTime", "isPaused", "lastResumedAt", "totalPausedDuration", duration FROM time_entries WHERE id = $1 FOR UPDATE', [id]);
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

    // When pausing, calculate and store the accumulated duration up to this point
    const now = new Date();
    
    // Make sure lastResumedAt exists before trying to use it
    if (!entry.lastResumedAt) {
      console.warn(`Warning: Time entry ${id} has no lastResumedAt timestamp but is not paused`);
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot pause entry with invalid state' });
    }

    // Calculate time since last resume and add to existing duration
    const lastResume = new Date(entry.lastResumedAt);
    const timeSinceResume = (now.getTime() - lastResume.getTime()) / 1000;
    const currentDuration = parseFloat(entry.duration) || 0;
    const newDuration = currentDuration + Math.max(0, timeSinceResume);

    // Log the pause action for debugging
    console.log(`Pausing time entry ${id} at ${now.toISOString()}. Adding ${timeSinceResume}s to duration. New duration: ${newDuration}s`);
    
    const result = await client.query(
      'UPDATE time_entries SET "isPaused" = true, "lastResumedAt" = NULL, "pausedAt" = $2, duration = $3 WHERE id = $1 RETURNING *',
      [id, now, newDuration]
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
    const checkRes = await client.query('SELECT id, "endTime", "isPaused", "pausedAt", "totalPausedDuration" FROM time_entries WHERE id = $1 FOR UPDATE', [id]);
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

    // Calculate time spent paused and add to total paused duration
    let newTotalPausedDuration = parseFloat(entry.totalPausedDuration) || 0;
    
    if (entry.pausedAt) {
      const pausedAt = new Date(entry.pausedAt);
      const pausedDuration = (resumeTime.getTime() - pausedAt.getTime()) / 1000;
      const pausedDurationToAdd = Math.max(0, pausedDuration);
      newTotalPausedDuration += pausedDurationToAdd;
      
      console.log(`Resuming time entry ${id}: Adding ${pausedDurationToAdd}s paused time. New total paused: ${newTotalPausedDuration}s`);
    }

    // Log the resume action for debugging
    console.log(`Resuming time entry ${id} at ${resumeTime.toISOString()}`);
    
    const result = await client.query(
      'UPDATE time_entries SET "isPaused" = false, "lastResumedAt" = $1, "pausedAt" = NULL, "totalPausedDuration" = $3 WHERE id = $2 RETURNING *',
      [resumeTime, id, newTotalPausedDuration]
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

// PUT /api/time-entries/:id - Update a time entry
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { startTime, endTime, duration, notes, taskId } = req.body;
  
  // Validate required fields
  if (!startTime) {
    return res.status(400).json({ message: 'Start time is required' });
  }
  
  // Validate that taskId exists if provided
  if (taskId) {
    try {
      const taskCheckResult = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
      if (taskCheckResult.rows.length === 0) {
        return res.status(400).json({ message: `Task with ID ${taskId} does not exist.` });
      }
    } catch (err) {
      return handleDatabaseError(err, res, next);
    }
  }
  
  // Validate that endTime is after startTime if both are provided
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end < start) {
      return res.status(400).json({ message: 'End time cannot be before start time' });
    }
  }
  
  // Build the SQL query dynamically based on provided fields
  let updateFields = [];
  const values = [id];
  let paramIndex = 2;
  
  if (startTime) {
    updateFields.push(`"startTime" = $${paramIndex++}`);
    values.push(new Date(startTime));
  }
  
  if (endTime !== undefined) {
    if (endTime === null) {
      updateFields.push(`"endTime" = NULL`);
    } else {
      updateFields.push(`"endTime" = $${paramIndex++}`);
      values.push(new Date(endTime));
    }
  }
  
  if (duration !== undefined) {
    updateFields.push(`duration = $${paramIndex++}`);
    values.push(duration);
  }
  
  if (notes !== undefined) {
    updateFields.push(`notes = $${paramIndex++}`);
    values.push(notes);
  }
  
  if (taskId) {
    updateFields.push(`"taskId" = $${paramIndex++}`);
    values.push(taskId);
  }
  
  // If no fields to update, return error
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }
  
  const sql = `UPDATE time_entries SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`;
  
  try {
    const result = await pool.query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    // Get additional information about the task and project
    const entryWithDetails = await pool.query(
      `SELECT te.*, 
       t.title as "taskTitle", 
       t."projectId", 
       t.status as "taskStatus",
       t.priority as "taskPriority",
       p.name as "projectName", 
       p.color as "projectColor"
       FROM time_entries te 
       JOIN tasks t ON te."taskId" = t.id
       JOIN projects p ON t."projectId" = p.id
       WHERE te.id = $1`,
      [id]
    );
    
    res.json(entryWithDetails.rows[0]);
  } catch (err) {
    handleDatabaseError(err, res, next);
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
