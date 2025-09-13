// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper function to create test user data
  createUserData: (overrides = {}) => ({
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    ...overrides
  }),

  // Helper function to create test product data
  createProductData: (overrides = {}) => ({
    name: 'Test Product',
    description: 'This is a test product description that is long enough to pass validation.',
    price: 99.99,
    inventory: {
      sku: `TEST-${Date.now()}`,
      quantity: 100
    },
    category: '507f1f77bcf86cd799439011', // Mock ObjectId
    ...overrides
  }),

  // Helper function to generate valid ObjectId
  generateObjectId: () => {
    const mongoose = require('mongoose');
    return new mongoose.Types.ObjectId();
  }
};

// Global beforeEach to clear console warnings in tests
beforeEach(() => {
  // Suppress console.log during tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

// Global afterEach to restore console
afterEach(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log.mockRestore?.();
    console.warn.mockRestore?.();
  }
});