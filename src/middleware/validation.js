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
  //console.log('Valor decodificado de url_redireccion_app:', decodedUrl);

  // Eliminar el fragmento (#) de la URL antes de validarla
  const urlWithoutFragment = decodedUrl.split('#')[0];
  //console.log('URL sin fragmento:', urlWithoutFragment);

  // Validar que la URL comience con http:// o https://
  const isValidUrl = decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://');
  //console.log('Resultado de validación básica de URL:', isValidUrl);

  if (!isValidUrl) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro url_redireccion_app debe comenzar con http:// o https://',
      error: 'INVALID_REDIRECT_URL'
    });
  }

  // Depurar la lista blanca
  const isAllowed = await AllowedApp.isUrlAllowed(decodedUrl);
  //console.log('Resultado de isUrlAllowed:', isAllowed);

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
