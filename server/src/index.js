import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

// Import database models and initialize
import { sequelize, syncDatabase } from './models/index.js';

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

// Swagger Documentation
app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'iTeach Q&A API Documentation'
}));

// Swagger JSON endpoint
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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

// Initialize database and start server
const startServer = async () => {
  try {
    // Sync database
    await syncDatabase();
    console.log('✓ Database connection established');

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🎓 iTeach Q&A Platform - Server Running (Sequelize)                    ║
║                                                                           ║
║   Port: ${PORT}                                                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                                        ║
║   CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}                                    ║
║                                                                           ║
║   📚 API Documentation:                                                   ║
║   - Swagger UI:  http://localhost:${PORT}/api-doc                          ║
║   - Swagger JSON: http://localhost:${PORT}/swagger.json                    ║
║                                                                           ║
║   🔧 Health Check:                                                        ║
║   - GET http://localhost:${PORT}/health                                    ║
║                                                                           ║
║   🔐 Authentication Endpoints:                                            ║
║   - POST   /api/auth/register                                             ║
║   - POST   /api/auth/login                                                ║
║   - GET    /api/auth/me                                                   ║
║                                                                           ║
║   📋 Activity Endpoints:                                                  ║
║   - GET    /api/activities (list with filters)                            ║
║   - POST   /api/activities (create)                                       ║
║   - GET    /api/activities/:id (get with elements)                        ║
║   - PUT    /api/activities/:id (update)                                   ║
║   - DELETE /api/activities/:id/archive (archive)                          ║
║   - GET    /api/activities/:id/versions (version history)                 ║
║                                                                           ║
║   🧩 Activity Element Endpoints:                                          ║
║   - GET    /api/activity-elements (list with nesting)                     ║
║   - POST   /api/activity-elements (create)                                ║
║   - GET    /api/activity-elements/:id (get with children)                 ║
║   - PUT    /api/activity-elements/:id (update)                            ║
║   - DELETE /api/activity-elements/:id/archive (archive)                   ║
║                                                                           ║
║   ❓ Question Endpoints:                                                  ║
║   - GET    /api/questions (list with filters)                             ║
║   - POST   /api/questions (create)                                        ║
║   - GET    /api/questions/:id (get)                                       ║
║   - PUT    /api/questions/:id (update)                                    ║
║   - DELETE /api/questions/:id/archive (archive)                           ║
║                                                                           ║
║   📝 Submission Endpoints:                                                ║
║   - GET    /api/submissions (list)                                        ║
║   - POST   /api/submissions (create)                                      ║
║   - GET    /api/submissions/:id (get)                                     ║
║   - PUT    /api/submissions/:id (update)                                  ║
║   - DELETE /api/submissions/:id/archive (archive)                         ║
║                                                                           ║
║   ✍️  Submission Answer Endpoints:                                        ║
║   - GET    /api/submission-answers (list)                                 ║
║   - POST   /api/submission-answers (create)                               ║
║   - GET    /api/submission-answers/:id (get)                              ║
║   - PUT    /api/submission-answers/:id (update)                           ║
║   - DELETE /api/submission-answers/:id/archive (archive)                  ║
║                                                                           ║
║   📊 Rubric Endpoints:                                                    ║
║   - GET    /api/rubrics (list)                                            ║
║   - POST   /api/rubrics (create)                                          ║
║   - GET    /api/rubrics/:id (get with criteria)                           ║
║   - PUT    /api/rubrics/:id (update)                                      ║
║   - DELETE /api/rubrics/:id/archive (archive)                             ║
║                                                                           ║
║   🎯 Question Scoring Endpoints:                                          ║
║   - POST   /api/question-scoring (configure)                              ║
║   - GET    /api/question-scoring/:questionId (get config)                 ║
║   - PUT    /api/question-scoring/:questionId (update)                     ║
║   - DELETE /api/question-scoring/:questionId (delete)                     ║
║                                                                           ║
║   👉 Visit http://localhost:${PORT}/api-doc for interactive documentation  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
