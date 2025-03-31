const express = require('express');
const router = express.Router();
const db = require('../database.js');
const crypto = require('crypto'); // For generating unique IDs

// GET /api/projects - Get all projects
router.get('/', (req, res, next) => {
  const sql = "SELECT * FROM projects ORDER BY createdAt DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return next(err); // Pass error to the global error handler
    }
    res.json(rows);
  });
});

// GET /api/projects/:id - Get a single project by ID
router.get('/:id', (req, res, next) => {
  const sql = "SELECT * FROM projects WHERE id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      return next(err);
    }
    if (!row) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(row);
  });
});

// POST /api/projects - Create a new project
router.post('/', (req, res, next) => {
  const { name, description, client, color, startDate, dueDate } = req.body;
  const errors = [];
  if (!name) {
    errors.push("Project name is required");
  }
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const id = crypto.randomUUID(); // Generate a unique ID
  const sql = `INSERT INTO projects (id, name, description, client, color, startDate, dueDate) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [id, name, description, client, color || '#0ea5e9', startDate, dueDate];

  db.run(sql, params, function (err) { // Use function() to access this.lastID
    if (err) {
      return next(err);
    }
    // Return the newly created project
    res.status(201).json({ 
      id: id,
      name: name,
      description: description,
      client: client,
      color: color || '#0ea5e9',
      startDate: startDate,
      dueDate: dueDate,
      status: 'in-progress', // Default status
      createdAt: new Date().toISOString()
    });
  });
});

// PUT /api/projects/:id - Update an existing project
router.put('/:id', (req, res, next) => {
  const { name, description, client, color, startDate, dueDate, status } = req.body;
  const id = req.params.id;

  // Basic validation: ensure name is present if provided
  if (req.body.hasOwnProperty('name') && !name) {
      return res.status(400).json({ message: "Project name cannot be empty" });
  }

  // Construct the update query dynamically based on provided fields
  const fields = [];
  const params = [];

  if (req.body.hasOwnProperty('name')) { fields.push("name = ?"); params.push(name); }
  if (req.body.hasOwnProperty('description')) { fields.push("description = ?"); params.push(description); }
  if (req.body.hasOwnProperty('client')) { fields.push("client = ?"); params.push(client); }
  if (req.body.hasOwnProperty('color')) { fields.push("color = ?"); params.push(color); }
  if (req.body.hasOwnProperty('startDate')) { fields.push("startDate = ?"); params.push(startDate); }
  if (req.body.hasOwnProperty('dueDate')) { fields.push("dueDate = ?"); params.push(dueDate); }
  if (req.body.hasOwnProperty('status')) { fields.push("status = ?"); params.push(status); }

  if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
  }

  params.push(id); // Add id for the WHERE clause

  const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;

  db.run(sql, params, function (err) {
    if (err) {
      return next(err);
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Project not found or no changes made' });
    }
    // Fetch and return the updated project
    db.get("SELECT * FROM projects WHERE id = ?", [id], (err, row) => {
      if (err) {
        return next(err);
      }
      res.json(row);
    });
  });
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', (req, res, next) => {
  const sql = 'DELETE FROM projects WHERE id = ?';
  const params = [req.params.id];

  db.run(sql, params, function (err) {
    if (err) {
      return next(err);
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    // Also delete associated tasks and time entries (handled by FOREIGN KEY ON DELETE CASCADE)
    res.status(200).json({ message: 'Project deleted successfully' });
  });
});

module.exports = router;
