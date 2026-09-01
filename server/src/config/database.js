import mongoose from 'mongoose';

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return this.connection;
    }

    let uri;
    
    if (process.env.NODE_ENV === 'test') {
      // In test mode, require TEST_MONGODB_URI
      uri = process.env.TEST_MONGODB_URI;
      if (!uri) {
        throw new Error(
          'TEST_MONGODB_URI is required in test environment. ' +
          'Set TEST_MONGODB_URI to a test database URI before running tests. ' +
          'Example: TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test'
        );
      }
      
      // Additional safety guard to prevent production database usage in tests
      const productionPatterns = [
        /mongodb\+srv:\/\/.*\.mongodb\.net/, // MongoDB Atlas
        /production/i,
        /prod/i,
        /durga-library$/i, // Production database name
      ];
      const isProductionUri = productionPatterns.some(pattern => pattern.test(uri));
      if (isProductionUri) {
        throw new Error(
          'SAFETY GUARD: TEST_MONGODB_URI appears to be a production database URI. ' +
          'Use a dedicated test database. ' +
          'Current URI: ' + uri.replace(/:([^:@]+)@/, ':****@') // Mask password
        );
      }
    } else {
      // Production/development mode
      uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI is not set in environment variables');
      }
    }

    try {
      this.connection = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
      });

      this.isConnected = true;
      console.log('💾 MongoDB connected successfully!');

      this.connection.connection.on('disconnected', () => {
        this.isConnected = false;
        console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
      });

      this.connection.connection.on('reconnected', () => {
        this.isConnected = true;
        console.log('✅ MongoDB reconnected.');
      });

      this.connection.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      return this.connection;
    } catch (err) {
      console.error('❌ MongoDB initial connection failed:', err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB disconnected');
    }
  }

  getConnection() {
    return this.connection;
  }

  isReady() {
    return this.isConnected;
  }
}

export default new Database();
