import pino from 'pino';

/**
 * Singleton structured logger (Pino).
 * In test environments we use a no-op / silent transport so logs don't pollute
 * test output, but the logger instance is still fully functional and can be
 * spied on.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'test' ? { level: 'silent' } : {}),
});

export default logger;
