const { verifyToken } = require('../utils/tokenGenerator');
const Session = require('../models/Session');
const User = require('../models/User');

/**
 * Middleware para verificar que el usuario esté autenticado con Passport
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: 'Usuario no autenticado',
    error: 'Authentication required'
  });
};

/**
 * Middleware para verificar que el usuario NO esté autenticado
 */
const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.status(400).json({
    success: false,
    message: 'Usuario ya autenticado',
    user: req.user
  });
};

/**
 * Middleware para verificar Bearer token
 */
const verifyBearerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autorización no proporcionado',
        error: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    // Verificar token JWT
    const decoded = verifyToken(token);

    if (decoded.type !== 'bearer') {
      return res.status(401).json({
        success: false,
        message: 'Tipo de token inválido',
        error: 'INVALID_TOKEN_TYPE'
      });
    }

    // Verificar que el usuario exista y esté activo
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
        error: 'USER_NOT_FOUND'
      });
    }

    // Agregar información al request
    req.user = user;
    req.token = token;
    req.decodedToken = decoded;

    next();
  } catch (error) {
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      error: error.message || 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware opcional de Bearer token (no falla si no hay token)
 */
const optionalBearerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded.type === 'bearer') {
      const user = await User.findById(decoded.userId);
      if (user && user.is_active) {
        req.user = user;
        req.token = token;
        req.decodedToken = decoded;
      }
    }

    next();
  } catch (error) {
    // Ignorar errores en modo opcional
    next();
  }
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  verifyBearerToken,
  optionalBearerToken
};