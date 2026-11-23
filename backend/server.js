import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting single or comma-separated origins
const rawOrigins = process.env.CORS_ORIGIN;
let corsOptions = { credentials: true };

if (rawOrigins && rawOrigins !== '*') {
  const allowedList = rawOrigins.split(',').map(o => o.trim());
  corsOptions.origin = (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedList.includes(origin) || allowedList.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  };
} else {
  corsOptions.origin = '*';
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'PostgreSQL 16',
    timestamp: new Date().toISOString()
  });
});

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);

// Fallback error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Server startup function
export const startServer = async (port = PORT) => {
  try {
    await db.initDb();
    const server = app.listen(port, () => {
      console.log(`🚀 Joineazy Backend Server running on port ${port}`);
      console.log(`📡 Health endpoint: http://localhost:${port}/api/health`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Only auto-start when executed directly, NOT when imported in tests
const isMain = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server')
);

if (isMain && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;