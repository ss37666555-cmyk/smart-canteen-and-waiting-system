/**
 * SmartQueue Canteen - Express Server & REST API Layer
 *
 * Provides RESTful HTTP endpoints for:
 * - Student Dashboard metrics (/api/dashboard)
 * - Waiting queue list and inspection (/api/queue)
 * - Virtual token assignment (/api/queue/join)
 * - AI waiting-time prediction (/api/queue/prediction)
 * - Admin queue advance (/api/queue/next)
 * - Admin token completion (/api/queue/complete)
 * - Canteen menu catalog (/api/menu)
 * - Dynamic counter capacity configuration (/api/counters)
 * - Deterministic demo state reset (/api/reset)
 *
 * Error Handling Architecture:
 * - Malformed JSON body interception middleware
 * - Granular route-level input validation with 400 Bad Request
 * - 404 JSON handler for unregistered `/api/*` endpoints
 * - Global 500 error boundary for unhandled server exceptions
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  QueueManager,
  calculateWaitingTime,
  isValidTokenFormat,
  DEFAULT_MENU
} = require('./queueEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize in-memory queue manager
const engine = new QueueManager();

// --- Middleware Pipeline ---
app.use(cors());

// Express JSON body parser with malformed JSON error boundary
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body.',
      code: 'INVALID_JSON_BODY'
    });
  }
  next(err);
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// ============================================================================
// 1. GET /api/dashboard
// Purpose: Fetches live canteen telemetry (crowd count, now serving, wait time)
// ============================================================================
app.get('/api/dashboard', (req, res, next) => {
  try {
    const snapshot = engine.getDashboardSnapshot();
    res.status(200).json({
      success: true,
      ...snapshot
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. GET /api/queue
// Purpose: Returns full waiting queue stream, active counters, and throughput
// ============================================================================
app.get('/api/queue', (req, res, next) => {
  try {
    const waitCalc = calculateWaitingTime(
      engine.queue.length,
      engine.activeCounters,
      engine.averageServiceTime
    );

    res.status(200).json({
      success: true,
      nowServing: engine.nowServing,
      queue: engine.queue,
      queueLength: engine.queue.length,
      activeCounters: engine.activeCounters,
      averageServiceTime: engine.averageServiceTime,
      estimatedWait: waitCalc.waitingTime,
      completedToday: engine.completedToday
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. POST /api/queue/join
// Purpose: Issues a new queue token or returns existing assigned token
// ============================================================================
app.post('/api/queue/join', (req, res, next) => {
  try {
    const { preferredToken } = req.body || {};

    // Validate preferredToken if provided
    if (preferredToken && !isValidTokenFormat(preferredToken)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format. Token must begin with an uppercase letter followed by numbers (e.g., A127).',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    const joinResult = engine.join(preferredToken);
    res.status(200).json(joinResult);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 4. GET /api/queue/prediction
// Purpose: Calculates and returns real-time AI wait prediction and formula math
// ============================================================================
app.get('/api/queue/prediction', (req, res, next) => {
  try {
    const waitCalc = calculateWaitingTime(
      engine.queue.length,
      engine.activeCounters,
      engine.averageServiceTime
    );

    if (!waitCalc.valid) {
      return res.status(503).json({
        success: false,
        error: waitCalc.error || 'Unable to calculate waiting time.',
        code: 'PREDICTION_UNAVAILABLE',
        activeCounters: engine.activeCounters,
        queueLength: engine.queue.length
      });
    }

    res.status(200).json({
      success: true,
      queueLength: engine.queue.length,
      averageServiceTime: engine.averageServiceTime,
      activeCounters: engine.activeCounters,
      waitingTime: waitCalc.waitingTime,
      formula: '(queueLength × averageServiceTime) / activeCounters',
      calculation: `(${engine.queue.length} × ${engine.averageServiceTime}) / ${engine.activeCounters} = ${waitCalc.waitingTime} Minutes`,
      message: `AI-Based Predicted Waiting Time: ${waitCalc.waitingTime} Minutes`
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 5. POST /api/queue/next
// Purpose: Staff admin action to call the next token in the queue
// Error Case: Returns 400 Bad Request if the queue is empty
// ============================================================================
app.post('/api/queue/next', (req, res, next) => {
  try {
    const nextResult = engine.callNext();

    if (!nextResult.success) {
      return res.status(400).json(nextResult);
    }

    res.status(200).json(nextResult);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 6. POST /api/queue/complete
// Purpose: Staff admin action to mark the current token fulfilled
// Error Case: Returns 400 if no active token is serving and queue is empty
// ============================================================================
app.post('/api/queue/complete', (req, res, next) => {
  try {
    const completeResult = engine.completeToken();

    if (!completeResult.success) {
      return res.status(400).json(completeResult);
    }

    res.status(200).json(completeResult);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 7. GET /api/menu
// Purpose: Returns canteen food menu items and pricing
// ============================================================================
app.get('/api/menu', (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      menu: engine.menu || DEFAULT_MENU
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 8. POST /api/counters
// Purpose: Updates operational counter count (range 1 - 10)
// Error Case: Returns 400 Bad Request on missing, non-numeric, or out-of-range
// ============================================================================
app.post('/api/counters', (req, res, next) => {
  try {
    const { counters } = req.body || {};

    if (counters === undefined || counters === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field "counters" in request body.',
        code: 'MISSING_REQUIRED_FIELD'
      });
    }

    const counterResult = engine.setCounters(counters);
    if (!counterResult.success) {
      return res.status(400).json(counterResult);
    }

    res.status(200).json(counterResult);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 9. POST /api/reset
// Purpose: Restores in-memory queue state to baseline specifications
// ============================================================================
app.post('/api/reset', (req, res, next) => {
  try {
    engine.reset();
    res.status(200).json({
      success: true,
      message: 'Demo state reset successfully to baseline values.'
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// Error Boundary: 404 handler for unregistered /api routes
// ============================================================================
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    code: 'ENDPOINT_NOT_FOUND'
  });
});

// Fallback to index.html for client-side single page app navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================================
// Error Boundary: Global Express Exception Handler
// ============================================================================
app.use((err, req, res, next) => {
  console.error('[SERVER EXCEPTION]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// Start HTTP server only if executed directly (supports test runner imports)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SmartQueue Canteen server is running on http://localhost:${PORT}`);
  });
}

module.exports = { app, engine };
