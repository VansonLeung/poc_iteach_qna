import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import database models and initialize
import { sequelize, syncDatabase } from './models/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import activityRoutes from './routes/activities.js';
import activityElementRoutes from './routes/activityElements.js';
import questionRoutes from './routes/questions.js';
import submissionRoutes from './routes/submissions.js';
import submissionAnswerRoutes from './routes/submissionAnswers.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Sync database
    await syncDatabase();
    console.log('✓ Database connection established');

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 iTeach Q&A Platform - Server Running (Sequelize)    ║
║                                                           ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                  ║
║   CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}              ║
║                                                           ║
║   API Endpoints:                                          ║
║   - POST   /api/auth/register                             ║
║   - POST   /api/auth/login                                ║
║   - GET    /api/auth/me                                   ║
║                                                           ║
║   - GET    /api/activities                                ║
║   - POST   /api/activities                                ║
║   - GET    /api/activities/:id                            ║
║   - PUT    /api/activities/:id                            ║
║   - DELETE /api/activities/:id/archive                    ║
║                                                           ║
║   - GET    /api/activity-elements                         ║
║   - POST   /api/activity-elements                         ║
║   - GET    /api/activity-elements/:id                     ║
║   - PUT    /api/activity-elements/:id                     ║
║   - DELETE /api/activity-elements/:id/archive             ║
║                                                           ║
║   - GET    /api/questions                                 ║
║   - POST   /api/questions                                 ║
║   - GET    /api/questions/:id                             ║
║   - PUT    /api/questions/:id                             ║
║   - DELETE /api/questions/:id/archive                     ║
║                                                           ║
║   - GET    /api/submissions                               ║
║   - POST   /api/submissions                               ║
║   - GET    /api/submissions/:id                           ║
║   - PUT    /api/submissions/:id                           ║
║   - DELETE /api/submissions/:id/archive                   ║
║                                                           ║
║   - GET    /api/submission-answers                        ║
║   - POST   /api/submission-answers                        ║
║   - GET    /api/submission-answers/:id                    ║
║   - PUT    /api/submission-answers/:id                    ║
║   - DELETE /api/submission-answers/:id/archive            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
