import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { config } from './config/env.js';
import {
  getRouteLabel,
  requestId,
  requestLogger,
} from './middleware/requestLogger.middleware.js';
import { logger } from './utils/logger.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import contactRoutes from './routes/contact.routes.js';
import pinRoutes from './routes/pin.routes.js';
import sosRoutes from './routes/sos.routes.js';
import safetyTimerRoutes from './routes/safetyTimer.routes.js';
import locationRoutes from './routes/location.routes.js';

const app = express();

app.set('trust proxy', config.trustProxy);

app.disable('x-powered-by');

app.use(requestId);
app.use(requestLogger);

app.use(helmet());

app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
});

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many PIN attempts, please try again later',
  },
});

const publicShareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many location share requests, please try again later',
  },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/pin/verify', pinLimiter);
app.use('/api/location/share', publicShareLimiter);

app.use(
  express.json({
    limit: '100kb',
  })
);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/pin', pinRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/safety-timer', safetyTimerRoutes);
app.use('/api/location', locationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body too large',
    });
  }

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    'body' in err
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON body',
    });
  }

  logger.error('Unhandled request error', {
    requestId: req.id,
    method: req.method,
    route: getRouteLabel(req),
    errorName: err?.name,
    errorMessage: err?.message,
    stack: err?.stack,
  });

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

export default app;
