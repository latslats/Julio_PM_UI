/**
 * Waiting Items API Routes
 * 
 * This module provides endpoints for managing waiting items in the TaskFlow application.
 * Waiting items represent requests or dependencies that a project is waiting on from external parties.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');

/**
 * Get all waiting items, optionally filtered by project
 * 
 * @route GET /api/waiting-items
 * @query {string} projectId - Optional project ID to filter by
 * @returns {Array} List of waiting items
 */
router.get('/', async (req, res) => {
  const { projectId } = req.query;
  
  try {
    const client = await pool.connect();
    
    let query = `
      SELECT w.*, p.name as "projectName" 
      FROM waiting_items w
      JOIN projects p ON w."projectId" = p.id
    `;
    
    const params = [];
    
    if (projectId) {
      query += ` WHERE w."projectId" = $1`;
      params.push(projectId);
    }
    
    query += ` ORDER BY w."sentDate" DESC`;
    
    const result = await client.query(query, params);
    client.release();
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching waiting items:', err);
    res.status(500).json({ message: 'Failed to fetch waiting items', error: err.message });
  }
});

/**
 * Get a specific waiting item by ID
 * 
 * @route GET /api/waiting-items/:id
 * @param {string} id - Waiting item ID
 * @returns {Object} Waiting item details
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Get waiting item details
    const waitingItemResult = await client.query(
      `SELECT w.*, p.name as "projectName" 
       FROM waiting_items w
       JOIN projects p ON w."projectId" = p.id
       WHERE w.id = $1`,
      [id]
    );
    
    if (waitingItemResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Waiting item not found' });
    }
    
    // Get timeline events for this waiting item
    const timelineResult = await client.query(
      `SELECT * FROM waiting_timeline_events
       WHERE "waitingItemId" = $1
       ORDER BY "eventDate" DESC`,
      [id]
    );
    
    client.release();
    
    // Combine waiting item with its timeline events
    const waitingItem = waitingItemResult.rows[0];
    waitingItem.timelineEvents = timelineResult.rows;
    
    res.json(waitingItem);
  } catch (err) {
    console.error('Error fetching waiting item:', err);
    res.status(500).json({ message: 'Failed to fetch waiting item', error: err.message });
  }
});

/**
 * Create a new waiting item
 * 
 * @route POST /api/waiting-items
 * @body {Object} waitingItem - Waiting item data
 * @returns {Object} Created waiting item
 */
router.post('/', async (req, res) => {
  const {
    projectId,
    requestType,
    priority,
    requestedFrom,
    status,
    sentDate,
    deadlineDate,
    receivedDate,
    notes,
    link
  } = req.body;
  
  // Validate required fields
  const errors = [];
  if (!projectId) errors.push('projectId is required');
  if (!requestType) errors.push('requestType is required');
  if (!requestedFrom) errors.push('requestedFrom is required');
  if (!sentDate) errors.push('sentDate is required');
  
  // Validate field formats
  if (requestType && !['Information', 'Approval', 'Feedback', 'Resource', 'Other'].includes(requestType)) {
    errors.push('requestType must be one of: Information, Approval, Feedback, Resource, Other');
  }
  
  if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
    errors.push('priority must be one of: low, medium, high, urgent');
  }
  
  if (status && !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
    errors.push('status must be one of: pending, in-progress, completed, cancelled');
  }
  
  // Validate date relationships
  if (sentDate && deadlineDate && new Date(sentDate) > new Date(deadlineDate)) {
    errors.push('sentDate cannot be after deadlineDate');
  }
  
  if (sentDate && receivedDate && new Date(sentDate) > new Date(receivedDate)) {
    errors.push('sentDate cannot be after receivedDate');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors 
    });
  }
  
  try {
    const client = await pool.connect();
    
    // Verify project exists
    const projectCheck = await client.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: `Project with ID ${projectId} does not exist` });
    }
    
    // Generate a new UUID for the waiting item
    const id = uuidv4();
    
    // Insert the waiting item
    const result = await client.query(
      `INSERT INTO waiting_items (
        id, "projectId", "requestType", priority, "requestedFrom", 
        status, "sentDate", "deadlineDate", notes, link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        id, projectId, requestType, priority || 'medium', requestedFrom,
        status || 'pending', sentDate, deadlineDate || null, notes || null, link || null
      ]
    );
    
    // Create initial timeline event for item creation
    await client.query(
      `INSERT INTO waiting_timeline_events (
        id, "waitingItemId", "eventType", description, "eventDate"
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(), id, 'created', 'Waiting item created', new Date()
      ]
    );
    
    // Get project name for response
    const projectResult = await client.query('SELECT name FROM projects WHERE id = $1', [projectId]);
    
    client.release();
    
    // Add project name to response
    const waitingItem = result.rows[0];
    waitingItem.projectName = projectResult.rows[0].name;
    
    res.status(201).json(waitingItem);
  } catch (err) {
    console.error('Error creating waiting item:', err);
    res.status(500).json({ message: 'Failed to create waiting item', error: err.message });
  }
});

