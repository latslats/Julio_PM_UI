const express = require('express');
const router = express.Router();
const db = require('../database.js');
const crypto = require('crypto');

// GET /api/tasks - Get all tasks (optionally filter by projectId)
router.get('/', (req, res, next) => {
  const projectId = req.query.projectId;
  let sql = "SELECT * FROM tasks";
  const params = [];

  if (projectId) {
    sql += " WHERE projectId = ?";
    params.push(projectId);
  }
  sql += " ORDER BY createdAt DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      return next(err);
    }
    res.json(rows);
  });
});

// GET /api/tasks/:id - Get a single task by ID
router.get('/:id', (req, res, next) => {
  const sql = "SELECT * FROM tasks WHERE id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      return next(err);
    }
    if (!row) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(row);
  });
});

// POST /api/tasks - Create a new task
router.post('/', (req, res, next) => {
  const { projectId, title, description, status, priority, dueDate, estimatedHours } = req.body;
  const errors = [];
  if (!projectId) {
    errors.push("Project ID is required");
  }
  if (!title) {
    errors.push("Task title is required");
  }
  // TODO: Add more validation (e.g., check if projectId exists)
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const id = crypto.randomUUID();
  const sql = `INSERT INTO tasks (id, projectId, title, description, status, priority, dueDate, estimatedHours) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    id,
    projectId,
    title,
    description,
    status || 'not-started',
    priority || 'medium',
    dueDate,
    estimatedHours
  ];

  db.run(sql, params, function (err) {
    if (err) {
      return next(err);
    }
    // Fetch and return the newly created task
    db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, row) => {
      if (err) {
        return next(err);
      }
      res.status(201).json(row);
    });
  });
});

// PUT /api/tasks/:id - Update an existing task
router.put('/:id', (req, res, next) => {
  const { projectId, title, description, status, priority, dueDate, estimatedHours } = req.body;
  const id = req.params.id;

  // Basic validation
  if (req.body.hasOwnProperty('title') && !title) {
      return res.status(400).json({ message: "Task title cannot be empty" });
  }
  if (req.body.hasOwnProperty('projectId') && !projectId) {
      return res.status(400).json({ message: "Project ID cannot be empty" });
  }
  // TODO: Add more validation (check if projectId exists if provided)

  // Construct the update query dynamically
  const fields = [];
  const params = [];

  // Only include fields that are present in the request body
  if (req.body.hasOwnProperty('projectId')) { fields.push("projectId = ?"); params.push(projectId); }
  if (req.body.hasOwnProperty('title')) { fields.push("title = ?"); params.push(title); }
  if (req.body.hasOwnProperty('description')) { fields.push("description = ?"); params.push(description); }
  if (req.body.hasOwnProperty('status')) { fields.push("status = ?"); params.push(status); }
  if (req.body.hasOwnProperty('priority')) { fields.push("priority = ?"); params.push(priority); }
  if (req.body.hasOwnProperty('dueDate')) { fields.push("dueDate = ?"); params.push(dueDate); }
  if (req.body.hasOwnProperty('estimatedHours')) { fields.push("estimatedHours = ?"); params.push(estimatedHours); }

  if (fields.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
  }

  params.push(id); // Add id for the WHERE clause

  const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;

  db.run(sql, params, function (err) {
    if (err) {
      return next(err);
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Task not found or no changes made' });
    }
    // Fetch and return the updated task
    db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, row) => {
      if (err) {
        return next(err);
      }
      res.json(row);
    });
  });
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', (req, res, next) => {
  const sql = 'DELETE FROM tasks WHERE id = ?';
  const params = [req.params.id];

  db.run(sql, params, function (err) {
    if (err) {
      return next(err);
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    // Associated time entries are deleted by FOREIGN KEY ON DELETE CASCADE
    res.status(200).json({ message: 'Task deleted successfully' });
  });
});

module.exports = router;
