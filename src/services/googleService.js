const axios = require('axios');
const User = require('../models/User');

/**
 * Servicio para interactuar con la API de Google OAuth
 */
class GoogleService {
  /**
   * Revoca el access token de Google
   * @param {string} accessToken - Token a revocar
   * @returns {Promise<boolean>} True si se revocó exitosamente
   */
  static async revokeAccessToken(accessToken) {
    if (!accessToken) return false;

    try {
      await axios.post('https://oauth2.googleapis.com/revoke', null, {
        params: {
          token: accessToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error revocando token de Google:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Revoca los tokens de Google de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} True si se revocó exitosamente
   */
  static async revokeUserTokens(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      let revoked = false;

      // Revocar access token
      if (user.google_access_token) {
        const accessRevoked = await this.revokeAccessToken(user.google_access_token);
        if (accessRevoked) revoked = true;
      }

      // Revocar refresh token
      if (user.google_refresh_token) {
        const refreshRevoked = await this.revokeAccessToken(user.google_refresh_token);
        if (refreshRevoked) revoked = true;
      }

      // Limpiar tokens de la base de datos
      if (revoked) {
        await User.clearGoogleTokens(userId);
      }

      return revoked;
    } catch (error) {
      console.error('Error revocando tokens del usuario:', error);
      return false;
    }
  }

  /**
   * Verifica si un usuario tiene una sesión activa en Google
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} True si tiene sesión activa
   */
  static async hasActiveGoogleSession(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.google_access_token) return false;

      // Verificar token con Google
      const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: {
          access_token: user.google_access_token
        }
      });

      return response.status === 200;
    } catch (error) {
      // Token inválido o expirado
      return false;
    }
  }
}

module.exports = GoogleService;
