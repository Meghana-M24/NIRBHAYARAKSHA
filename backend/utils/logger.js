import { config } from '../config/env.js';

const LEVEL_PRIORITY = Object.freeze({
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
});

function serialize(entry) {
  try {
    return JSON.stringify(entry);
  } catch {
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      logError: 'Failed to serialize log fields',
    });
  }
}

function write(level, message, fields = {}) {
  if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[config.logLevel]) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };

  const line = `${serialize(entry)}\n`;

  if (level === 'error' || level === 'warn') {
    process.stderr.write(line);
    return;
  }

  process.stdout.write(line);
}

export const logger = Object.freeze({
  error(message, fields) {
    write('error', message, fields);
  },
  warn(message, fields) {
    write('warn', message, fields);
  },
  info(message, fields) {
    write('info', message, fields);
  },
  debug(message, fields) {
    write('debug', message, fields);
  },
});

export function logError(message, error, req) {
  logger.error(message, {
    requestId: req?.id,
    errorName: error?.name,
    errorMessage: error?.message,
  });
}
