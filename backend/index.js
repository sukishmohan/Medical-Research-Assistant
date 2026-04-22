/**
 * Medical Research Assistant - Backend Main Server
 * MERN Stack: Express.js + MongoDB
 * 
 * Architecture:
 * - Query Understanding Layer (entity extraction, intent classification)
 * - Retrieval Layer (OpenAlex + PubMed + ClinicalTrials APIs)
 * - Ranking Layer (ML-based relevance scoring)
 * - LLM Layer (Llama 3 via Ollama)
 * - Memory Layer (MongoDB conversations + Redis cache)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { MongoClient } = require('mongodb');
const redis = require('redis');
const pino = require('pino');

// Initialize logger
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? { level: 'info' }
    : { level: 'debug', transport: { target: 'pino-pretty' } }
);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg) } }));

// ============================================
// DATABASE & CACHE SETUP
// ============================================

let mongoClient;
let db;
let cache;

async function initializeDatabases() {
  try {
    // MongoDB Connection
    mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await mongoClient.connect();
    db = mongoClient.db('medical_research_assistant');
    logger.info('✓ MongoDB connected');

    // Create indexes for optimal query performance
    await db.collection('conversations').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('search_cache').createIndex({ queryHash: 1 });
    await db.collection('search_cache').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }  // TTL index
    );
    await db.collection('user_profiles').createIndex({ userId: 1 }, { unique: true });

    // Redis Connection (for session cache)
    cache = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    });

    cache.on('connect', () => logger.info('✓ Redis connected'));
    cache.on('error', (err) => logger.error('Redis error:', err));
    
    await cache.connect();

  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// ============================================
// REQUEST CONTEXT MIDDLEWARE
// ============================================

app.use((req, res, next) => {
  req.db = db;
  req.cache = cache;
  req.logger = logger;
  req.requestId = require('uuid').v4();
  next();
});

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import and register route handlers
const conversationRoutes = require('./routes/conversations');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/users');

app.use('/api/conversations', conversationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    requestId: req.requestId
  });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  res.status(statusCode).json({
    error: message,
    requestId: req.requestId
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    if (mongoClient) await mongoClient.close();
    if (cache) await cache.quit();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ============================================
// SERVER START
// ============================================

async function startServer() {
  try {
    await initializeDatabases();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Medical Research Assistant running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
