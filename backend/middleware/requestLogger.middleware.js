import { randomUUID } from 'node:crypto';

import { logger } from '../utils/logger.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function getRouteLabel(req) {
  if (!req.route) {
    return 'unmatched';
  }

  return `${req.baseUrl}${String(req.route.path)}`;
}

export function requestId(req, res, next) {
  const incomingId = req.get('X-Request-ID');
  const id =
    incomingId && REQUEST_ID_PATTERN.test(incomingId)
      ? incomingId
      : randomUUID();

  req.id = id;
  res.set('X-Request-ID', id);
  next();
}

export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs =
      Number(process.hrtime.bigint() - startedAt) / 1e6;

    const fields = {
      requestId: req.id,
      method: req.method,
      route: getRouteLabel(req),
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
    };

    if (
      req.originalUrl.split('?')[0] === '/api/health' &&
      res.statusCode < 400
    ) {
      logger.debug('request completed', fields);
      return;
    }

    if (res.statusCode >= 500) {
      logger.error('request completed', fields);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn('request completed', fields);
      return;
    }

    logger.info('request completed', fields);
  });

  next();
}
