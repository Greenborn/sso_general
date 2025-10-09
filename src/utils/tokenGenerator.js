const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

/**
 * Genera un token JWT temporal (después de OAuth)
 * @param {Object} payload - Datos a incluir en el token
 * @param {number} expiresIn - Tiempo de expiración en segundos
 * @returns {string} Token JWT
 */
function generateTemporalToken(payload, expiresIn = config.tokens.temporalExpiry) {
  return jwt.sign(payload, config.jwt.secret, {
    algorithm: config.jwt.algorithm,
    expiresIn: expiresIn
  });
}

/**
 * Genera un token Bearer de larga duración
 * @param {Object} payload - Datos a incluir en el token
 * @param {number} expiresIn - Tiempo de expiración en segundos
 * @returns {string} Token JWT
 */
function generateBearerToken(payload, expiresIn = config.tokens.bearerExpiry) {
  return jwt.sign(payload, config.jwt.secret, {
    algorithm: config.jwt.algorithm,
    expiresIn: expiresIn
  });
}

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token a verificar
 * @returns {Object} Payload decodificado
 * @throws {Error} Si el token es inválido o expirado
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm]
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('INVALID_TOKEN');
    }
    throw error;
  }
}

/**
 * Decodifica un token sin verificar (útil para obtener info de tokens expirados)
 * @param {string} token - Token a decodificar
 * @returns {Object} Payload decodificado
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Calcula el tiempo restante hasta la expiración del token
 * @param {Object} decodedToken - Token decodificado
 * @returns {number} Segundos hasta la expiración
 */
function getTimeUntilExpiration(decodedToken) {
  if (!decodedToken.exp) return 0;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decodedToken.exp - now);
}

/**
 * Verifica si un token está cerca de expirar
 * @param {Object} decodedToken - Token decodificado
 * @param {number} threshold - Umbral en segundos
 * @returns {boolean} True si está cerca de expirar
 */
function isNearExpiration(decodedToken, threshold = config.tokens.renewalThreshold) {
  const timeLeft = getTimeUntilExpiration(decodedToken);
  return timeLeft < threshold && timeLeft > 0;
}

/**
 * Genera un hash único para identificar tokens
 * @param {string} token - Token a hashear
 * @returns {string} Hash del token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  generateTemporalToken,
  generateBearerToken,
  verifyToken,
  decodeToken,
  getTimeUntilExpiration,
  isNearExpiration,
  hashToken
};
