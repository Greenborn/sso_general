# 📝 Resumen de Implementación: Sistema de Múltiples Credenciales OAuth

## ✅ Cambios Realizados

### 1. Archivos Nuevos Creados

#### `/oauth_credentials.json`
- Archivo de configuración JSON para almacenar credenciales OAuth por app y proveedor
- Estructura: `{ "app_id": { "provider": { "client_id": "...", "client_secret": "..." } } }`
- Agregado a `.gitignore` para proteger credenciales

#### `/src/config/passportDynamic.js`
- Sistema dinámico de estrategias de Passport.js
- Permite registrar múltiples estrategias de OAuth (una por app)
- Funciones principales:
  - `registerGoogleStrategy(appId, credentials)`: Registra estrategia de Google
  - `getStrategyName(appId)`: Obtiene nombre de estrategia
  - `isStrategyRegistered(appId)`: Verifica si estrategia existe

#### `/src/database/migrations/20251012000006_add_app_id_to_allowed_apps.js`
- Migración para agregar campo `app_id` (único) a tabla `allowed_apps`
- Permite identificar apps para cargar credenciales

#### `/scripts/update-app-ids.js`
- Script para generar automáticamente `app_id` desde `app_name`
- Convierte nombres a snake_case
- Actualiza apps existentes en la base de datos

#### `/OAUTH_MULTIPLE_CREDENTIALS.md`
- Documentación completa del nuevo sistema
- Guía de configuración y uso
- Ejemplos de implementación
- Troubleshooting

### 2. Archivos Modificados

#### `/src/config/config.js`
- Agregada función `getOAuthCredentials(appId, provider)`
- Carga automática de `oauth_credentials.json` al inicio
- Validación y logging de credenciales

#### `/src/routes/auth.js`
- Modificado endpoint `GET /auth/google`:
  - Obtiene `app_id` desde la URL de redirección
  - Carga credenciales específicas de la app
  - Registra estrategia dinámica de OAuth
  - Usa estrategia específica para autenticación

- Modificado endpoint `GET /auth/google/callback`:
  - Recupera estrategia correcta desde state parameter
  - Autentica con estrategia específica de la app

#### `/src/models/AllowedApp.js`
- Agregado método `getAppIdByUrl(url)`:
  - Busca qué app permite una URL
  - Retorna el `app_id` correspondiente
  - Soporta wildcards

#### `/.env`
- Agregada variable `OAUTH_CREDENTIALS_PATH=./oauth_credentials.json`
- Credenciales Google mantenidas como legacy/fallback

#### `/.gitignore`
- Agregada línea `oauth_credentials.json` para proteger credenciales

#### `/DOCUMENTATION.md`
- Actualizada sección de configuración
- Agregada referencia al archivo `oauth_credentials.json`
- Agregado link a documentación de múltiples credenciales

### 3. Base de Datos

#### Migración Ejecutada
```bash
npm run migrate:latest
# Batch 3 run: 1 migrations
```

#### Apps Insertadas
```sql
INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, is_active) 
VALUES ('MisMascotas', 'busquedas_pet_app', ..., 1);
```

## 🔄 Flujo de Autenticación (Nuevo)

```
1. Cliente → GET /auth/google?url_redireccion_app=...&unique_id=...
2. SSO busca app_id por URL → "busquedas_pet_app"
3. SSO carga credenciales → oauth_credentials["busquedas_pet_app"]["google"]
4. SSO registra estrategia → "google-busquedas_pet_app"
5. SSO redirige a Google OAuth (con credenciales específicas)
6. Usuario se autentica en Google
7. Google callback → SSO usa estrategia "google-busquedas_pet_app"
8. SSO genera tokens y redirige a la app
```

## 📋 Estructura de Archivos

```
/sso_general/
├── oauth_credentials.json          ← NUEVO (gitignored)
├── .gitignore                      ← MODIFICADO
├── .env                            ← MODIFICADO
├── OAUTH_MULTIPLE_CREDENTIALS.md  ← NUEVO
├── DOCUMENTATION.md                ← MODIFICADO
├── src/
│   ├── config/
│   │   ├── config.js              ← MODIFICADO
│   │   ├── passport.js            ← (sin cambios, legacy)
│   │   └── passportDynamic.js     ← NUEVO
│   ├── routes/
│   │   └── auth.js                ← MODIFICADO
│   ├── models/
│   │   └── AllowedApp.js          ← MODIFICADO
│   └── database/
│       └── migrations/
│           └── 20251012000006_add_app_id_to_allowed_apps.js  ← NUEVO
└── scripts/
    └── update-app-ids.js           ← NUEVO
```

## 🎯 Beneficios del Nuevo Sistema

1. **Múltiples Credenciales**: Cada app puede tener sus propias credenciales OAuth
2. **Múltiples Proveedores**: Soporta Google, Facebook, y otros (extensible)
3. **Seguridad**: Credenciales no se suben al repositorio (gitignore)
4. **Flexibilidad**: Fácil agregar nuevas apps sin modificar código
5. **Escalabilidad**: Sistema dinámico de estrategias Passport.js
6. **Trazabilidad**: Cada autenticación vinculada a su app específica

## 🚀 Próximos Pasos Sugeridos

### 1. Agregar Soporte para Facebook
- Instalar: `npm install passport-facebook`
- Crear función `registerFacebookStrategy()` en `passportDynamic.js`
- Agregar rutas `/auth/facebook` y `/auth/facebook/callback`
- Configurar credenciales en `oauth_credentials.json`:
  ```json
  {
    "busquedas_pet_app": {
      "google": { ... },
      "meta": {
        "app_id": "facebook_app_id",
        "app_secret": "facebook_app_secret"
      }
    }
  }
  ```

### 2. Agregar UI de Administración
- Panel para gestionar apps y credenciales
- CRUD de `allowed_apps` con validación
- Interfaz para probar autenticación

### 3. Validación Adicional
- Validar formato de credenciales al cargar
- Verificar que las credenciales funcionen (healthcheck)
- Alertas si faltan credenciales para una app

### 4. Logging Mejorado
- Log de qué estrategia se usa en cada autenticación
- Métricas por app (autenticaciones exitosas/fallidas)
- Audit log con app_id

## 🧪 Testing

### Probar con curl:

```bash
# 1. Iniciar autenticación
curl -L "http://localhost:3455/auth/google?url_redireccion_app=http://localhost:3001/%23/login-redirect&unique_id=test123"

# Debería redirigir a Google OAuth
```

### Verificar credenciales cargadas:

```bash
node -e "const config = require('./src/config/config'); console.log(config.getOAuthCredentials('busquedas_pet_app', 'google'));"
```

Salida esperada:
```javascript
{
  client_id: '',
  client_secret: ''
}
```

## 📚 Documentación de Referencia

- **Guía completa**: `OAUTH_MULTIPLE_CREDENTIALS.md`
- **Documentación general**: `DOCUMENTATION.md`
- **Passport.js dinámico**: `src/config/passportDynamic.js`

---

**✨ Sistema implementado y listo para usar!**

Fecha: 12 de octubre de 2025
