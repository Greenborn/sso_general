const rateLimit = require('express-rate-limit');
const config = require('../config/config');

const isLocalhost = (req) => {
  const ip = req.ip || req.connection?.remoteAddress;
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

const skipRateLimit = (req) => {
  return isLocalhost(req) || (config.server.nodeEnv === 'development' && process.env.DISABLE_RATE_LIMIT === 'true');
};

/**
 * Rate limiter general para todas las rutas
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Demasiadas peticiones, por favor intente más tarde',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit
});

/**
 * Rate limiter estricto para endpoints de autenticación
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación, por favor intente más tarde',
    error: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipRateLimit
});

/**
 * Rate limiter para verificación de tokens
 */
const verifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 peticiones por minuto
  message: {
    success: false,
    message: 'Demasiadas verificaciones de token',
    error: 'VERIFY_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit
});

module.exports = {
  generalLimiter,
  authLimiter,
  verifyLimiter
};
