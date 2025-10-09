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

  // Decodificar el parámetro url_redireccion_app antes de validarlo
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url_redireccion_app);
  } catch (e) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro url_redireccion_app no es una URL válida (error de codificación)',
      error: 'INVALID_REDIRECT_URL_ENCODING'
    });
  }

  // Depurar el valor decodificado de url_redireccion_app
  console.log('Valor decodificado de url_redireccion_app:', decodedUrl);

  // Validar formato de URL con opciones ajustadas
  if (!validator.isURL(decodedUrl, { 
    protocols: ['http', 'https'],
    require_protocol: true,
    allow_fragments: true // Permitir fragmentos en la URL
  })) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro url_redireccion_app debe ser una URL válida',
      error: 'INVALID_REDIRECT_URL'
    });
  }

  // Verificar que la URL esté en la lista blanca
  const isAllowed = await AllowedApp.isUrlAllowed(decodedUrl);
  
  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: 'La URL de redirección no está autorizada',
      error: 'UNAUTHORIZED_REDIRECT_URL'
    });
  }

  // Guardar en la sesión para usar después del callback
  req.session.oauth_redirect_url = decodedUrl;
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
