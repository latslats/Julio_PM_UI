/**
 * Mock database module for testing
 */

// Create a mock client with all the methods we need
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
  on: jest.fn()
};

// Create a mock pool object with all the methods we need
const mockPool = {
  query: jest.fn().mockImplementation(() => Promise.resolve({ rows: [], rowCount: 0 })),
  connect: jest.fn().mockImplementation(() => Promise.resolve(mockClient))
};

// Export both the pool and client for use in tests
module.exports = mockPool;
module.exports.mockClient = mockClient;
