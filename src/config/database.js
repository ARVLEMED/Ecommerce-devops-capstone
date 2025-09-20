const mongoose = require('mongoose');

class DatabaseConfig {
  constructor() {
    this.mongoUri = this.getMongoUri();
    this.options = this.getConnectionOptions();
  }

  getMongoUri() {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
      case 'test':
        return process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ecommerce_test';
      case 'production':
        return process.env.MONGODB_URI || process.env.MONGODB_PROD_URI;
      default:
        return process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_dev';
    }
  }

  getConnectionOptions() {
    return {
      // ✅ Core options
      useNewUrlParser: true,
      useUnifiedTopology: true,

      // ✅ Performance options
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,

      // ❌ Removed deprecated options
      // bufferMaxEntries → removed in MongoDB Node Driver v4
      // bufferCommands → defaults to true, keep as needed

      // ✅ Production-safe writes
      ...(process.env.NODE_ENV === 'production' && {
        retryWrites: true,
        w: 'majority'
      })
    };
  }

  async connect() {
    try {
      console.log('🔄 Connecting to MongoDB...');
      console.log(`📍 Database URI: ${this.mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

      await mongoose.connect(this.mongoUri, this.options);

      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

      this.setupEventHandlers();

      return mongoose.connection;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1); // Exit if DB fails to connect
    }
  }

  setupEventHandlers() {
    const db = mongoose.connection;

    db.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    db.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    db.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      db.close(() => {
        console.log('📴 MongoDB connection closed due to app termination');
        process.exit(0);
      });
    });
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('📴 MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      state: states[mongoose.connection.readyState],
      database: mongoose.connection.db?.databaseName,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  }
}

const dbConfig = new DatabaseConfig();
module.exports = dbConfig;
