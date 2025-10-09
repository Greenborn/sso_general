const validator = require('validator');
const AllowedApp = require('../models/AllowedApp');

/**
 * Middleware para validar parámetros de la petición OAuth
 */
const validateOAuthParams = async (req, res, next) => {
  const { url_redireccion_app, unique_id } = req.query;

  // Validar unique_id (obligatorio)
  if (!unique_id) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro unique_id es obligatorio',
      error: 'MISSING_UNIQUE_ID'
    });
  }

  if (typeof unique_id !== 'string' || unique_id.length < 1 || unique_id.length > 255) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro unique_id debe ser una cadena válida',
      error: 'INVALID_UNIQUE_ID'
    });
  }

  // Validar url_redireccion_app (obligatorio)
  if (!url_redireccion_app) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro url_redireccion_app es obligatorio',
      error: 'MISSING_REDIRECT_URL'
    });
  }

  // Validar formato de URL
  if (!validator.isURL(url_redireccion_app, { 
    protocols: ['http', 'https'],
    require_protocol: true
  })) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro url_redireccion_app debe ser una URL válida',
      error: 'INVALID_REDIRECT_URL'
    });
  }

  // Verificar que la URL esté en la lista blanca
  const isAllowed = await AllowedApp.isUrlAllowed(url_redireccion_app);
  
  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: 'La URL de redirección no está autorizada',
      error: 'UNAUTHORIZED_REDIRECT_URL'
    });
  }

  // Guardar en la sesión para usar después del callback
  req.session.oauth_redirect_url = url_redireccion_app;
  req.session.oauth_unique_id = unique_id;

  next();
};

/**
 * Middleware para extraer información de IP y User-Agent
 */
const extractRequestInfo = (req, res, next) => {
  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress || 
                 'unknown';
  
  req.userAgent = req.headers['user-agent'] || 'unknown';
  
  next();
};

module.exports = {
  validateOAuthParams,
  extractRequestInfo
};
