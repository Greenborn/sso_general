const db = require('../config/database');

class Session {
  /**
   * Crea una nueva sesión
   */
  static async create(sessionData) {
    const data = {
      user_id: sessionData.userId,
      bearer_token_hash: sessionData.bearerTokenHash,
      unique_id: sessionData.uniqueId,
      expires_at: sessionData.expiresAt,
      ip_address: sessionData.ipAddress,
      user_agent: sessionData.userAgent,
      revoked: false
    };

    const [id] = await db('sessions').insert(data);
    return this.findById(id);
  }

  /**
   * Busca una sesión por ID
   */
  static async findById(id) {
    return await db('sessions')
      .where({ id })
      .first();
  }

  /**
   * Busca una sesión por hash del bearer token
   */
  static async findByTokenHash(tokenHash) {
    return await db('sessions')
      .where({ bearer_token_hash: tokenHash })
      .where({ revoked: false })
      .where('expires_at', '>', db.fn.now())
      .first();
  }

  /**
   * Busca una sesión por hash sin filtrar por expiración (para renovación)
   */
  static async findByTokenHashAll(tokenHash) {
    return await db('sessions')
      .where({ bearer_token_hash: tokenHash })
      .where({ revoked: false })
      .first();
  }

  /**
   * Busca todas las sesiones activas de un usuario
   */
  static async findActiveByUserId(userId) {
    return await db('sessions')
      .where({ user_id: userId })
      .where({ revoked: false })
      .where('expires_at', '>', db.fn.now())
      .orderBy('created_at', 'desc');
  }

  /**
   * Extiende la expiración de una sesión
   */
  static async extendExpiration(id, newExpiresAt) {
    await db('sessions')
      .where({ id })
      .update({
        expires_at: newExpiresAt,
        updated_at: db.fn.now()
      });
    
    return this.findById(id);
  }

  /**
   * Renueva una sesión: actualiza el token hash, expiración y datos de cliente en la misma fila
   */
  static async renew(id, newTokenHash, newExpiresAt, ipAddress = null, userAgent = null) {
    const data = {
      bearer_token_hash: newTokenHash,
      expires_at: newExpiresAt,
      updated_at: db.fn.now()
    };

    if (ipAddress) data.ip_address = ipAddress;
    if (userAgent) data.user_agent = userAgent;

    await db('sessions')
      .where({ id })
      .update(data);

    return this.findById(id);
  }

  /**
   * Revoca una sesión específica
   */
  static async revoke(id) {
    await db('sessions')
      .where({ id })
      .update({
        revoked: true,
        updated_at: db.fn.now()
      });
  }

  /**
   * Revoca todas las sesiones de un usuario
   */
  static async revokeAllByUserId(userId) {
    await db('sessions')
      .where({ user_id: userId })
      .where({ revoked: false })
      .update({
        revoked: true,
        updated_at: db.fn.now()
      });
  }

  /**
   * Revoca una sesión por hash del token
   */
  static async revokeByTokenHash(tokenHash) {
    await db('sessions')
      .where({ bearer_token_hash: tokenHash })
      .update({
        revoked: true,
        updated_at: db.fn.now()
      });
  }

  /**
   * Limpia sesiones expiradas (tarea de mantenimiento)
   */
  static async cleanExpired() {
    const result = await db('sessions')
      .where('expires_at', '<', db.fn.now())
      .orWhere({ revoked: true })
      .delete();
    
    return result;
  }

  /**
   * Cuenta sesiones activas de un usuario
   */
  static async countActiveByUserId(userId) {
    const result = await db('sessions')
      .where({ user_id: userId })
      .where({ revoked: false })
      .where('expires_at', '>', db.fn.now())
      .count('id as count')
      .first();
    
    return result.count;
  }
}

module.exports = Session;
