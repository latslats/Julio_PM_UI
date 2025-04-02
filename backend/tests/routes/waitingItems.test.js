/**
 * Unit tests for the waiting items routes
 */
const request = require('supertest');
const express = require('express');

// Mock the database module before requiring the router
jest.mock('../../database.js', () => require('../mocks/database'));

// Now we can safely require the router that uses the database
const waitingItemsRouter = require('../../routes/waitingItems');
const pool = require('../mocks/database');
const mockClient = pool.mockClient;

// Create a test app with the waiting items router
const app = express();
app.use(express.json());
app.use('/api/waiting-items', waitingItemsRouter);

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
});

describe('Waiting Items API', () => {
  // Test data
  const mockWaitingItem = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    projectId: '123e4567-e89b-12d3-a456-426614174002',
    requestType: 'Information',
    priority: 'medium',
    requestedFrom: 'Client A',
    status: 'pending',
    sentDate: new Date().toISOString(),
    deadlineDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    notes: 'Test notes',
    link: 'https://example.com'
  };

  const mockProject = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Test Project'
  };

  const mockTimelineEvent = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    waitingItemId: mockWaitingItem.id,
    eventType: 'created',
    description: 'Waiting item created',
    eventDate: new Date().toISOString()
  };

  describe('GET /api/waiting-items', () => {
    it('should return all waiting items', async () => {
      // Mock the database response
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockWaitingItem, projectName: mockProject.name }] });

      const response = await request(app).get('/api/waiting-items');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].requestType).toBe(mockWaitingItem.requestType);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should filter waiting items by projectId when provided', async () => {
      // Mock the database response
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockWaitingItem, projectName: mockProject.name }] });

      const response = await request(app)
        .get('/api/waiting-items')
        .query({ projectId: mockWaitingItem.projectId });
      
      expect(response.status).toBe(200);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      
      // Check that the query includes the projectId filter
      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
      expect(queryCall[1]).toContain(mockWaitingItem.projectId);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/waiting-items/:id', () => {
    it('should return a waiting item by id with its timeline events', async () => {
      // Mock the waiting item query
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockWaitingItem, projectName: mockProject.name }] });
      // Mock the timeline events query
      mockClient.query.mockResolvedValueOnce({ rows: [mockTimelineEvent] });

      const response = await request(app).get(`/api/waiting-items/${mockWaitingItem.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mockWaitingItem.id);
      expect(response.body.requestType).toBe(mockWaitingItem.requestType);
      expect(response.body.timelineEvents).toHaveLength(1);
      expect(response.body.timelineEvents[0].eventType).toBe(mockTimelineEvent.eventType);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should return 404 when waiting item is not found', async () => {
      // Mock the database response with empty result
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/waiting-items/non-existent-id');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/waiting-items', () => {
    it('should create a new waiting item when all required fields are provided and projectId exists', async () => {
      // Mock the project check query
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: mockProject.id }] });
      
      // Mock the insert query
      mockClient.query.mockResolvedValueOnce({ rows: [mockWaitingItem] });
      
      // Mock the timeline event insert query
      mockClient.query.mockResolvedValueOnce({ rows: [mockTimelineEvent] });
      
      // Mock the project name query
      mockClient.query.mockResolvedValueOnce({ rows: [{ name: mockProject.name }] });

      const response = await request(app)
        .post('/api/waiting-items')
        .send({
          projectId: mockWaitingItem.projectId,
          requestType: mockWaitingItem.requestType,
          requestedFrom: mockWaitingItem.requestedFrom,
          sentDate: mockWaitingItem.sentDate
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.projectId).toBe(mockWaitingItem.projectId);
      expect(response.body.requestType).toBe(mockWaitingItem.requestType);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/waiting-items')
        .send({
          // Missing required fields
          priority: 'high'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('projectId is required');
      expect(response.body.errors).toContain('requestType is required');
      expect(response.body.errors).toContain('requestedFrom is required');
      expect(response.body.errors).toContain('sentDate is required');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 400 when field formats are invalid', async () => {
      const response = await request(app)
        .post('/api/waiting-items')
        .send({
          projectId: mockWaitingItem.projectId,
          requestType: 'InvalidType',
          priority: 'invalid-priority',
          status: 'invalid-status',
          requestedFrom: mockWaitingItem.requestedFrom,
          sentDate: mockWaitingItem.sentDate
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('requestType must be one of: Information, Approval, Feedback, Resource, Other');
      expect(response.body.errors).toContain('priority must be one of: low, medium, high, urgent');
      expect(response.body.errors).toContain('status must be one of: pending, in-progress, completed, cancelled');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 400 when date relationships are invalid', async () => {
      const futureDate = new Date();
      const pastDate = new Date(futureDate);
      pastDate.setDate(futureDate.getDate() - 7);
      
      const response = await request(app)
        .post('/api/waiting-items')
        .send({
          projectId: mockWaitingItem.projectId,
          requestType: mockWaitingItem.requestType,
          requestedFrom: mockWaitingItem.requestedFrom,
          sentDate: futureDate.toISOString(),
          deadlineDate: pastDate.toISOString(), // Deadline before sent date
          receivedDate: pastDate.toISOString()  // Received before sent date
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('sentDate cannot be after deadlineDate');
      expect(response.body.errors).toContain('sentDate cannot be after receivedDate');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 404 when project does not exist', async () => {
      // Mock the project check query with empty result
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/waiting-items')
        .send({
          projectId: 'non-existent-project-id',
          requestType: mockWaitingItem.requestType,
          requestedFrom: mockWaitingItem.requestedFrom,
          sentDate: mockWaitingItem.sentDate
        });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Project with ID');
      expect(response.body.message).toContain('does not exist');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/waiting-items/:id', () => {
    it('should update a waiting item when all validations pass', async () => {
      // Create a specific test ID for this test
      const testId = '123e4567-e89b-12d3-a456-426614174001';
      const testItem = { ...mockWaitingItem, id: testId };
      
      // Mock the waiting item check query
      mockClient.query.mockResolvedValueOnce({ rows: [testItem] });
      
      // Mock the project check query (only needed if projectId is being updated)
      // mockClient.query.mockResolvedValueOnce({ rows: [{ id: mockProject.id }] });
      
      // Mock the update query with the correct ID
      const updatedItem = { ...testItem, status: 'completed' };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedItem] });
      
      // Mock the timeline event insert query (for status change)
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockTimelineEvent, waitingItemId: testId, eventType: 'status-change' }] });
      
      // Mock the project name query
      mockClient.query.mockResolvedValueOnce({ rows: [{ name: mockProject.name }] });

      const response = await request(app)
        .put(`/api/waiting-items/${testId}`)
        .send({
          status: 'completed'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testId);
      expect(response.body.status).toBe('completed');
      expect(mockClient.query).toHaveBeenCalledTimes(4); // Only 4 queries since we're not updating projectId
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when field formats are invalid', async () => {
      const response = await request(app)
        .put(`/api/waiting-items/${mockWaitingItem.id}`)
        .send({
          requestType: 'InvalidType',
          priority: 'invalid-priority',
          status: 'invalid-status'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('requestType must be one of: Information, Approval, Feedback, Resource, Other');
      expect(response.body.errors).toContain('priority must be one of: low, medium, high, urgent');
      expect(response.body.errors).toContain('status must be one of: pending, in-progress, completed, cancelled');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 400 when date relationships are invalid', async () => {
      const futureDate = new Date();
      const pastDate = new Date(futureDate);
      pastDate.setDate(futureDate.getDate() - 7);
      
      const response = await request(app)
        .put(`/api/waiting-items/${mockWaitingItem.id}`)
        .send({
          sentDate: futureDate.toISOString(),
          deadlineDate: pastDate.toISOString(), // Deadline before sent date
          receivedDate: pastDate.toISOString()  // Received before sent date
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('sentDate cannot be after deadlineDate');
      expect(response.body.errors).toContain('sentDate cannot be after receivedDate');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 404 when waiting item does not exist', async () => {
      // Mock the waiting item check query with empty result
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/waiting-items/non-existent-id')
        .send({
          status: 'completed'
        });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should return 404 when project does not exist', async () => {
      // Mock the waiting item check query
      mockClient.query.mockResolvedValueOnce({ rows: [mockWaitingItem] });
      
      // Mock the project check query with empty result
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put(`/api/waiting-items/${mockWaitingItem.id}`)
        .send({
          projectId: 'non-existent-project-id'
        });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Project with ID');
      expect(response.body.message).toContain('does not exist');
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/waiting-items/:id/timeline', () => {
    it('should add a timeline event when all validations pass', async () => {
      // Mock the waiting item check query
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: mockWaitingItem.id }] });
      
      // Mock the insert query
      mockClient.query.mockResolvedValueOnce({ rows: [mockTimelineEvent] });

      const response = await request(app)
        .post(`/api/waiting-items/${mockWaitingItem.id}/timeline`)
        .send({
          eventType: mockTimelineEvent.eventType,
          description: mockTimelineEvent.description,
          eventDate: mockTimelineEvent.eventDate
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.eventType).toBe(mockTimelineEvent.eventType);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post(`/api/waiting-items/${mockWaitingItem.id}/timeline`)
        .send({
          // Missing required fields
          description: 'Test description'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('eventType is required');
      expect(response.body.errors).toContain('eventDate is required');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 400 when eventType is invalid', async () => {
      const response = await request(app)
        .post(`/api/waiting-items/${mockWaitingItem.id}/timeline`)
        .send({
          eventType: 'invalid-event-type',
          eventDate: mockTimelineEvent.eventDate
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('eventType must be one of: created, updated, status-change, received, note, reminder, other');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 400 when eventDate is invalid', async () => {
      const response = await request(app)
        .post(`/api/waiting-items/${mockWaitingItem.id}/timeline`)
        .send({
          eventType: mockTimelineEvent.eventType,
          eventDate: 'not-a-date'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('eventDate must be a valid date');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 400 when description is too long', async () => {
      // Create a description that's over 500 characters
      const longDescription = 'A'.repeat(501);
      
      const response = await request(app)
        .post(`/api/waiting-items/${mockWaitingItem.id}/timeline`)
        .send({
          eventType: mockTimelineEvent.eventType,
          eventDate: mockTimelineEvent.eventDate,
          description: longDescription
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('description must be less than 500 characters');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return 404 when waiting item does not exist', async () => {
      // Mock the waiting item check query with empty result
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/waiting-items/non-existent-id/timeline')
        .send({
          eventType: mockTimelineEvent.eventType,
          eventDate: mockTimelineEvent.eventDate
        });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/waiting-items/:id', () => {
    it('should delete a waiting item when it exists', async () => {
      // Mock the waiting item check query
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: mockWaitingItem.id }] });
      
      // Mock the delete query
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app).delete(`/api/waiting-items/${mockWaitingItem.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should return 404 when waiting item does not exist', async () => {
      // Mock the waiting item check query with empty result
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).delete('/api/waiting-items/non-existent-id');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      mockClient.query.mockRejectedValueOnce(new Error('Database connection error'));

      const response = await request(app).get('/api/waiting-items');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to fetch waiting items');
      expect(response.body).toHaveProperty('error');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });
});
