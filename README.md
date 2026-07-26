# 🔐 SSO General - Servicio de Autenticación OAuth

Servicio Node.js con Express para manejar autenticación OAuth con múltiples proveedores (Google, Facebook, etc.) y soporte para múltiples aplicaciones con credenciales independientes.

## ✨ Características Principales

- ✅ **Múltiples Aplicaciones**: Cada app puede tener sus propias credenciales OAuth
- ✅ **Múltiples Proveedores**: Soporte para Google, Facebook/Meta (y más en el futuro)
- ✅ **Credenciales Dinámicas**: Configuración centralizada en archivo JSON
- ✅ **Sistema de Tokens**: Tokens temporales y bearer tokens con JWT
- ✅ **Seguridad**: Credenciales protegidas, rate limiting, auditoría
- ✅ **Base de Datos**: Gestión de usuarios y sesiones en MariaDB
- ✅ **Escalable**: Fácil agregar nuevas apps sin modificar código

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| **[DOCUMENTATION.md](DOCUMENTATION.md)** | 📖 Documentación completa del servicio SSO |
| **[OAUTH_QUICKSTART.md](OAUTH_QUICKSTART.md)** | 🚀 Guía rápida para configurar múltiples credenciales |
| **[OAUTH_MULTIPLE_CREDENTIALS.md](OAUTH_MULTIPLE_CREDENTIALS.md)** | 🔑 Documentación detallada del sistema de credenciales |
| **[ROADMAP_FACEBOOK.md](ROADMAP_FACEBOOK.md)** | 📱 Plan para implementar Facebook/Meta login |
| **[COMPLETED_OAUTH_IMPLEMENTATION.md](COMPLETED_OAUTH_IMPLEMENTATION.md)** | ✅ Resumen de implementación completada |
| **[IMPLEMENTATION_OAUTH_MULTI.md](IMPLEMENTATION_OAUTH_MULTI.md)** | 🔧 Detalles técnicos de la implementación |

## 🚀 Inicio Rápido

### Requisitos

- Node.js >= 22.0.0
- MariaDB >= 10.6
- npm o yarn

### Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/Greenborn/sso_general.git
cd sso_general
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Editar `.env` con tus valores:
```bash
# Base de datos
DB_HOST=localhost
DB_NAME=sso_general
DB_USER=sso_general
DB_PASSWORD=tu_password

# Ruta al archivo de credenciales OAuth
OAUTH_CREDENTIALS_PATH=./oauth_credentials.json

# Google OAuth (legacy/fallback)
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=https://auth.greenborn.com.ar/auth/google/callback

# Secrets
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

4. **Configurar credenciales OAuth:**

Crear `oauth_credentials.json`:
```json
{
  "mi_app": {
    "google": {
      "client_id": "xxx.apps.googleusercontent.com",
      "client_secret": "GOCSPX-xxx"
    }
  }
}
```

5. **Crear base de datos:**
```bash
mysql -u root -p
CREATE DATABASE sso_general CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

6. **Ejecutar migraciones:**
```bash
npm run migrate:latest
```

7. **Insertar aplicación permitida:**
```sql
INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, is_active) 
VALUES (
  'Mi App',
  'mi_app',
  '["https://mi-app.com/#/login"]',
  1
);
```

8. **Iniciar servidor:**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Configuración de Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ o Google People API
4. Crea credenciales OAuth 2.0:
   - Tipo de aplicación: Aplicación web
   - URLs de origen autorizadas: `http://localhost:3000`
   - URLs de redirección autorizadas: `http://localhost:3000/auth/google/callback`
5. Copia el Client ID y Client Secret al archivo `.env`

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Ejecución con PM2

