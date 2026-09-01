import mongoose from 'mongoose';

export async function setupTestDB() {
  // Use TEST_MONGODB_URI in test environment, fallback to local MongoDB
  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/durga-library-test';
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
