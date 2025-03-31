const express = require('express');
const router = express.Router();
const db = require('../database.js');
const crypto = require('crypto');

// GET /api/time-entries - Get all time entries (optionally filter by taskId or projectId)
router.get('/', (req, res, next) => {
    const { taskId, projectId } = req.query;
    let sql = `SELECT te.*, t.projectId 
               FROM time_entries te 
               JOIN tasks t ON te.taskId = t.id`; // Join with tasks to filter by projectId
    const params = [];
    const conditions = [];

    if (taskId) {
        conditions.push("te.taskId = ?");
        params.push(taskId);
    }
    if (projectId) {
        conditions.push("t.projectId = ?");
        params.push(projectId);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY te.startTime DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            return next(err);
        }
        res.json(rows);
    });
});

// GET /api/time-entries/:id - Get a single time entry
router.get('/:id', (req, res, next) => {
    const sql = "SELECT * FROM time_entries WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return next(err);
        }
        if (!row) {
            return res.status(404).json({ message: 'Time entry not found' });
        }
        res.json(row);
    });
});

// POST /api/time-entries/start - Start a new time entry (simplified)
router.post('/start', (req, res, next) => {
    const { taskId } = req.body;
    if (!taskId) {
        return res.status(400).json({ message: "Task ID is required" });
    }

    // Optional: Check if there's already an active timer for this task?
    // For simplicity, we'll allow multiple active timers per task for now.

    const id = crypto.randomUUID();
    const startTime = new Date().toISOString(); // Record start time
    const sql = 'INSERT INTO time_entries (id, taskId, startTime) VALUES (?, ?, ?)';
    const params = [id, taskId, startTime];

    db.run(sql, params, function (err) {
        if (err) {
            return next(err);
        }
        // Return the newly started entry
        db.get("SELECT * FROM time_entries WHERE id = ?", [id], (err, row) => {
            if (err) {
                return next(err);
            }
            res.status(201).json(row);
        });
    });
});

// PUT /api/time-entries/stop/:id - Stop a running time entry
router.put('/stop/:id', (req, res, next) => {
    const id = req.params.id;
    const endTime = new Date().toISOString(); // Record end time

    // Fetch the start time first to calculate duration
    db.get("SELECT startTime FROM time_entries WHERE id = ? AND endTime IS NULL", [id], (err, entry) => {
        if (err) {
            return next(err);
        }
        if (!entry) {
            return res.status(404).json({ message: 'Active time entry not found or already stopped' });
        }

        const startTime = new Date(entry.startTime);
        const duration = (new Date(endTime) - startTime) / 1000; // Duration in seconds

        const sql = 'UPDATE time_entries SET endTime = ?, duration = ? WHERE id = ?';
        const params = [endTime, duration, id];

        db.run(sql, params, function (err) {
            if (err) {
                return next(err);
            }
            if (this.changes === 0) {
                // Should have been caught by the initial SELECT, but good to double-check
                return res.status(404).json({ message: 'Time entry not found or no changes made' });
            }
            // Return the completed entry
            db.get("SELECT * FROM time_entries WHERE id = ?", [id], (err, row) => {
                if (err) {
                    return next(err);
                }
                res.json(row);
            });
        });
    });
});

// DELETE /api/time-entries/:id - Delete a time entry
router.delete('/:id', (req, res, next) => {
    const sql = 'DELETE FROM time_entries WHERE id = ?';
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            return next(err);
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Time entry not found' });
        }
        res.status(200).json({ message: 'Time entry deleted successfully' });
    });
});


module.exports = router;
