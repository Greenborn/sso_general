const express = require('express');
const passport = require('../config/passport');
const config = require('../config/config');
const { isAuthenticated, verifyBearerToken, optionalBearerToken } = require('../middleware/auth');
const { validateOAuthParams, extractRequestInfo } = require('../middleware/validation');
const { authLimiter, verifyLimiter } = require('../middleware/rateLimiter');
const AuthService = require('../services/authService');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

/**
 * GET /auth/google
 * Inicia la autenticación con Google
 * Requiere: url_redireccion_app, unique_id
 */
router.get('/google', 
  extractRequestInfo,
  validateOAuthParams,
  authLimiter,
  (req, res, next) => {
    // Codificar los datos en el state parameter para preservarlos durante OAuth
    const state = Buffer.from(JSON.stringify({
      url_redireccion_app: req.session.oauth_redirect_url,
      unique_id: req.session.oauth_unique_id
    })).toString('base64');

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      accessType: 'offline',
      prompt: 'select_account',
      state: state
    })(req, res, next);
  }
);

/**
 * GET /auth/google/callback
 * Callback de Google OAuth
 * Procesa la autenticación y redirige a la app con token temporal
 */
router.get('/google/callback',
  extractRequestInfo,
  passport.authenticate('google', { 
    failureRedirect: config.redirect.failure,
    session: true
  }),
  async (req, res) => {
    try {
      console.log('Query params en callback:', req.query);

      // Recuperar datos del state parameter que Google devuelve
      let redirectUrl, uniqueId;
      
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          redirectUrl = stateData.url_redireccion_app;
          uniqueId = stateData.unique_id;
          console.log('Datos recuperados del state parameter:', { redirectUrl, uniqueId });
        } catch (e) {
          console.error('Error decodificando state parameter:', e);
        }
      }

      // Si no hay datos en state, intentar desde la sesión (fallback)
      if (!redirectUrl || !uniqueId) {
        redirectUrl = req.session.oauth_redirect_url;
        uniqueId = req.session.oauth_unique_id;
        console.log('Datos recuperados de la sesión (fallback):', { redirectUrl, uniqueId });
      }

      if (!redirectUrl || !uniqueId) {
        return res.redirect(`${config.redirect.failure}?error=MISSING_PARAMS`);
      }

      // Procesar callback y generar token temporal
      const result = await AuthService.handleGoogleCallback(
        req.user.profile,
        req.user.accessToken,
        req.user.refreshToken,
        uniqueId
      );

      // Log de auditoría
      await AuditLog.logLogin(
        result.user.id,
        uniqueId,
        req.clientIp,
        req.userAgent,
        true,
        { 
          step: 'google_callback',
          redirectUrl: redirectUrl
        }
      );

      // Guardar el token temporal en la sesión para usarlo en /auth/success
      req.session.temporal_token = result.temporalToken;
      req.session.oauth_redirect_url = redirectUrl;
      req.session.oauth_unique_id = uniqueId;

      // Redirigir a SUCCESS_REDIRECT_URL (endpoint del servicio SSO)
      res.redirect(config.redirect.success);
    } catch (error) {
      console.error('Error en callback de Google:', error);
      
      await AuditLog.logAuthError(
        uniqueId || null,
        req.clientIp,
        req.userAgent,
        {
          error: error.message,
          step: 'google_callback'
        }
      );

      res.redirect(`${config.redirect.failure}?error=AUTH_ERROR`);
    }
  }
);

/**
 * POST /auth/login
 * Autentica con token temporal y genera bearer token
 * Body: { token: "temporal_token" }
 */
router.post('/login',
  extractRequestInfo,
  authLimiter,
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token temporal no proporcionado',
          error: 'MISSING_TOKEN'
        });
      }

      // Autenticar con token temporal
      const result = await AuthService.loginWithTemporalToken(
        token,
        req.clientIp,
        req.userAgent
      );

      res.json({
        success: true,
        message: 'Autenticación exitosa',
        data: {
          bearer_token: result.bearerToken,
          expires_at: result.expiresAt,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Error en login:', error);

      let statusCode = 401;
      let errorCode = error.message;
      let message = 'Error en la autenticación';

      if (error.message === 'TOKEN_EXPIRED') {
        message = 'El token temporal ha expirado';
      } else if (error.message === 'INVALID_TOKEN') {
        message = 'Token inválido';
      } else if (error.message === 'INVALID_TOKEN_TYPE') {
        message = 'Tipo de token inválido';
      } else if (error.message === 'USER_NOT_FOUND') {
        message = 'Usuario no encontrado';
      }

      res.status(statusCode).json({
        success: false,
        message: message,
        error: errorCode
      });
    }
  }
);

/**
 * GET /auth/verify (o /auth/authorize)
 * Verifica y extiende bearer token si hay sesión de Google activa
 * Headers: Authorization: Bearer {token}
 */
