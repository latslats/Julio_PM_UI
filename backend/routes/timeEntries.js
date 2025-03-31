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

// Helper to calculate active duration
const calculateCurrentActiveDuration = async (client, entryId) => {
  const res = await client.query('SELECT "isPaused", "lastResumedAt", "totalPausedDuration" FROM time_entries WHERE id = $1', [entryId]);
  const entry = res.rows[0];
  let currentTotalPaused = parseFloat(entry.totalPausedDuration) || 0;
  let wasRunning = false;

  if (!entry.isPaused && entry.lastResumedAt) {
    wasRunning = true;
    // Calculate time since last resume in seconds
    const now = new Date();
    const lastResume = new Date(entry.lastResumedAt);
    const durationSinceResume = (now.getTime() - lastResume.getTime()) / 1000;
    currentTotalPaused += durationSinceResume;
  }
  return { updatedTotalPausedDuration: currentTotalPaused, wasRunning };
};

// GET /api/time-entries - Get all time entries (optionally filter by taskId or projectId)
router.get('/', async (req, res, next) => {
  const { taskId, projectId } = req.query;
  let sql = `SELECT te.*, t."projectId" 
             FROM time_entries te 
             JOIN tasks t ON te."taskId" = t.id`;
  const params = [];
  const conditions = [];
  let paramIndex = 1;

  if (taskId) {
    conditions.push(`te."taskId" = $${paramIndex++}`);
    params.push(taskId);
  }
  if (projectId) {
    conditions.push(`t."projectId" = $${paramIndex++}`);
    params.push(projectId);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += ' ORDER BY te."startTime" DESC'; // Use quotes

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
    const selectSql = 'SELECT "startTime", "isPaused", "lastResumedAt", "totalPausedDuration" FROM time_entries WHERE id = $1 AND "endTime" IS NULL FOR UPDATE';
    const selectResult = await client.query(selectSql, [id]);

    if (selectResult.rows.length === 0) {
      await client.query('ROLLBACK'); // Rollback transaction
      return res.status(404).json({ message: 'Active time entry not found or already stopped' });
    }

    const entry = selectResult.rows[0];
    let finalDuration = parseFloat(entry.totalPausedDuration) || 0;

    // If it was running, add the last segment's duration
    if (!entry.isPaused && entry.lastResumedAt) {
      const lastResume = new Date(entry.lastResumedAt);
      const durationSinceResume = (endTime.getTime() - lastResume.getTime()) / 1000;
      finalDuration += durationSinceResume;
    }
    // If it was paused, finalDuration already holds the accumulated time.

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
    const lastResume = new Date(entry.lastResumedAt);
    const durationSinceResume = (now.getTime() - lastResume.getTime()) / 1000;
    const newTotalPausedDuration = (parseFloat(entry.totalPausedDuration) || 0) + durationSinceResume;

    const result = await client.query(
      'UPDATE time_entries SET "isPaused" = true, "lastResumedAt" = NULL, "totalPausedDuration" = $1 WHERE id = $2 RETURNING *',
      [newTotalPausedDuration, id]
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

    const result = await client.query(
      'UPDATE time_entries SET "isPaused" = false, "lastResumedAt" = $1 WHERE id = $2 RETURNING *',
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
