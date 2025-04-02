/**
 * Unit tests for the time entries routes
 */
const request = require('supertest');
const express = require('express');

// Mock the database module before requiring the router
jest.mock('../../database.js', () => require('../mocks/database'));

// Now we can safely require the router that uses the database
const timeEntriesRouter = require('../../routes/timeEntries');
const { pool } = require('../setup');

// Create a test app with the time entries router
const app = express();
app.use(express.json());
app.use('/api/time-entries', timeEntriesRouter);

describe('Time Entries API', () => {
  // Test data
  const mockTimeEntry = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    taskId: '123e4567-e89b-12d3-a456-426614174001',
    startTime: new Date().toISOString(),
    endTime: null,
    duration: null,
    isPaused: false,
    lastResumedAt: new Date().toISOString(),
    totalPausedDuration: 0
  };

  const mockTask = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Task',
    projectId: '123e4567-e89b-12d3-a456-426614174002',
    status: 'in-progress'
  };

  const mockProject = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Test Project',
    color: '#FF5733'
  };

  describe('GET /api/time-entries', () => {
    it('should return all time entries with task and project information', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({
        rows: [{
          ...mockTimeEntry,
          taskTitle: mockTask.title,
          projectId: mockProject.id,
          projectName: mockProject.name,
          projectColor: mockProject.color,
          taskStatus: mockTask.status,
          taskPriority: 'medium'
        }]
      });

      const response = await request(app).get('/api/time-entries');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].taskTitle).toBe(mockTask.title);
      expect(response.body[0].projectName).toBe(mockProject.name);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should filter time entries by taskId when provided', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: [mockTimeEntry] });

      const response = await request(app)
        .get('/api/time-entries')
        .query({ taskId: mockTask.id });
      
      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(1);
      
      // Check that the query includes the taskId filter
      const queryCall = pool.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
      expect(queryCall[0]).toContain('te."taskId" = $1');
      expect(queryCall[1]).toContain(mockTask.id);
    });

    it('should filter time entries by projectId when provided', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: [mockTimeEntry] });

      const response = await request(app)
        .get('/api/time-entries')
        .query({ projectId: mockProject.id });
      
      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(1);
      
      // Check that the query includes the projectId filter
      const queryCall = pool.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
      expect(queryCall[0]).toContain('t."projectId" = $1');
      expect(queryCall[1]).toContain(mockProject.id);
    });

    it('should filter active time entries when active=true is provided', async () => {
      // Mock the database response
      pool.query.mockResolvedValueOnce({ rows: [mockTimeEntry] });

      const response = await request(app)
        .get('/api/time-entries')
        .query({ active: 'true' });
      
      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(1);
      
      // Check that the query includes the active filter
      const queryCall = pool.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
      expect(queryCall[0]).toContain('te."endTime" IS NULL');
    });
  });

  describe('POST /api/time-entries/start', () => {
    it('should create a new time entry when taskId is valid', async () => {
      // Mock the task check query
      pool.query.mockResolvedValueOnce({ rows: [{ id: mockTask.id }] });
      
      // Mock the insert query
      pool.query.mockResolvedValueOnce({ rows: [mockTimeEntry] });

      const response = await request(app)
        .post('/api/time-entries/start')
        .send({ taskId: mockTask.id });
      
      expect(response.status).toBe(201);
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(response.body).toHaveProperty('id');
      expect(response.body.taskId).toBe(mockTask.id);
      expect(response.body.isPaused).toBe(false);
    });

    it('should return 400 when taskId is not provided', async () => {
      const response = await request(app)
        .post('/api/time-entries/start')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('required');
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 400 when taskId does not exist', async () => {
      // Mock the task check query with empty result
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/time-entries/start')
        .send({ taskId: 'non-existent-id' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('does not exist');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/time-entries/stop/:id', () => {
    it('should stop a running time entry', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
        on: jest.fn()
      };
      
      // Mock the client connection
      pool.connect.mockResolvedValueOnce(mockClient);
      
      // Mock the begin transaction
      mockClient.query.mockResolvedValueOnce({});
      
      // Mock the select query
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          isPaused: false,
          lastResumedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          totalPausedDuration: 0,
          pausedAt: null
        }]
      });
      
      // Mock the update query
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          ...mockTimeEntry,
          endTime: new Date().toISOString(),
          duration: 3600 // 1 hour in seconds
        }]
      });
      
      // Mock the commit
      mockClient.query.mockResolvedValueOnce({});

      const response = await request(app)
        .put(`/api/time-entries/stop/${mockTimeEntry.id}`);
      
      expect(response.status).toBe(200);
      expect(mockClient.query).toHaveBeenCalledTimes(4); // BEGIN, SELECT, UPDATE, COMMIT
      expect(response.body).toHaveProperty('endTime');
      expect(response.body).toHaveProperty('duration');
    });

    it('should return 404 when time entry is not found or already stopped', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
        on: jest.fn()
      };
      
      // Mock the client connection
      pool.connect.mockResolvedValueOnce(mockClient);
      
      // Mock the begin transaction
      mockClient.query.mockResolvedValueOnce({});
      
      // Mock the select query with empty result
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock the rollback
      mockClient.query.mockResolvedValueOnce({});

      const response = await request(app)
        .put(`/api/time-entries/stop/non-existent-id`);
      
      expect(response.status).toBe(404);
      expect(mockClient.query).toHaveBeenCalledTimes(3); // BEGIN, SELECT, ROLLBACK
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });
  });

  // Edge case tests
  describe('Edge cases', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      pool.query.mockRejectedValueOnce(new Error('Database connection error'));

      // Mock the response methods
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      // Create a custom middleware to capture the response
      app.use((err, req, res, next) => {
        res.status(500).json({ message: 'Database error', detail: err.message });
      });

      const response = await request(app).get('/api/time-entries');
      
      expect(response.status).toBe(500);
      // The error middleware should return an object with some error information
      expect(response.body).toEqual(expect.objectContaining({
        message: expect.any(String)
      }));
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });
});
