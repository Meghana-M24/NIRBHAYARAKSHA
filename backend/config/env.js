import net from 'node:net';

const DEFAULT_PORT = 5000;
const DEFAULT_JWT_EXPIRES_IN = '1d';
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const VALID_NODE_ENVS = new Set([
  'development',
  'test',
  'production',
]);
const VALID_LOG_LEVELS = new Set([
  'error',
  'warn',
  'info',
  'debug',
]);
const JWT_EXPIRES_IN_PATTERN = /^[1-9]\d*[smhd]$/;
const MIN_JWT_SECRET_LENGTH = 32;
const TRUST_PROXY_NAMED_RANGES = new Set([
  'loopback',
  'linklocal',
  'uniquelocal',
]);
const PLACEHOLDER_JWT_SECRETS = new Set([
  'replace-with-a-long-random-secret',
  'change-me',
  'secret',
]);

function invalid(message) {
  throw new Error(`Invalid environment configuration: ${message}`);
}

function parseNodeEnv(value) {
  const nodeEnv = value ?? 'development';

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    invalid(
      `NODE_ENV must be one of: ${[...VALID_NODE_ENVS].join(', ')}.`
    );
  }

  return nodeEnv;
}

function parsePort(value) {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    invalid('PORT must be a whole number.');
  }

  const port = Number(value);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    invalid('PORT must be between 1 and 65535.');
  }

  return port;
}

function parseJwtSecret(value, nodeEnv) {
  if (!value || !value.trim()) {
    invalid('JWT_SECRET is required.');
  }

  if (value.trim().length < MIN_JWT_SECRET_LENGTH) {
    invalid(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters.`
    );
  }

  if (
    nodeEnv === 'production' &&
    PLACEHOLDER_JWT_SECRETS.has(value.trim())
  ) {
    invalid(
      'JWT_SECRET must not use a placeholder value in production.'
    );
  }

  return value;
}

function parseJwtExpiresIn(value) {
  const expiresIn = value ?? DEFAULT_JWT_EXPIRES_IN;

  if (!JWT_EXPIRES_IN_PATTERN.test(expiresIn)) {
    invalid(
      'JWT_EXPIRES_IN must look like "1d", "12h", "30m", or "60s".'
    );
  }

  return expiresIn;
}

function parseCorsOrigins(value, nodeEnv) {
  const raw =
    value ??
    (nodeEnv === 'production'
      ? ''
      : DEFAULT_CORS_ORIGINS.join(','));

  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    invalid(
      'CORS_ORIGINS must contain at least one allowed origin.'
    );
  }

  const uniqueOrigins = [];

  for (const origin of origins) {
    if (origin === '*') {
      invalid('CORS_ORIGINS must not use "*".');
    }

    let parsedOrigin;

    try {
      parsedOrigin = new URL(origin);
    } catch {
      invalid(
        `CORS_ORIGINS contains an invalid origin: ${origin}`
      );
    }

    if (
      parsedOrigin.protocol !== 'http:' &&
      parsedOrigin.protocol !== 'https:'
    ) {
      invalid(
        `CORS_ORIGINS must use http or https: ${origin}`
      );
    }

    if (parsedOrigin.origin !== origin) {
      invalid(
        'CORS_ORIGINS must contain origins only, without paths or trailing slashes: ' +
          origin
      );
    }

    if (!uniqueOrigins.includes(origin)) {
      uniqueOrigins.push(origin);
    }
  }

  return Object.freeze(uniqueOrigins);
}

function parseLogLevel(value) {
  const logLevel = value ?? DEFAULT_LOG_LEVEL;

  if (!VALID_LOG_LEVELS.has(logLevel)) {
    invalid(
      `LOG_LEVEL must be one of: ${[...VALID_LOG_LEVELS].join(', ')}.`
    );
  }

  return logLevel;
}

function parseTrustProxy(value) {
  const raw = value?.trim();

  if (raw === undefined || raw === '' || raw === 'false') {
    return false;
  }

  if (raw === 'true') {
    invalid(
      'TRUST_PROXY must be "false", a hop count, or a list of trusted IPs/subnets, not "true".'
    );
  }

  if (/^\d+$/.test(raw)) {
    const hops = Number(raw);

    if (hops < 1) {
      invalid('TRUST_PROXY hop count must be at least 1.');
    }

    return hops;
  }

  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    invalid(
      'TRUST_PROXY must be "false", a hop count, or a list of trusted IPs/subnets.'
    );
  }

  for (const entry of entries) {
    if (TRUST_PROXY_NAMED_RANGES.has(entry)) {
      continue;
    }

    const [address, prefix, ...rest] = entry.split('/');
    const family = net.isIP(address);

    if (rest.length > 0 || family === 0) {
      invalid(
        `TRUST_PROXY contains an invalid IP address or subnet: ${entry}`
      );
    }

    if (prefix !== undefined) {
      const maxPrefix = family === 4 ? 32 : 128;

      if (
        !/^\d+$/.test(prefix) ||
        Number(prefix) > maxPrefix
      ) {
        invalid(
          `TRUST_PROXY contains an invalid subnet prefix: ${entry}`
        );
      }
    }
  }

  return entries.join(', ');
}

const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
const port = parsePort(process.env.PORT);
const jwtSecret = parseJwtSecret(
  process.env.JWT_SECRET,
  nodeEnv
);
const jwtExpiresIn = parseJwtExpiresIn(
  process.env.JWT_EXPIRES_IN
);
const corsOrigins = parseCorsOrigins(
  process.env.CORS_ORIGINS,
  nodeEnv
);
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
const logLevel = parseLogLevel(process.env.LOG_LEVEL);

export const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port,
  jwtSecret,
  jwtExpiresIn,
  corsOrigins,
  trustProxy,
  logLevel,
});
