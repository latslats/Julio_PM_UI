const express = require('express');
const router = express.Router();
const pool = require('../database.js'); // Use the exported pool
const crypto = require('crypto'); // For generating unique IDs

// Helper function for consistent error handling
const handleDatabaseError = (err, res, next) => {
  console.error('Database Error:', err.stack);
  // Avoid sending detailed DB errors to client in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
  return next(err);
};

// GET /api/projects - Get all projects
router.get('/', async (req, res, next) => {
  const sql = 'SELECT * FROM projects ORDER BY "createdAt" DESC'; // Use quotes for camelCase
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// GET /api/projects/:id - Get a single project by ID
router.get('/:id', async (req, res, next) => {
  const sql = 'SELECT * FROM projects WHERE id = $1'; // Use $1 placeholder
  const params = [req.params.id];
  try {
    const result = await pool.query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res, next) => {
  const { name, description, client, color, startDate, dueDate } = req.body;
  const errors = [];
  if (!name) {
    errors.push("Project name is required");
  }
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const id = crypto.randomUUID();
  // Use quotes for camelCase column names
  const sql = `INSERT INTO projects (id, name, description, client, color, "startDate", "dueDate") 
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`; // Use RETURNING * to get the inserted row
  // Ensure dates are null or valid ISO strings for TIMESTAMPTZ
  const params = [
    id,
    name,
    description || null,
    client || null,
    color || '#0ea5e9',
    startDate || null, 
    dueDate || null
  ];

  try {
    const result = await pool.query(sql, params);
    res.status(201).json(result.rows[0]); // Return the created project from RETURNING
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// PUT /api/projects/:id - Update an existing project
router.put('/:id', async (req, res, next) => {
  const { name, description, client, color, startDate, dueDate, status } = req.body;
  const id = req.params.id;

  if (req.body.hasOwnProperty('name') && !name) {
      return res.status(400).json({ message: "Project name cannot be empty" });
  }

  // Construct the update query dynamically
  const fields = [];
  const params = [];
  let paramIndex = 1;

  // Use quotes for camelCase column names
  if (req.body.hasOwnProperty('name')) { fields.push(`name = $${paramIndex++}`); params.push(name); }
  if (req.body.hasOwnProperty('description')) { fields.push(`description = $${paramIndex++}`); params.push(description); }
  if (req.body.hasOwnProperty('client')) { fields.push(`client = $${paramIndex++}`); params.push(client); }
  if (req.body.hasOwnProperty('color')) { fields.push(`color = $${paramIndex++}`); params.push(color); }
  if (req.body.hasOwnProperty('startDate')) { fields.push(`"startDate" = $${paramIndex++}`); params.push(startDate || null); }
  if (req.body.hasOwnProperty('dueDate')) { fields.push(`"dueDate" = $${paramIndex++}`); params.push(dueDate || null); }
  if (req.body.hasOwnProperty('status')) { fields.push(`status = $${paramIndex++}`); params.push(status); }

  if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
  }

  params.push(id); // Add id for the WHERE clause

  const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

  try {
    const result = await pool.query(sql, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Project not found or no changes made' });
    }
    res.json(result.rows[0]); // Return the updated project
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res, next) => {
  const sql = 'DELETE FROM projects WHERE id = $1';
  const params = [req.params.id];

  try {
    const result = await pool.query(sql, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

module.exports = router;
