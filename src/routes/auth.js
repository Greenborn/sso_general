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
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'select_account'
  })
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
      // Obtener datos de la sesión
      const redirectUrl = req.session.oauth_redirect_url;
      const uniqueId = req.session.oauth_unique_id;

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

      // Limpiar datos temporales de la sesión
      delete req.session.oauth_redirect_url;
      delete req.session.oauth_unique_id;

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

      // Construir URL de redirección con token
      const separator = redirectUrl.includes('?') ? '&' : '?';
      const finalUrl = `${redirectUrl}${separator}token=${result.temporalToken}&unique_id=${uniqueId}`;

      res.redirect(finalUrl);
    } catch (error) {
      console.error('Error en callback de Google:', error);
      
      await AuditLog.logAuthError(
        req.session.oauth_unique_id,
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
      // Verificar y extender token
      const result = await AuthService.verifyAndExtendToken(
        req.token,
        req.clientIp,
        req.userAgent
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
 * GET /auth/success (legacy endpoint)
 */
router.get('/success', (req, res) => {
  res.json({
    success: true,
    message: 'Proceso de autenticación iniciado',
    note: 'Este endpoint es solo informativo. Los tokens se entregan a través de la URL de redirección.'
  });
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