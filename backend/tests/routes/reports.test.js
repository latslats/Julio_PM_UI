/**
 * Unit tests for the reports routes
 */
const request = require('supertest');
const express = require('express');

// Mock the database module before requiring the router
jest.mock('../../database.js', () => require('../mocks/database'));

// Now we can safely require the router that uses the database
const reportsRouter = require('../../routes/reports');
const { pool } = require('../setup');

// Create a test app with the reports router
const app = express();
app.use(express.json());
app.use('/api/reports', reportsRouter);

describe('Reports API', () => {
  // Test data
  const mockProjects = [
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Project 1',
      color: '#FF5733',
      totalSeconds: 3600, // 1 hour
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Project 2',
      color: '#33FF57',
      totalSeconds: 7200, // 2 hours
    }
  ];

  const mockTasks = [
    {
      taskId: '123e4567-e89b-12d3-a456-426614174003',
      taskTitle: 'Task 1',
      taskStatus: 'completed',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      projectName: 'Project 1',
      projectColor: '#FF5733',
      totalSeconds: 1800, // 30 minutes
      entryCount: 2
    },
    {
      taskId: '123e4567-e89b-12d3-a456-426614174004',
      taskTitle: 'Task 2',
      taskStatus: 'in-progress',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      projectName: 'Project 1',
      projectColor: '#FF5733',
      totalSeconds: 1800, // 30 minutes
      entryCount: 1
    }
  ];

  const mockDailySummary = [
    {
      day: '2025-04-01T00:00:00.000Z',
      totalSeconds: 3600, // 1 hour
      taskCount: 2
    },
    {
      day: '2025-03-31T00:00:00.000Z',
      totalSeconds: 7200, // 2 hours
      taskCount: 3
    }
  ];

  describe('GET /api/reports/time-by-project', () => {
    it('should return time by project for the default range (week)', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: mockProjects });

      const response = await request(app).get('/api/reports/time-by-project');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('range', 'week');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('totalHours');
      expect(response.body.data[0]).toHaveProperty('totalFormatted');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should accept a custom range parameter', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: mockProjects });

      const response = await request(app)
        .get('/api/reports/time-by-project')
        .query({ range: 'month' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('range', 'month');
      expect(pool.query).toHaveBeenCalledTimes(1);
      
      // Check that the query includes the date range parameters
      const queryCall = pool.query.mock.calls[0];
      expect(queryCall[1]).toHaveLength(2); // Two date parameters
    });
  });

  describe('GET /api/reports/time-by-task', () => {
    it('should return time by task for the default range (week)', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: mockTasks });

      const response = await request(app).get('/api/reports/time-by-task');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('range', 'week');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('totalHours');
      expect(response.body.data[0]).toHaveProperty('totalFormatted');
      expect(response.body.data[0]).toHaveProperty('entryCount');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should filter by projectId when provided', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: mockTasks.filter(t => t.projectId === mockProjects[0].id) });

      const response = await request(app)
        .get('/api/reports/time-by-task')
        .query({ projectId: mockProjects[0].id });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectId', mockProjects[0].id);
      expect(pool.query).toHaveBeenCalledTimes(1);
      
      // Check that the query includes the projectId parameter
      const queryCall = pool.query.mock.calls[0];
      expect(queryCall[0]).toContain('projectId');
      expect(queryCall[1]).toContain(mockProjects[0].id);
    });
  });

  describe('GET /api/reports/daily-summary', () => {
    it('should return daily summary for the default range (week)', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: mockDailySummary });

      const response = await request(app).get('/api/reports/daily-summary');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('range', 'week');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('day');
      expect(response.body.data[0]).toHaveProperty('dayOfWeek');
      expect(response.body.data[0]).toHaveProperty('totalHours');
      expect(response.body.data[0]).toHaveProperty('totalFormatted');
      expect(response.body.data[0]).toHaveProperty('taskCount');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      pool.query.mockRejectedValueOnce(new Error('Database connection error'));

      // Create a custom middleware to capture the response
      app.use((err, req, res, next) => {
        res.status(500).json({ message: 'Database error', detail: err.message });
      });

      const response = await request(app).get('/api/reports/daily-summary');
      
      expect(response.status).toBe(500);
      // The error middleware should return an object with some error information
      expect(response.body).toEqual(expect.objectContaining({
        message: expect.any(String)
      }));
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  // Edge case tests
  describe('Edge cases', () => {
    it('should handle empty result sets', async () => {
      // Mock empty results
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/reports/time-by-project');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });
});
