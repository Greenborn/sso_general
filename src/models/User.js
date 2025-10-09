const db = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

class User {
  /**
   * Busca un usuario por email
   */
  static async findByEmail(email) {
    const user = await db('users')
      .where({ email })
      .first();
    
    if (user && user.google_access_token) {
      user.google_access_token = decrypt(user.google_access_token);
    }
    if (user && user.google_refresh_token) {
      user.google_refresh_token = decrypt(user.google_refresh_token);
    }
    
    return user;
  }

  /**
   * Busca un usuario por ID
   */
  static async findById(id) {
    const user = await db('users')
      .where({ id })
      .first();
    
    if (user && user.google_access_token) {
      user.google_access_token = decrypt(user.google_access_token);
    }
    if (user && user.google_refresh_token) {
      user.google_refresh_token = decrypt(user.google_refresh_token);
    }
    
    return user;
  }

  /**
   * Busca un usuario por Google ID
   */
  static async findByGoogleId(googleId) {
    const user = await db('users')
      .where({ google_id: googleId })
      .first();
    
    if (user && user.google_access_token) {
      user.google_access_token = decrypt(user.google_access_token);
    }
    if (user && user.google_refresh_token) {
      user.google_refresh_token = decrypt(user.google_refresh_token);
    }
    
    return user;
  }

  /**
   * Crea un nuevo usuario
   */
  static async create(userData) {
    const data = {
      google_id: userData.googleId,
      email: userData.email,
      name: userData.name,
      first_name: userData.firstName,
      last_name: userData.lastName,
      photo_url: userData.photo,
      last_unique_id: userData.uniqueId,
      google_access_token: userData.accessToken ? encrypt(userData.accessToken) : null,
      google_refresh_token: userData.refreshToken ? encrypt(userData.refreshToken) : null,
      is_active: true,
      last_login_at: db.fn.now()
    };

    const [id] = await db('users').insert(data);
    return this.findById(id);
  }

  /**
   * Actualiza un usuario existente
   */
  static async update(id, userData) {
    const data = {
      name: userData.name,
      first_name: userData.firstName,
      last_name: userData.lastName,
      photo_url: userData.photo,
      last_unique_id: userData.uniqueId,
      last_login_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    if (userData.accessToken) {
      data.google_access_token = encrypt(userData.accessToken);
    }
    if (userData.refreshToken) {
      data.google_refresh_token = encrypt(userData.refreshToken);
    }

    await db('users')
      .where({ id })
      .update(data);
    
    return this.findById(id);
  }

  /**
   * Actualiza el último unique_id del usuario
   */
  static async updateLastUniqueId(id, uniqueId) {
    await db('users')
      .where({ id })
      .update({
        last_unique_id: uniqueId,
        updated_at: db.fn.now()
      });
  }

  /**
   * Marca un usuario como inactivo
   */
  static async deactivate(id) {
    await db('users')
      .where({ id })
      .update({
        is_active: false,
        updated_at: db.fn.now()
      });
  }

  /**
   * Actualiza los tokens de Google
   */
  static async updateGoogleTokens(id, accessToken, refreshToken = null) {
    const data = {
      google_access_token: accessToken ? encrypt(accessToken) : null,
      updated_at: db.fn.now()
    };

    if (refreshToken) {
      data.google_refresh_token = encrypt(refreshToken);
    }

    await db('users')
      .where({ id })
      .update(data);
  }

  /**
   * Elimina los tokens de Google (para logout)
   */
  static async clearGoogleTokens(id) {
    await db('users')
      .where({ id })
      .update({
        google_access_token: null,
        google_refresh_token: null,
        updated_at: db.fn.now()
      });
  }
}

module.exports = User;