router.get('/verify',
  extractRequestInfo,
  verifyBearerToken,
  verifyLimiter,
  async (req, res) => {
    try {
      const uniqueId = req.headers['unique_id'];
      if (!uniqueId || typeof uniqueId !== 'string' || uniqueId.length < 1 || uniqueId.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'unique_id es requerido y debe ser una cadena de 1-255 caracteres',
          error: 'MISSING_UNIQUE_ID'
        });
      }
      // Verificar y extender token
      const result = await AuthService.verifyAndExtendToken(
        req.token,
        req.clientIp,
        req.userAgent,
        uniqueId
      );

      res.json({
        success: true,
        message: 'Token válido',
        data: {
          valid: result.valid,
          extended: result.extended,
          expires_at: result.expiresAt,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Error en verify:', error);

      let statusCode = 401;
      let errorCode = error.message;
      let message = 'Error al verificar token';

      if (error.message === 'GOOGLE_SESSION_EXPIRED') {
        statusCode = 401;
        message = 'Sesión de Google expirada, se requiere re-autenticación';
      } else if (error.message === 'SESSION_NOT_FOUND') {
        message = 'Sesión no encontrada';
      } else if (error.message === 'USER_NOT_FOUND') {
        message = 'Usuario no encontrado';
      } else if (error.message === 'UNIQUE_ID_MISMATCH') {
        message = 'unique_id no coincide con la sesión';
      }

      res.status(statusCode).json({
        success: false,
        message: message,
        error: errorCode,
        require_reauth: error.message === 'GOOGLE_SESSION_EXPIRED'
      });
    }
  }
);

/**
 * POST /auth/logout
 * Cierra sesión del usuario
 * Headers: Authorization: Bearer {token}
 */
router.post('/logout',
  extractRequestInfo,
  verifyBearerToken,
  async (req, res) => {
    try {
      await AuthService.logout(
        req.token,
        req.clientIp,
        req.userAgent
      );

      // También cerrar sesión de Passport si existe
      if (req.session) {
        req.logout((err) => {
          if (err) console.error('Error en passport logout:', err);
        });
        
        req.session.destroy((err) => {
          if (err) console.error('Error destruyendo sesión:', err);
        });
      }

      res.clearCookie('connect.sid');

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      console.error('Error en logout:', error);

      res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión',
        error: error.message
      });
    }
  }
);

/**
 * GET /auth/sessions
 * Lista las sesiones activas del usuario
 * Headers: Authorization: Bearer {token}
 */
router.get('/sessions',
  extractRequestInfo,
  verifyBearerToken,
  async (req, res) => {
    try {
      const sessions = await AuthService.getActiveSessions(req.user.id);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(s => ({
            id: s.id,
            unique_id: s.unique_id,
            ip_address: s.ip_address,
            user_agent: s.user_agent,
            expires_at: s.expires_at,
            created_at: s.created_at
          })),
          total: sessions.length
        }
      });
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);

      res.status(500).json({
        success: false,
        message: 'Error al obtener sesiones',
        error: error.message
      });
    }
  }
);

/**
 * GET /auth/status (legacy endpoint)
 * Verifica el estado de autenticación
 */
router.get('/status',
  optionalBearerToken,
  (req, res) => {
    if (req.user) {
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          photo: req.user.photo_url
        }
      });
    } else if (req.isAuthenticated()) {
      // Sesión de Passport (después de Google OAuth, antes de login)
      res.json({
        success: true,
        authenticated: true,
        temporary: true,
        user: {
          email: req.user.email,
          name: req.user.name
        }
      });
    } else {
      res.json({
        success: true,
        authenticated: false,
        user: null
      });
    }
  }
);

/**
 * GET /auth/success
 * Punto intermedio después de autenticación exitosa
 * Recibe los datos de sesión y redirige a la app cliente con el token
 */
router.get('/success', async (req, res) => {
  try {
    // Obtener datos de la sesión
    const redirectUrl = req.session.oauth_redirect_url;
    const uniqueId = req.session.oauth_unique_id;
    const temporalToken = req.session.temporal_token;

    // Validar que existan los datos necesarios
    if (!redirectUrl || !uniqueId || !temporalToken) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos de autenticación en la sesión',
        error: 'MISSING_SESSION_DATA'
      });
    }

    // Limpiar datos de la sesión
    delete req.session.oauth_redirect_url;
    delete req.session.oauth_unique_id;
    delete req.session.temporal_token;

    // Construir URL de redirección con token
    const separator = redirectUrl.includes('?') ? '&' : '?';
    const finalUrl = `${redirectUrl}${separator}token=${temporalToken}&unique_id=${uniqueId}`;

    // Redirigir a la app cliente
    res.redirect(finalUrl);
  } catch (error) {
    console.error('Error en /auth/success:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al procesar redirección',
      error: error.message
    });
  }
});

/**
 * GET /auth/failure (legacy endpoint)
 */
router.get('/failure', (req, res) => {
  const error = req.query.error || 'UNKNOWN_ERROR';
  
  res.status(401).json({
    success: false,
    message: 'Fallo en la autenticación con Google',
    error: error
  });
});

module.exports = router;