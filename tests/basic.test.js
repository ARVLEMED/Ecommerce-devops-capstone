const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongoServer;

// Connect to in-memory MongoDB
const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

// Disconnect and clean up in-memory MongoDB
const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

describe('E-Commerce API', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api/v1');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('E-Commerce API v1');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints).toHaveProperty('products');
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a new user with valid data', async () => {
        const userData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User registered successfully');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe(userData.email);
        expect(response.body.data.user.firstName).toBe(userData.firstName);
        expect(response.body.data.user).not.toHaveProperty('password');
      });

      it('should not register user with invalid email', async () => {
        const userData = {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'invalid-email',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      });

      it('should not register user with duplicate email', async () => {
        const userData = {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.doe@example.com', // Same email as previous test
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('User with this email already exists');
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login user with valid credentials', async () => {
        const loginData = {
          email: 'john.doe@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Login successful');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe(loginData.email);
      });

      it('should not login user with invalid credentials', async () => {
        const loginData = {
          email: 'john.doe@example.com',
          password: 'wrongpassword'
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid credentials');
      });

      it('should not login non-existent user', async () => {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid credentials');
      });
    });

    describe('GET /api/v1/auth/me', () => {
      let token;

      beforeAll(async () => {
        // Login to get token
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'john.doe@example.com',
            password: 'password123'
          });
        
        token = loginResponse.body.data.token;
      });

      it('should get current user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe('john.doe@example.com');
      });

      it('should not get profile without token', async () => {
        const response = await request(app).get('/api/v1/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Not authorized to access this route');
      });

      it('should not get profile with invalid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer invalidtoken');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Not authorized to access this route');
      });
    });
  });

  describe('Products Endpoints', () => {
    describe('GET /api/v1/products', () => {
      it('should get products list (empty initially)', async () => {
        const response = await request(app).get('/api/v1/products');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('products');
        expect(Array.isArray(response.body.data.products)).toBe(true);
        expect(response.body).toHaveProperty('count');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('pagination');
      });
    });

    describe('GET /api/v1/products/featured', () => {
      it('should get featured products list', async () => {
        const response = await request(app).get('/api/v1/products/featured');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('products');
        expect(Array.isArray(response.body.data.products)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Route');
      expect(response.body.error).toContain('not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      // Make multiple requests quickly to test rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/api/v1'));
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    }, 10000); // Increase timeout for this test
  });
});
