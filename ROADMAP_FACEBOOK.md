# 📱 Roadmap: Soporte para Facebook/Meta Login

## Estado Actual

✅ **Implementado:**
- Sistema de múltiples credenciales OAuth
- Soporte para múltiples apps de Google OAuth
- Carga dinámica de credenciales desde JSON
- Estrategias dinámicas de Passport.js

⏳ **Pendiente:**
- Implementación de Facebook/Meta Login
- Rutas y endpoints para Facebook
- Estrategia de Facebook en Passport.js

## Plan de Implementación

### Fase 1: Dependencias y Configuración

#### 1.1. Instalar Passport Facebook Strategy

```bash
npm install passport-facebook
```

#### 1.2. Obtener Credenciales de Facebook

1. Ve a [Facebook for Developers](https://developers.facebook.com/)
2. Crea una nueva app o selecciona una existente
3. Agrega el producto **"Facebook Login"**
4. Configura las URIs de redirección:
   - Producción: `https://auth.greenborn.com.ar/auth/facebook/callback`
   - Desarrollo: `http://localhost:3455/auth/facebook/callback`
5. Copia el **App ID** y **App Secret**

#### 1.3. Agregar Credenciales al JSON

Edita `oauth_credentials.json`:

```json
{
  "busquedas_pet_app": {
    "google": {
      "client_id": "",
      "client_secret": ""
    },
    "meta": {
      "app_id": "tu_facebook_app_id",
      "app_secret": "tu_facebook_app_secret"
    }
  }
}
```

### Fase 2: Código Backend

#### 2.1. Actualizar `passportDynamic.js`

Agregar función para registrar estrategia de Facebook:

```javascript
const FacebookStrategy = require('passport-facebook').Strategy;

/**
 * Registra una estrategia de Facebook OAuth para una app específica
 * @param {string} appId - ID de la app
 * @param {object} credentials - Credenciales (app_id, app_secret)
 */
function registerFacebookStrategy(appId, credentials) {
  const strategyName = `facebook-${appId}`;
  
  if (registeredStrategies.has(strategyName)) {
    return strategyName;
  }

  const strategy = new FacebookStrategy({
    clientID: credentials.app_id,
    clientSecret: credentials.app_secret,
    callbackURL: `${config.baseUrl}/auth/facebook/callback`,
    profileFields: ['id', 'emails', 'name', 'picture.type(large)']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = {
        id: profile.id,
        email: profile.emails?.[0]?.value || null,
        name: `${profile.name.givenName} ${profile.name.familyName}`,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        photo: profile.photos?.[0]?.value || null,
        provider: 'facebook',
        appId: appId,
        accessToken,
        refreshToken,
        profile
      };
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  });

  passport.use(strategyName, strategy);
  registeredStrategies.set(strategyName, true);
  
  console.log(`✅ Estrategia OAuth registrada: ${strategyName}`);
  return strategyName;
}

module.exports = {
  passport,
  registerGoogleStrategy,
  registerFacebookStrategy,  // Agregar export
  getStrategyName,
  isStrategyRegistered
};
```

#### 2.2. Agregar Rutas en `auth.js`

```javascript
/**
 * GET /auth/facebook
 * Inicia la autenticación con Facebook
 * Requiere: url_redireccion_app, unique_id
 */
router.get('/facebook', 
  extractRequestInfo,
  validateOAuthParams,
  authLimiter,
  async (req, res, next) => {
    try {
      // Obtener el app_id desde la URL de redirección
      const appId = await AllowedApp.getAppIdByUrl(req.session.oauth_redirect_url);
      
      if (!appId) {
        console.error('No se encontró app_id para la URL:', req.session.oauth_redirect_url);
        return res.redirect(`${config.redirect.failure}?error=APP_ID_NOT_FOUND`);
      }

      // Obtener credenciales OAuth para esta app
      const credentials = config.getOAuthCredentials(appId, 'meta');
      
      if (!credentials || !credentials.app_id || !credentials.app_secret) {
        console.error(`No hay credenciales de Facebook configuradas para app_id: ${appId}`);
        return res.redirect(`${config.redirect.failure}?error=FACEBOOK_CREDENTIALS_NOT_FOUND`);
      }

      // Registrar la estrategia de Facebook para esta app
      const strategyName = registerFacebookStrategy(appId, credentials);

      // Guardar datos en sesión
      req.session.oauth_strategy_name = strategyName;
      req.session.oauth_app_id = appId;

      // Codificar state parameter
      const state = Buffer.from(JSON.stringify({
        url_redireccion_app: req.session.oauth_redirect_url,
        unique_id: req.session.oauth_unique_id,
        app_id: appId,
        strategy_name: strategyName
      })).toString('base64');

      passport.authenticate(strategyName, {
        scope: ['email', 'public_profile'],
        state: state
      })(req, res, next);
    } catch (error) {
      console.error('Error en /auth/facebook:', error);
      return res.redirect(`${config.redirect.failure}?error=FACEBOOK_INIT_ERROR`);
    }
  }
);

/**
 * GET /auth/facebook/callback
 * Callback de Facebook OAuth
 */
router.get('/facebook/callback',
  extractRequestInfo,
  async (req, res, next) => {
    try {
      // Recuperar datos del state parameter
      let strategyName, appId;
      
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          strategyName = stateData.strategy_name;
          appId = stateData.app_id;
        } catch (e) {
          console.error('Error decodificando state parameter:', e);
        }
      }

      // Fallback a la sesión
      if (!strategyName) {
        strategyName = req.session.oauth_strategy_name || 'facebook';
      }
      if (!appId) {
        appId = req.session.oauth_app_id;
      }

      console.log(`Usando estrategia: ${strategyName} para app_id: ${appId}`);

      // Autenticar con la estrategia correcta
      passport.authenticate(strategyName, { 
        failureRedirect: config.redirect.failure,
        session: true
      })(req, res, next);
    } catch (error) {
      console.error('Error en /auth/facebook/callback:', error);
      return res.redirect(`${config.redirect.failure}?error=FACEBOOK_CALLBACK_ERROR`);
    }
  },
  async (req, res) => {
    try {
      console.log('Callback de Facebook exitoso:', req.user);

      // Recuperar datos de la sesión
      let redirectUrl, uniqueId;
      
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          redirectUrl = stateData.url_redireccion_app;
          uniqueId = stateData.unique_id;
        } catch (e) {
          console.error('Error decodificando state parameter:', e);
        }
      }

      if (!redirectUrl || !uniqueId) {
        redirectUrl = req.session.oauth_redirect_url;
        uniqueId = req.session.oauth_unique_id;
      }

      if (!redirectUrl || !uniqueId) {
        return res.redirect(`${config.redirect.failure}?error=MISSING_PARAMS`);
      }

      // Procesar callback y generar token temporal
      const result = await AuthService.handleFacebookCallback(
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
          step: 'facebook_callback',
          redirectUrl: redirectUrl
        }
      );

      // Guardar token temporal en sesión
      req.session.temporal_token = result.temporalToken;
      req.session.oauth_redirect_url = redirectUrl;
      req.session.oauth_unique_id = uniqueId;

      // Redirigir al success endpoint
      res.redirect(config.redirect.success);
    } catch (error) {
      console.error('Error procesando callback de Facebook:', error);
      
      await AuditLog.logAuthError(
        null,
        req.session.oauth_unique_id,
        req.clientIp,
        req.userAgent,
        'facebook_callback_error',
        { error: error.message }
      );

      res.redirect(`${config.redirect.failure}?error=FACEBOOK_CALLBACK_ERROR`);
    }
  }
);
```

#### 2.3. Actualizar `authService.js`

Agregar método para manejar callback de Facebook:

```javascript
/**
 * Procesa el callback de Facebook y genera token temporal
 */
static async handleFacebookCallback(profile, accessToken, refreshToken, uniqueId) {
  try {
    // Buscar o crear usuario (similar a handleGoogleCallback)
    let user = await User.findByFacebookId(profile.id);
    
    if (!user) {
      user = await User.createFromFacebook({
        facebookId: profile.id,
        email: profile.emails?.[0]?.value,
        name: `${profile.name.givenName} ${profile.name.familyName}`,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        photo: profile.photos?.[0]?.value,
        accessToken,
        refreshToken
      });
    } else {
      // Actualizar usuario existente
      await User.updateFromFacebook(user.id, {
        name: `${profile.name.givenName} ${profile.name.familyName}`,
        photo: profile.photos?.[0]?.value,
        accessToken,
        refreshToken,
        uniqueId
      });
    }

    // Generar token temporal
    const temporalToken = this.generateTemporalToken(user.id, uniqueId);

    return {
      user,
      temporalToken
    };
  } catch (error) {
    console.error('Error en handleFacebookCallback:', error);
    throw error;
  }
}
```

#### 2.4. Actualizar Modelo `User`

Agregar métodos para Facebook:

```javascript
// Agregar campo facebook_id a la migración de users
static async findByFacebookId(facebookId) {
  return await db('users')
    .where({ facebook_id: facebookId })
    .first();
}

static async createFromFacebook(data) {
  const encryptedToken = encryption.encrypt(data.accessToken);
  
  const userData = {
    facebook_id: data.facebookId,
    email: data.email,
    name: data.name,
    photo: data.photo,
    facebook_access_token: encryptedToken,
    is_active: true
  };

  const [id] = await db('users').insert(userData);
  return this.findById(id);
}

static async updateFromFacebook(userId, data) {
  const encryptedToken = encryption.encrypt(data.accessToken);
  
  const updateData = {
    name: data.name,
    photo: data.photo,
    facebook_access_token: encryptedToken,
    last_unique_id: data.uniqueId,
    updated_at: db.fn.now()
  };

  await db('users')
    .where({ id: userId })
    .update(updateData);
}
```

### Fase 3: Migración de Base de Datos

Crear migración para agregar campos de Facebook:

```javascript
// src/database/migrations/20251012000007_add_facebook_fields_to_users.js
exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.string('facebook_id', 255).nullable().unique();
    table.text('facebook_access_token').nullable();
    table.index('facebook_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('facebook_id');
    table.dropColumn('facebook_access_token');
  });
};
```

### Fase 4: Testing

```bash
# Iniciar autenticación con Facebook
curl -L "http://localhost:3455/auth/facebook?url_redireccion_app=http://localhost:3001/%23/login-redirect&unique_id=test456"
```

## Configuración de Facebook App

### Settings Requeridos

1. **Basic Settings:**
   - App Domains: `auth.greenborn.com.ar`
   - Privacy Policy URL: (tu URL)
   - Terms of Service URL: (tu URL)

2. **Facebook Login Settings:**
   - Valid OAuth Redirect URIs:
     - `https://auth.greenborn.com.ar/auth/facebook/callback`
     - `http://localhost:3455/auth/facebook/callback` (desarrollo)
   - Login from Devices: Habilitado
   - Enforce HTTPS: Sí (producción)

3. **App Review:**
   - Solicitar permisos: `email`, `public_profile`

## Ejemplo de Uso en Cliente

```javascript
// Botón de login con Facebook
<button onclick="loginWithFacebook()">
  Login con Facebook
</button>

function loginWithFacebook() {
  const urlRedireccion = encodeURIComponent(window.location.origin + '/#/login-redirect');
  const uniqueId = generateUniqueId();
  
  window.location.href = `https://auth.greenborn.com.ar/auth/facebook?url_redireccion_app=${urlRedireccion}&unique_id=${uniqueId}`;
}
```

## Ventajas del Sistema Actual

✅ Ya está preparado para múltiples proveedores
✅ Mismo flujo de tokens que Google
✅ Estrategias dinámicas por app
✅ Credenciales separadas por app y proveedor

## Próximos Pasos

1. ✅ Sistema de múltiples credenciales (completado)
2. ⏳ Implementar Facebook (este documento)
3. ⏳ Agregar más proveedores (Twitter, GitHub, etc.)
4. ⏳ Panel de administración web

---

**Fecha:** 12 de octubre de 2025
**Estado:** Listo para implementación de Facebook
