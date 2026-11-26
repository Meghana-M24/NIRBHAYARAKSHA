import 'dotenv/config';

try {
  const { config } = await import('../config/env.js');

  console.log('Environment configuration is valid.');
  console.log(`- NODE_ENV: ${config.nodeEnv}`);
  console.log(`- PORT: ${config.port}`);
  console.log(`- JWT_EXPIRES_IN: ${config.jwtExpiresIn}`);
  console.log(
    `- JWT_SECRET length: ${config.jwtSecret.length} characters`
  );
  console.log(`- CORS origins: ${config.corsOrigins.length}`);
  console.log(`- TRUST_PROXY: ${config.trustProxy}`);
  console.log(`- LOG_LEVEL: ${config.logLevel}`);

  for (const origin of config.corsOrigins) {
    console.log(`  - ${origin}`);
  }
} catch (error) {
  console.error(
    `Environment configuration error: ${error.message}`
  );
  process.exitCode = 1;
}
