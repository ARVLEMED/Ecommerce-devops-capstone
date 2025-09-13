// MongoDB initialization script
// This runs when the MongoDB container starts for the first time

db = db.getSiblingDB('ecommerce_dev');

// Create application user
db.createUser({
  user: 'ecommerce_user',
  pwd: 'ecommerce_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'ecommerce_dev'
    }
  ]
});

// Create test database and user
db = db.getSiblingDB('ecommerce_test');

db.createUser({
  user: 'ecommerce_test_user',
  pwd: 'ecommerce_test_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'ecommerce_test'
    }
  ]
});

print('Database initialization completed');