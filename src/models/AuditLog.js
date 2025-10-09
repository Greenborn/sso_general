const db = require('../config/database');

class AuditLog {
  /**
   * Crea un registro de auditoría
   */
  static async create(logData) {
    const data = {
      user_id: logData.userId || null,
      action: logData.action,
      unique_id: logData.uniqueId || null,
      ip_address: logData.ipAddress || null,
      user_agent: logData.userAgent || null,
      details: logData.details ? JSON.stringify(logData.details) : null,
      success: logData.success !== undefined ? logData.success : true
    };

    const [id] = await db('audit_logs').insert(data);
    return id;
  }

  /**
   * Registra un intento de login
   */
  static async logLogin(userId, uniqueId, ipAddress, userAgent, success = true, details = null) {
    return this.create({
      userId,
      action: 'LOGIN',
      uniqueId,
      ipAddress,
      userAgent,
      success,
      details
    });
  }

  /**
   * Registra un logout
   */
  static async logLogout(userId, uniqueId, ipAddress, userAgent, details = null) {
    return this.create({
      userId,
      action: 'LOGOUT',
      uniqueId,
      ipAddress,
      userAgent,
      success: true,
      details
    });
  }

  /**
   * Registra una autorización/verificación de token
   */
  static async logAuthorization(userId, ipAddress, userAgent, success = true, details = null) {
    return this.create({
      userId,
      action: 'AUTHORIZE',
      ipAddress,
      userAgent,
      success,
      details
    });
  }

  /**
   * Registra extensión de token
   */
  static async logTokenExtension(userId, ipAddress, userAgent, details = null) {
    return this.create({
      userId,
      action: 'TOKEN_EXTENDED',
      ipAddress,
      userAgent,
      success: true,
      details
    });
  }

  /**
   * Registra un error de autenticación
   */
  static async logAuthError(uniqueId, ipAddress, userAgent, details) {
    return this.create({
      userId: null,
      action: 'AUTH_ERROR',
      uniqueId,
      ipAddress,
      userAgent,
      success: false,
      details
    });
  }

  /**
   * Obtiene logs de un usuario
   */
  static async findByUserId(userId, limit = 50) {
    const logs = await db('audit_logs')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
  }

  /**
   * Obtiene logs por unique_id
   */
  static async findByUniqueId(uniqueId) {
    const logs = await db('audit_logs')
      .where({ unique_id: uniqueId })
      .orderBy('created_at', 'desc');
    
    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
  }

  /**
   * Limpia logs antiguos (tarea de mantenimiento)
   */
  static async cleanOld(daysToKeep = 90) {
    const date = new Date();
    date.setDate(date.getDate() - daysToKeep);
    
    const result = await db('audit_logs')
      .where('created_at', '<', date)
      .delete();
    
    return result;
  }
}

module.exports = AuditLog;
