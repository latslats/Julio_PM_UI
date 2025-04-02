const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subMonths, subWeeks } = require('date-fns');

// Re-use the enhanced error handling function
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
 * Helper function to get date range based on range parameter
 * 
 * @param {string} range - Range identifier (week, month, etc.)
 * @returns {Object} Object with start and end dates
 */
const getDateRange = (range) => {
  const now = new Date();
  let startDate, endDate;
  
  switch(range) {
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'last-week':
      startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case 'last-month':
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    default:
      // Default to current week
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
  }
  
  return { startDate, endDate };
};

/**
 * GET /api/reports/time-by-project
 * Get aggregated time data by project for a specific time range
 */
router.get('/time-by-project', async (req, res, next) => {
  const { range = 'week' } = req.query;
  const { startDate, endDate } = getDateRange(range);
  
  try {
    // Query to get total time by project within date range
    const query = `
      SELECT 
        p.id as "projectId",
        p.name as "projectName",
        p.color as "projectColor",
        COALESCE(SUM(te.duration), 0) as "totalSeconds"
      FROM 
        projects p
      LEFT JOIN 
        tasks t ON t."projectId" = p.id
      LEFT JOIN 
        time_entries te ON te."taskId" = t.id AND 
        (te."startTime" >= $1 AND te."startTime" <= $2) AND
        te."endTime" IS NOT NULL
      GROUP BY 
        p.id, p.name, p.color
      ORDER BY 
        "totalSeconds" DESC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    
    // Format the response with additional metadata
    const response = {
      range,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      data: result.rows.map(row => ({
        ...row,
        totalHours: parseFloat((row.totalSeconds / 3600).toFixed(2)),
        totalFormatted: formatTimeFromSeconds(row.totalSeconds)
      }))
    };
    
    res.json(response);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

/**
 * GET /api/reports/time-by-task
 * Get aggregated time data by task for a specific time range
 */
router.get('/time-by-task', async (req, res, next) => {
  const { range = 'week', projectId } = req.query;
  const { startDate, endDate } = getDateRange(range);
  
  try {
    // Build query parameters
    const params = [startDate, endDate];
    let projectFilter = '';
    
    if (projectId) {
      projectFilter = 'AND t."projectId" = $3';
      params.push(projectId);
    }
    
    // Query to get total time by task within date range
    const query = `
      SELECT 
        t.id as "taskId",
        t.title as "taskTitle",
        t.status as "taskStatus",
        p.id as "projectId",
        p.name as "projectName",
        p.color as "projectColor",
        COALESCE(SUM(te.duration), 0) as "totalSeconds",
        COUNT(te.id) as "entryCount"
      FROM 
        tasks t
      JOIN 
        projects p ON t."projectId" = p.id
      LEFT JOIN 
        time_entries te ON te."taskId" = t.id AND 
        (te."startTime" >= $1 AND te."startTime" <= $2) AND
        te."endTime" IS NOT NULL
      WHERE 
        1=1 ${projectFilter}
      GROUP BY 
        t.id, t.title, t.status, p.id, p.name, p.color
      ORDER BY 
        "totalSeconds" DESC
    `;
    
    const result = await pool.query(query, params);
    
    // Format the response with additional metadata
    const response = {
      range,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      projectId: projectId || null,
      data: result.rows.map(row => ({
        ...row,
        totalHours: parseFloat((row.totalSeconds / 3600).toFixed(2)),
        totalFormatted: formatTimeFromSeconds(row.totalSeconds)
      }))
    };
    
    res.json(response);
  } catch (err) {
    handleDatabaseError(err, res, next);
  }
});

/**
 * GET /api/reports/daily-summary
 * Get daily time summary for a specific time range
 */
router.get('/daily-summary', async (req, res, next) => {
  const { range = 'week' } = req.query;
  const { startDate, endDate } = getDateRange(range);
  
  try {
    // Query to get daily time summary within date range
    const query = `
      SELECT 
        DATE_TRUNC('day', te."startTime") as "day",
        COALESCE(SUM(te.duration), 0) as "totalSeconds",
        COUNT(DISTINCT te."taskId") as "taskCount"
      FROM 
        time_entries te
      WHERE 
        te."startTime" >= $1 AND te."startTime" <= $2 AND
        te."endTime" IS NOT NULL
      GROUP BY 
        "day"
      ORDER BY 
        "day"
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    
    // Format the response with additional metadata
    const response = {
      range,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      data: result.rows.map(row => ({
        day: format(new Date(row.day), 'yyyy-MM-dd'),
        dayOfWeek: format(new Date(row.day), 'EEEE'),
        totalSeconds: row.totalSeconds,
        totalHours: parseFloat((row.totalSeconds / 3600).toFixed(2)),
        totalFormatted: formatTimeFromSeconds(row.totalSeconds),
        taskCount: row.taskCount
      }))
    };
    
    res.json(response);
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

module.exports = router;
