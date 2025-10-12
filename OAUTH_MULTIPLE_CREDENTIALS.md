# 🔑 Sistema de Múltiples Credenciales OAuth

## Descripción

Este sistema permite configurar múltiples credenciales de OAuth (Google, Facebook, etc.) para diferentes aplicaciones cliente. Cada aplicación puede tener sus propias credenciales de autenticación, lo que permite mayor flexibilidad y seguridad.

## Estructura de Configuración

### 1. Archivo de Credenciales (`oauth_credentials.json`)

Las credenciales se organizan por `app_id` y luego por proveedor:

```json
{
  "busquedas_pet_app": {
    "google": {
      "client_id": "xxx.apps.googleusercontent.com",
      "client_secret": "GOCSPX-xxxx"
    },
    "meta": {
      "app_id": "xxx",
      "app_secret": "xxx"
    }
  },
  "otra_app": {
    "google": {
      "client_id": "yyy.apps.googleusercontent.com",
      "client_secret": "GOCSPX-yyyy"
    }
  }
}
```

**Importante:**
- Este archivo está en `.gitignore` para proteger las credenciales
- Cada app tiene su propio `app_id` único
- Cada proveedor (google, meta) tiene sus propias credenciales

### 2. Variable de Entorno (`.env`)

Referencia la ubicación del archivo de credenciales:

```bash
OAUTH_CREDENTIALS_PATH=./oauth_credentials.json
```

### 3. Base de Datos (`allowed_apps`)

Cada aplicación en la tabla `allowed_apps` debe tener un `app_id` único:

```sql
-- Agregar app_id a una aplicación existente
UPDATE allowed_apps 
SET app_id = 'busquedas_pet_app' 
WHERE app_name = 'MisMascotas';

-- Insertar nueva aplicación con app_id
INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, is_active) 
VALUES (
  'MisMascotas',
  'busquedas_pet_app',
  '["https://buscar.mismascotas.top/#/login-redirect"]',
  1
);
```

## Flujo de Autenticación

1. **Cliente inicia autenticación:**
   ```
   GET /auth/google?url_redireccion_app=https://buscar.mismascotas.top&unique_id=abc123
   ```

2. **El SSO identifica la app:**
   - Busca en `allowed_apps` qué app tiene esa URL
   - Obtiene el `app_id` de esa aplicación (ej: `busquedas_pet_app`)

3. **El SSO carga las credenciales:**
   - Lee `oauth_credentials.json`
   - Busca las credenciales en `oauth_credentials[app_id][provider]`
   - Ejemplo: `oauth_credentials['busquedas_pet_app']['google']`

4. **El SSO registra una estrategia dinámica:**
   - Crea una estrategia de Passport.js con las credenciales específicas
   - Nombre de estrategia: `google-busquedas_pet_app`

5. **Redirección a Google OAuth:**
   - Usa las credenciales específicas de la app
   - Google valida con el `client_id` correcto

6. **Callback y token:**
   - Recibe el callback con la estrategia correcta
   - Genera tokens y autentica al usuario

## Configuración de Nuevas Aplicaciones

### Paso 1: Crear Credenciales OAuth en Google

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita "Google+ API"
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente OAuth 2.0"
5. Configura:
   - Tipo: Aplicación web
   - URI de redirección autorizada: `https://auth.greenborn.com.ar/auth/google/callback`
6. Copia el `Client ID` y `Client Secret`

### Paso 2: Agregar App a la Base de Datos

```sql
INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, is_active) 
VALUES (
  'Mi Nueva App',
  'mi_nueva_app',
  '["https://mi-app.com/#/login", "http://localhost:3001/#/login"]',
  1
);
```

### Paso 3: Agregar Credenciales al JSON

Edita `oauth_credentials.json`:

```json
{
  "mi_nueva_app": {
    "google": {
      "client_id": "tu_client_id.apps.googleusercontent.com",
      "client_secret": "GOCSPX-tu_client_secret"
    }
  }
}
```

### Paso 4: Reiniciar el Servidor

```bash
npm restart
```

El sistema cargará automáticamente las nuevas credenciales.

## Soporte para Facebook (Meta)

Para agregar soporte de Facebook, sigue el mismo patrón:

### 1. Obtener Credenciales de Facebook

