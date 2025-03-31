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

// GET /api/tasks - Get all tasks (optionally filter by projectId)
router.get('/', async (req, res, next) => {
  const projectId = req.query.projectId;
  let sql = 'SELECT * FROM tasks';
  const params = [];
  let paramIndex = 1;

  // Use quotes for camelCase column names
  if (projectId) {
    sql += ` WHERE "projectId" = $${paramIndex++}`;
    params.push(projectId);
  }
  sql += ' ORDER BY "createdAt" DESC';

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// GET /api/tasks/:id - Get a single task by ID
router.get('/:id', async (req, res, next) => {
  const sql = 'SELECT * FROM tasks WHERE id = $1';
  const params = [req.params.id];
  try {
    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// POST /api/tasks - Create a new task
router.post('/', async (req, res, next) => {
  const { projectId, title, description, status, priority, dueDate, estimatedHours } = req.body;
  const errors = [];
  if (!projectId) {
    errors.push("Project ID is required");
  }
  if (!title) {
    errors.push("Task title is required");
  }
  // TODO: Validate if projectId exists in the projects table before insertion
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const id = crypto.randomUUID();
  // Use quotes for camelCase column names
  const sql = `INSERT INTO tasks (id, "projectId", title, description, status, priority, "dueDate", "estimatedHours") 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
  const params = [
    id,
    projectId,
    title,
    description || null,
    status || 'not-started',
    priority || 'medium',
    dueDate || null,
    estimatedHours || null
  ];

  try {
    const result = await pool.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Handle potential foreign key violation if projectId doesn't exist
    if (err.code === '23503') { // Foreign key violation error code in PostgreSQL
        return res.status(400).json({ message: `Project with ID ${projectId} does not exist.` });
    }
    handleDatabaseError(err, res, next);
  }
});

// PUT /api/tasks/:id - Update an existing task
router.put('/:id', async (req, res, next) => {
  const { projectId, title, description, status, priority, dueDate, estimatedHours } = req.body;
  const id = req.params.id;

  // Basic validation
  if (req.body.hasOwnProperty('title') && !title) {
      return res.status(400).json({ message: "Task title cannot be empty" });
  }
  if (req.body.hasOwnProperty('projectId') && !projectId) {
      return res.status(400).json({ message: "Project ID cannot be empty" });
  }
  // TODO: Add validation: check if projectId exists if provided and changed

  // Construct the update query dynamically
  const fields = [];
  const params = [];
  let paramIndex = 1;

  // Use quotes for camelCase column names
  if (req.body.hasOwnProperty('projectId')) { fields.push(`"projectId" = $${paramIndex++}`); params.push(projectId); }
  if (req.body.hasOwnProperty('title')) { fields.push(`title = $${paramIndex++}`); params.push(title); }
  if (req.body.hasOwnProperty('description')) { fields.push(`description = $${paramIndex++}`); params.push(description === undefined ? null : description); }
  if (req.body.hasOwnProperty('status')) { fields.push(`status = $${paramIndex++}`); params.push(status); }
  if (req.body.hasOwnProperty('priority')) { fields.push(`priority = $${paramIndex++}`); params.push(priority); }
  if (req.body.hasOwnProperty('dueDate')) { fields.push(`"dueDate" = $${paramIndex++}`); params.push(dueDate || null); }
  if (req.body.hasOwnProperty('estimatedHours')) { fields.push(`"estimatedHours" = $${paramIndex++}`); params.push(estimatedHours || null); }

  if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
  }

  params.push(id); // Add id for the WHERE clause

  const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

  try {
    const result = await pool.query(sql, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found or no changes made' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    // Handle potential foreign key violation if projectId is updated to a non-existent one
    if (err.code === '23503') {
        return res.status(400).json({ message: `Project with ID ${projectId} does not exist.` });
    }
    handleDatabaseError(err, res, next);
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res, next) => {
  const sql = 'DELETE FROM tasks WHERE id = $1';
  const params = [req.params.id];

  try {
    const result = await pool.query(sql, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

module.exports = router;
