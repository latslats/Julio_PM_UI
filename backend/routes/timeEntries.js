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

// GET /api/time-entries - Get all time entries (optionally filter by taskId or projectId)
router.get('/', async (req, res, next) => {
    const { taskId, projectId } = req.query;
    // Use quotes for camelCase identifiers
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
    const sql = 'INSERT INTO time_entries (id, "taskId", "startTime") VALUES ($1, $2, $3) RETURNING *';
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
        const selectSql = 'SELECT "startTime" FROM time_entries WHERE id = $1 AND "endTime" IS NULL FOR UPDATE';
        const selectResult = await client.query(selectSql, [id]);

        if (selectResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback transaction
            return res.status(404).json({ message: 'Active time entry not found or already stopped' });
        }

        const startTime = selectResult.rows[0].startTime; // Already a Date object from pg
        const duration = (endTime.getTime() - startTime.getTime()) / 1000; // Duration in seconds

        // Use quotes for camelCase identifiers
        const updateSql = 'UPDATE time_entries SET "endTime" = $1, duration = $2 WHERE id = $3 RETURNING *';
        const updateParams = [endTime, duration, id];

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