1. Ve a [Facebook for Developers](https://developers.facebook.com/)
2. Crea una nueva app o selecciona una existente
3. Agrega el producto "Facebook Login"
4. Configura:
   - URI de redirección OAuth válida: `https://auth.greenborn.com.ar/auth/facebook/callback`
5. Copia el `App ID` y `App Secret`

### 2. Agregar al JSON de Credenciales

```json
{
  "busquedas_pet_app": {
    "google": { ... },
    "meta": {
      "app_id": "tu_facebook_app_id",
      "app_secret": "tu_facebook_app_secret"
    }
  }
}
```

### 3. Implementar Rutas de Facebook

```javascript
// src/routes/auth.js

router.get('/facebook', async (req, res, next) => {
  // Similar al flujo de Google
  const appId = await AllowedApp.getAppIdByUrl(req.session.oauth_redirect_url);
  const credentials = config.getOAuthCredentials(appId, 'meta');
  
  // Registrar estrategia de Facebook
  const strategyName = registerFacebookStrategy(appId, credentials);
  
  passport.authenticate(strategyName, {
    scope: ['email', 'public_profile']
  })(req, res, next);
});
```

## Scripts Útiles

### Actualizar `app_id` en Apps Existentes

```bash
node scripts/update-app-ids.js
```

Este script:
- Lee todas las apps de `allowed_apps`
- Genera un `app_id` desde el `app_name` (snake_case)
- Actualiza la base de datos

### Verificar Credenciales Cargadas

```bash
node -e "const config = require('./src/config/config'); console.log(config.getOAuthCredentials('busquedas_pet_app', 'google'));"
```

## Seguridad

- ✅ **Archivo en `.gitignore`**: Las credenciales nunca se suben al repositorio
- ✅ **Separación por app**: Cada app tiene sus propias credenciales
- ✅ **Validación de URLs**: Solo las URLs en `allowed_apps` pueden usar las credenciales
- ✅ **Estrategias dinámicas**: Las credenciales se cargan bajo demanda

## Troubleshooting

### Error: "OAUTH_CREDENTIALS_NOT_FOUND"

**Causa:** No hay credenciales configuradas para el `app_id` en `oauth_credentials.json`

**Solución:**
1. Verifica que el `app_id` en `allowed_apps` coincida con el del JSON
2. Asegúrate de que el proveedor (`google`, `meta`) esté configurado
3. Revisa que el archivo JSON esté bien formado (sin errores de sintaxis)

### Error: "APP_ID_NOT_FOUND"

**Causa:** La app no tiene un `app_id` configurado en la base de datos

**Solución:**
```sql
UPDATE allowed_apps SET app_id = 'nombre_de_la_app' WHERE app_name = 'Nombre App';
```

O ejecuta:
```bash
node scripts/update-app-ids.js
```

### Error: "Archivo oauth_credentials.json no encontrado"

**Causa:** El archivo no existe o la ruta en `.env` es incorrecta

**Solución:**
1. Crea el archivo: `touch oauth_credentials.json`
2. Verifica la variable en `.env`: `OAUTH_CREDENTIALS_PATH=./oauth_credentials.json`
3. Agrega el contenido inicial:
   ```json
   {
     "app_id_ejemplo": {
       "google": {
         "client_id": "xxx",
         "client_secret": "xxx"
       }
     }
   }
   ```

## Migración desde Sistema Anterior

Si ya tienes una app funcionando con las credenciales en `.env`:

### 1. Mantener Compatibilidad

Las credenciales en `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) se mantienen como fallback para apps sin `app_id`.

### 2. Migrar Gradualmente

1. Ejecuta la migración de base de datos:
   ```bash
   npm run migrate:latest
   ```

2. Actualiza los `app_id`:
   ```bash
   node scripts/update-app-ids.js
   ```

3. Crea `oauth_credentials.json` con las credenciales de cada app

4. Reinicia el servidor

## API para Obtener Credenciales

### Desde el Código

```javascript
const config = require('./src/config/config');

// Obtener credenciales de Google para una app
const googleCreds = config.getOAuthCredentials('busquedas_pet_app', 'google');
console.log(googleCreds);
// { client_id: 'xxx.apps.googleusercontent.com', client_secret: 'GOCSPX-xxx' }

// Obtener credenciales de Facebook
const metaCreds = config.getOAuthCredentials('busquedas_pet_app', 'meta');
console.log(metaCreds);
// { app_id: 'xxx', app_secret: 'xxx' }
```

---

**Sistema implementado y listo para usar con múltiples proveedores OAuth** 🎉
