const rateLimit = require('express-rate-limit');
const config = require('../config/config');

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
  skip: (req) => {
    // No aplicar rate limiting en desarrollo si está configurado
    return config.server.nodeEnv === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  }
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
  skip: (req) => {
    return config.server.nodeEnv === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  }
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
  skip: (req) => {
    return config.server.nodeEnv === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  verifyLimiter
};
