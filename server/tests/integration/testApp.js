/**
 * Minimal Express app for integration tests
 * 
 * This app loads only the routes needed for integration tests,
 * avoiding the full application load that triggers mongoose model initialization.
 */

import express from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from '../../src/middlewares/errorHandler.js';

// Import only the routes needed for integration tests
import authRoutes from '../../src/routes/authRoutes.js';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load only auth routes for auth integration tests
app.use('/api/v1/auth', authRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