Para ejecutar el servicio en producción usando [pm2](https://pm2.keymetrics.io/):

1. Instala pm2 globalmente si no lo tienes:
  ```bash
  npm install -g pm2
  ```

2. Inicia el servicio:
  ```bash
  pm2 start src/app.js --name sso-google-auth
  ```

3. Guarda el proceso para reinicio automático:
  ```bash
  pm2 save
  ```

4. (Opcional) Para iniciar pm2 al arrancar el sistema:
  ```bash
  pm2 startup
  ```
  Sigue las instrucciones que te muestra el comando.

5. Monitorea el servicio:
  ```bash
  pm2 status
  pm2 logs sso-google-auth
  ```

## Endpoints Disponibles

### Autenticación

- **GET** `/auth/google` - Iniciar autenticación con Google
- **GET** `/auth/google/callback` - Callback de Google OAuth (automático)
- **POST** `/auth/login` - Login con token temporal y obtener bearer token
- **GET** `/auth/verify` - Verificar y extender bearer token
- **POST** `/auth/renew` - Renovar bearer token expirado (con sesión BD vigente)
- **POST** `/auth/logout` - Cerrar sesión
- **GET** `/auth/logout` - Cerrar sesión (alternativa GET)
- **GET** `/auth/sessions` - Listar sesiones activas
- **GET** `/auth/status` - Verificar estado de autenticación
- **GET** `/auth/success` - Página de éxito después de autenticarse
- **GET** `/auth/failure` - Página de fallo de autenticación

### Información del servicio

- **GET** `/` - Información del servicio y endpoints disponibles
- **GET** `/health` - Estado de salud del servicio

## Flujo de Autenticación

1. El usuario visita `/auth/google`
2. Es redirigido a Google para autorizar la aplicación
3. Google redirige de vuelta a `/auth/google/callback`
4. Si es exitoso, el usuario es redirigido a `/auth/success`
5. La app recibe un token temporal y llama `POST /auth/login` para obtener un bearer token
6. El bearer token se usa en cada petición vía header `Authorization: Bearer <token>`
7. Periódicamente se llama `GET /auth/verify` para verificar y extender la sesión
8. Si el token JWT expira, se puede renovar vía `POST /auth/renew` (sin re-autenticar por Google)

## Estructura del Proyecto

```
src/
├── config/
│   ├── config.js          # Configuración general
│   └── passport.js        # Configuración de Passport.js
├── middleware/
│   └── auth.js           # Middlewares de autenticación
├── routes/
│   └── auth.js           # Rutas de autenticación
└── app.js                # Aplicación principal
```

## Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `PORT` | Puerto del servidor | No | 3000 |
| `NODE_ENV` | Entorno de ejecución | No | development |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | Sí | - |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth | Sí | - |
| `GOOGLE_CALLBACK_URL` | URL de callback | No | http://localhost:3000/auth/google/callback |
| `SESSION_SECRET` | Clave secreta para sesiones | Sí | - |
| `SUCCESS_REDIRECT_URL` | URL de redirección exitosa | No | /auth/success |
| `FAILURE_REDIRECT_URL` | URL de redirección de fallo | No | /auth/failure |
| `BASE_URL` | URL base de la aplicación | No | http://localhost:3000 |

## Respuestas de la API

### Usuario autenticado exitosamente
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "google_user_id",
    "email": "user@example.com",
    "name": "Usuario Ejemplo",
    "firstName": "Usuario",
    "lastName": "Ejemplo",
    "photo": "https://profile-photo-url",
    "provider": "google",
    "accessToken": "access_token",
    "refreshToken": "refresh_token"
  }
}
```

### Usuario no autenticado
```json
{
  "success": true,
  "authenticated": false,
  "user": null
}
```

### Error de autenticación
```json
{
  "success": false,
  "message": "Usuario no autenticado",
  "error": "Authentication required"
}
```

## Seguridad

- Las sesiones están configuradas con cookies seguras en producción
- Se utiliza Helmet.js para headers de seguridad
- CORS configurado apropiadamente
- Variables sensibles manejadas a través de variables de entorno

## Licencia

ISC