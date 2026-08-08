#!/usr/bin/env node

/**
 * Migration script to help transition from the old structure to the new monorepo
 * This script handles data migration and configuration setup
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting migration process...');

// Create necessary directories
const directories = [
  'server/logs',
  'server/uploads',
  'client/dist',
];

directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Copy environment variables if they exist
const oldEnvPath = path.join(process.cwd(), '.env');
const newServerEnvPath = path.join(process.cwd(), 'server', '.env');
const newClientEnvPath = path.join(process.cwd(), 'client', '.env');

if (fs.existsSync(oldEnvPath)) {
  // Copy to server
  if (!fs.existsSync(newServerEnvPath)) {
    fs.copyFileSync(oldEnvPath, newServerEnvPath);
    console.log('✅ Copied .env to server/.env');
  }
  
  // Create client env
  if (!fs.existsSync(newClientEnvPath)) {
    const clientEnv = 'VITE_API_URL=http://localhost:3000/api/v1\n';
    fs.writeFileSync(newClientEnvPath, clientEnv);
    console.log('✅ Created client/.env');
  }
}

console.log('✅ Migration completed successfully!');
console.log('\nNext steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Install server dependencies: cd server && npm install');
console.log('3. Install client dependencies: cd client && npm install');
console.log('4. Start development: npm run dev');
