/* ==========================================================================
   SAFFRON & SAGE — Express Server
   Handles contact form submissions, serves static files, and provides
   a secure API with rate limiting, input validation, and email integration.
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ──────────────────────────────────────────────────────
// Helmet adds various security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        frameSrc: ["'self'", 'https://www.google.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Enable CORS for specified origins
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Rate Limiting ────────────────────────────────────────────────────────────
// General rate limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use(generalLimiter);

// ── Static Files ─────────────────────────────────────────────────────────────
// Serve the frontend from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', contactRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Catch-all: Serve index.html for any unmatched route (SPA support) ──────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.',
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║   🍃  Saffron & Sage Server                     ║
  ║                                                  ║
  ║   Server running on http://localhost:${PORT}        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                   ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
