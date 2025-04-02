/**
 * Test setup file for the TaskFlow backend
 * 
 * This file contains common setup and teardown functions for tests
 */

// Import the mock database module
const pool = require('./mocks/database');

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

module.exports = {
  pool
};
