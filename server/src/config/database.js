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

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not set in environment variables');
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