/**
 * Update a waiting item
 * 
 * @route PUT /api/waiting-items/:id
 * @param {string} id - Waiting item ID
 * @body {Object} waitingItem - Updated waiting item data
 * @returns {Object} Updated waiting item
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    projectId,
    requestType,
    priority,
    requestedFrom,
    status,
    sentDate,
    deadlineDate,
    receivedDate,
    notes,
    link
  } = req.body;
  
  // Validate field formats if provided
  const errors = [];
  
  if (requestType && !['Information', 'Approval', 'Feedback', 'Resource', 'Other'].includes(requestType)) {
    errors.push('requestType must be one of: Information, Approval, Feedback, Resource, Other');
  }
  
  if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
    errors.push('priority must be one of: low, medium, high, urgent');
  }
  
  if (status && !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
    errors.push('status must be one of: pending, in-progress, completed, cancelled');
  }
  
  // Validate date relationships
  if (sentDate && deadlineDate && new Date(sentDate) > new Date(deadlineDate)) {
    errors.push('sentDate cannot be after deadlineDate');
  }
  
  if (sentDate && receivedDate && new Date(sentDate) > new Date(receivedDate)) {
    errors.push('sentDate cannot be after receivedDate');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors 
    });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if waiting item exists
    const checkResult = await client.query('SELECT * FROM waiting_items WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Waiting item not found' });
    }
    
    // Verify project exists if projectId is being updated
    if (projectId) {
      const projectCheck = await client.query('SELECT id FROM projects WHERE id = $1', [projectId]);
      if (projectCheck.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: `Project with ID ${projectId} does not exist` });
      }
    }
    
    const oldItem = checkResult.rows[0];
    
    // Build update query dynamically based on provided fields
    let updateQuery = 'UPDATE waiting_items SET "updatedAt" = NOW()';
    const updateValues = [];
    let paramIndex = 1;
    
    // Helper function to add parameters to the update query
    const addParam = (field, value) => {
      if (value !== undefined) {
        updateQuery += `, "${field}" = $${paramIndex}`;
        updateValues.push(value);
        paramIndex++;
      }
    };
    
    // Add parameters for each field that was provided
    addParam('projectId', projectId);
    addParam('requestType', requestType);
    addParam('priority', priority);
    addParam('requestedFrom', requestedFrom);
    addParam('status', status);
    addParam('sentDate', sentDate);
    addParam('deadlineDate', deadlineDate);
    addParam('receivedDate', receivedDate);
    addParam('notes', notes);
    addParam('link', link);
    
    // Complete the query
    updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
    updateValues.push(id);
    
    // Execute the update
    const result = await client.query(updateQuery, updateValues);
    
    // Create timeline event if status changed
    if (status && status !== oldItem.status) {
      await client.query(
        `INSERT INTO waiting_timeline_events (
          id, "waitingItemId", "eventType", description, "eventDate"
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          uuidv4(), id, 'status-change', `Status changed from ${oldItem.status} to ${status}`, new Date()
        ]
      );
    }
    
    // Create timeline event if received date was added
    if (receivedDate && !oldItem.receivedDate) {
      await client.query(
        `INSERT INTO waiting_timeline_events (
          id, "waitingItemId", "eventType", description, "eventDate"
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          uuidv4(), id, 'received', 'Response received', new Date(receivedDate)
        ]
      );
    }
    
    // Get project name for response
    const projectResult = await client.query(
      'SELECT name FROM projects WHERE id = $1', 
      [result.rows[0].projectId]
    );
    
    client.release();
    
    // Add project name to response
    const waitingItem = result.rows[0];
    waitingItem.projectName = projectResult.rows[0].name;
    
    res.json(waitingItem);
  } catch (err) {
    console.error('Error updating waiting item:', err);
    res.status(500).json({ message: 'Failed to update waiting item', error: err.message });
  }
});

/**
 * Delete a waiting item
 * 
 * @route DELETE /api/waiting-items/:id
 * @param {string} id - Waiting item ID
 * @returns {Object} Success message
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Check if waiting item exists
    const checkResult = await client.query('SELECT id FROM waiting_items WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Waiting item not found' });
    }
    
    // Delete the waiting item (timeline events will be deleted via CASCADE)
    await client.query('DELETE FROM waiting_items WHERE id = $1', [id]);
    
    client.release();
    
    res.json({ message: 'Waiting item deleted successfully' });
  } catch (err) {
    console.error('Error deleting waiting item:', err);
    res.status(500).json({ message: 'Failed to delete waiting item', error: err.message });
  }
});

/**
 * Add a timeline event to a waiting item
 * 
 * @route POST /api/waiting-items/:id/timeline
 * @param {string} id - Waiting item ID
 * @body {Object} event - Timeline event data
 * @returns {Object} Created timeline event
 */
