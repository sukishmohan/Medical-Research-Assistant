// Medical Research Assistant - Root Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// LLM health check
app.get('/api/llm/health', (req, res) => {
  const groqKey = process.env.GROQ_API_KEY ? 'configured' : 'missing';
  res.json({
    healthy: !!process.env.GROQ_API_KEY,
    model: 'llama-3.1-70b-versatile',
    api: 'groq',
    groqKey: groqKey
  });
});

// Simple search endpoint
app.post('/api/search', (req, res) => {
  const { query } = req.body;
  
  res.json({
    success: true,
    response: `Search results for: ${query}`,
    metadata: {
      totalTimeMs: 1500,
      retrievalStats: {
        openAlexPapers: 10,
        pubmedPapers: 8,
        trials: 3
      },
      confidence: 0.85
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Groq API: ${process.env.GROQ_API_KEY ? 'configured' : 'not configured'}`);
});

module.exports = app;
