/**
 * Express App Configuration (for testing)
 * Exports the app without starting the server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import activityRoutes from './routes/activities.js';
import activityElementRoutes from './routes/activityElements.js';
import questionRoutes from './routes/questions.js';
import submissionRoutes from './routes/submissions.js';
import submissionAnswerRoutes from './routes/submissionAnswers.js';
import rubricRoutes from './routes/rubrics.js';
import questionScoringRoutes from './routes/questionScoring.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/activity-elements', activityElementRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/submission-answers', submissionAnswerRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/question-scoring', questionScoringRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