router.post('/:id/timeline', async (req, res) => {
  const { id } = req.params;
  const { eventType, description, eventDate, createdBy } = req.body;
  
  // Validate required fields and formats
  const errors = [];
  if (!eventType) errors.push('eventType is required');
  if (!eventDate) errors.push('eventDate is required');
  
  // Validate eventType format
  if (eventType && !['created', 'updated', 'status-change', 'received', 'note', 'reminder', 'other'].includes(eventType)) {
    errors.push('eventType must be one of: created, updated, status-change, received, note, reminder, other');
  }
  
  // Validate eventDate is a valid date
  if (eventDate && isNaN(new Date(eventDate).getTime())) {
    errors.push('eventDate must be a valid date');
  }
  
  // Check description length if provided
  if (description && description.length > 500) {
    errors.push('description must be less than 500 characters');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors 
    });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if waiting item exists
    const checkResult = await client.query('SELECT id FROM waiting_items WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Waiting item not found' });
    }
    
    // Create the timeline event
    const result = await client.query(
      `INSERT INTO waiting_timeline_events (
        id, "waitingItemId", "eventType", description, "eventDate", "createdBy"
      ) VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [
        uuidv4(), id, eventType, description || null, eventDate, createdBy || null
      ]
    );
    
    client.release();
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating timeline event:', err);
    res.status(500).json({ message: 'Failed to create timeline event', error: err.message });
  }
});

/**
 * Get statistics for waiting items
 * 
 * @route GET /api/waiting-items/stats/overview
 * @query {string} projectId - Optional project ID to filter by
 * @returns {Object} Statistics about waiting items
 */
router.get('/stats/overview', async (req, res) => {
  const { projectId } = req.query;
  
  try {
    const client = await pool.connect();
    
    const params = [];
    let whereClause = '';
    
    if (projectId) {
      whereClause = 'WHERE "projectId" = $1';
      params.push(projectId);
    }
    
    // Get counts by status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM waiting_items
      ${whereClause}
      GROUP BY status
    `;
    
    // Get counts by priority
    const priorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM waiting_items
      ${whereClause}
      GROUP BY priority
    `;
    
    // Get average waiting time for completed items
    const avgTimeQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("receivedDate" - "sentDate"))/86400) as "avgWaitDays"
      FROM waiting_items
      WHERE "receivedDate" IS NOT NULL
      ${whereClause ? 'AND ' + whereClause.substring(6) : ''}
    `;
    
    // Execute all queries
    const statusResult = await client.query(statusQuery, params);
    const priorityResult = await client.query(priorityQuery, params);
    const avgTimeResult = await client.query(avgTimeQuery, params);
    
    client.release();
    
    // Format the response
    const statusCounts = {};
    statusResult.rows.forEach(row => {
      statusCounts[row.status] = parseInt(row.count);
    });
    
    const priorityCounts = {};
    priorityResult.rows.forEach(row => {
      priorityCounts[row.priority] = parseInt(row.count);
    });
    
    res.json({
      byStatus: statusCounts,
      byPriority: priorityCounts,
      avgWaitDays: avgTimeResult.rows[0].avgWaitDays || 0,
      total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
    });
  } catch (err) {
    console.error('Error fetching waiting items stats:', err);
    res.status(500).json({ message: 'Failed to fetch waiting items statistics', error: err.message });
  }
});

module.exports = router;
