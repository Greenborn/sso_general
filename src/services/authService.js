const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const GoogleService = require('./googleService');
const { 
  generateTemporalToken, 
  generateBearerToken, 
  verifyToken,
  hashToken,
  getTimeUntilExpiration 
} = require('../utils/tokenGenerator');
const config = require('../config/config');

/**
 * Servicio de autenticación
 */
class AuthService {
  /**
   * Procesa el callback de Google OAuth
   * Crea o actualiza usuario y genera token temporal
   */
  static async handleGoogleCallback(profile, accessToken, refreshToken, uniqueId) {
    try {
      const email = profile.emails[0].value;
      let user = await User.findByEmail(email);

      const userData = {
        googleId: profile.id,
        email: email,
        name: profile.displayName,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        photo: profile.photos[0]?.value,
        accessToken: accessToken,
        refreshToken: refreshToken,
        uniqueId: uniqueId
      };

      if (!user) {
        // Crear nuevo usuario
        user = await User.create(userData);
      } else {
        // Actualizar usuario existente
        user = await User.update(user.id, userData);
      }

      // Generar token temporal
      const temporalToken = generateTemporalToken({
        userId: user.id,
        email: user.email,
        uniqueId: uniqueId,
        type: 'temporal'
      });

      return {
        user,
        temporalToken
      };
    } catch (error) {
      console.error('Error en handleGoogleCallback:', error);
      throw error;
    }
  }

  /**
   * Autentica con token temporal y genera bearer token
   */
  static async loginWithTemporalToken(temporalToken, ipAddress, userAgent) {
    try {
      // Verificar token temporal
      const decoded = verifyToken(temporalToken);
      
      if (decoded.type !== 'temporal') {
        throw new Error('INVALID_TOKEN_TYPE');
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new Error('USER_NOT_FOUND');
      }

      // Generar bearer token
      const bearerToken = generateBearerToken({
        userId: user.id,
        email: user.email,
        type: 'bearer'
      });

      // Calcular fecha de expiración
      const expiresAt = new Date(Date.now() + config.tokens.bearerExpiry * 1000);

      // Crear sesión
      const tokenHash = hashToken(bearerToken);
      const session = await Session.create({
        userId: user.id,
        bearerTokenHash: tokenHash,
        uniqueId: decoded.uniqueId,
        expiresAt: expiresAt,
        ipAddress: ipAddress,
        userAgent: userAgent
      });

      // Log de auditoría
      await AuditLog.logLogin(
        user.id, 
        decoded.uniqueId, 
        ipAddress, 
        userAgent, 
        true,
        { sessionId: session.id }
      );

      return {
        bearerToken,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          photo: user.photo_url
        }
      };
    } catch (error) {
      // Log de error
      await AuditLog.logAuthError(null, ipAddress, userAgent, {
        error: error.message,
        token: 'temporal'
      });
      
      throw error;
    }
  }

  /**
   * Verifica y extiende un bearer token
   */
  static async verifyAndExtendToken(bearerToken, ipAddress, userAgent) {
    try {
      // Verificar token JWT
      const decoded = verifyToken(bearerToken);
      
      if (decoded.type !== 'bearer') {
        throw new Error('INVALID_TOKEN_TYPE');
      }

      // Buscar sesión en BD
      const tokenHash = hashToken(bearerToken);
      const session = await Session.findByTokenHash(tokenHash);

      if (!session) {
        throw new Error('SESSION_NOT_FOUND');
      }

      // Verificar usuario
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        await Session.revoke(session.id);
        throw new Error('USER_NOT_FOUND');
      }

      // Verificar si hay sesión de Google activa
      const hasGoogleSession = await GoogleService.hasActiveGoogleSession(user.id);

      if (!hasGoogleSession) {
        // No hay sesión de Google, no extender
        await AuditLog.logAuthorization(user.id, ipAddress, userAgent, false, {
          reason: 'NO_GOOGLE_SESSION',
          sessionId: session.id
        });
        
        throw new Error('GOOGLE_SESSION_EXPIRED');
      }

      // Extender expiración de la sesión
      const newExpiresAt = new Date(Date.now() + config.tokens.bearerExpiry * 1000);
      await Session.extendExpiration(session.id, newExpiresAt);

      // Log de auditoría
      await AuditLog.logTokenExtension(user.id, ipAddress, userAgent, {
        sessionId: session.id,
        newExpiresAt: newExpiresAt
      });

      return {
        valid: true,
        extended: true,
        expiresAt: newExpiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          photo: user.photo_url
        }
      };
    } catch (error) {
      // Log de error
      if (error.message !== 'GOOGLE_SESSION_EXPIRED') {
        await AuditLog.logAuthError(null, ipAddress, userAgent, {
          error: error.message,
          token: 'bearer'
        });
      }
      
      throw error;
    }
  }

  /**
   * Cierra sesión del usuario
   */
  static async logout(bearerToken, ipAddress, userAgent) {
    try {
      const decoded = verifyToken(bearerToken);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Revocar sesión actual
      const tokenHash = hashToken(bearerToken);
      await Session.revokeByTokenHash(tokenHash);

      // Revocar tokens de Google
      await GoogleService.revokeUserTokens(user.id);

      // Log de auditoría
      await AuditLog.logLogout(user.id, null, ipAddress, userAgent, {
        method: 'manual'
      });

      return true;
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  }

  /**
   * Obtiene las sesiones activas de un usuario
   */
  static async getActiveSessions(userId) {
    return await Session.findActiveByUserId(userId);
  }
}

module.exports = AuthService;
