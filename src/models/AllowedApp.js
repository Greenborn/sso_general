const db = require('../config/database');

class AllowedApp {
  /**
   * Verifica si una URL está permitida
   */
  static async isUrlAllowed(url) {
    try {
      const apps = await db('allowed_apps')
        .where({ is_active: true })
        .select('allowed_redirect_urls');
      
      for (const app of apps) {
        const urls = JSON.parse(app.allowed_redirect_urls);
        if (urls.includes(url)) {
          return true;
        }
        
        // Verificar también con wildcards
        for (const allowedUrl of urls) {
          if (this.matchesPattern(url, allowedUrl)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verificando URL permitida:', error);
      return false;
    }
  }

  /**
   * Obtiene el app_id de la aplicación que permite una URL
   */
  static async getAppIdByUrl(url) {
    try {
      const apps = await db('allowed_apps')
        .where({ is_active: true })
        .select('app_id', 'allowed_redirect_urls');
      
      for (const app of apps) {
        const urls = JSON.parse(app.allowed_redirect_urls);
        if (urls.includes(url)) {
          return app.app_id;
        }
        
        // Verificar también con wildcards
        for (const allowedUrl of urls) {
          if (this.matchesPattern(url, allowedUrl)) {
            return app.app_id;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo app_id por URL:', error);
      return null;
    }
  }

  /**
   * Verifica si una URL coincide con un patrón (soporta wildcards básicos)
   */
  static matchesPattern(url, pattern) {
    // Convertir patrón con * a regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(url);
  }

  /**
   * Busca una app por nombre
   */
  static async findByName(name) {
    const app = await db('allowed_apps')
      .where({ app_name: name })
      .first();
    
    if (app && app.allowed_redirect_urls) {
      app.allowed_redirect_urls = JSON.parse(app.allowed_redirect_urls);
    }
    
    return app;
  }

  /**
   * Lista todas las apps activas
   */
  static async findAllActive() {
    const apps = await db('allowed_apps')
      .where({ is_active: true })
      .orderBy('app_name');
    
    return apps.map(app => ({
      ...app,
      allowed_redirect_urls: JSON.parse(app.allowed_redirect_urls)
    }));
  }

  /**
   * Crea una nueva app permitida
   */
  static async create(appData) {
    const data = {
      app_name: appData.name,
      allowed_redirect_urls: JSON.stringify(appData.urls),
      is_active: true
    };

    const [id] = await db('allowed_apps').insert(data);
    return this.findById(id);
  }

  /**
   * Busca una app por ID
   */
  static async findById(id) {
    const app = await db('allowed_apps')
      .where({ id })
      .first();
    
    if (app && app.allowed_redirect_urls) {
      app.allowed_redirect_urls = JSON.parse(app.allowed_redirect_urls);
    }
    
    return app;
  }

  /**
   * Actualiza las URLs permitidas de una app
   */
  static async updateUrls(id, urls) {
    await db('allowed_apps')
      .where({ id })
      .update({
        allowed_redirect_urls: JSON.stringify(urls),
        updated_at: db.fn.now()
      });
    
    return this.findById(id);
  }

  /**
   * Activa/desactiva una app
   */
  static async setActive(id, isActive) {
    await db('allowed_apps')
      .where({ id })
      .update({
        is_active: isActive,
        updated_at: db.fn.now()
      });
  }
}

module.exports = AllowedApp;
