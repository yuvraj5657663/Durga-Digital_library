import mongoose from 'mongoose';
import config from '../../src/config/index.js';

export async function setupTestDB() {
  // Use test database
  const testDbUri = config.database.uri.replace(/\/[^/]*$/, '/durga-library-test');
  await mongoose.connect(testDbUri);
}

export async function teardownTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
