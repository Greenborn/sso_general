# Servicio de Autenticación OAuth con Google

Servicio Node.js con Express para manejar autenticación OAuth de Google.

## Requisitos

- Node.js >= 22.0.0
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd sso_general
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar el archivo `.env` con tus credenciales de Google OAuth:
```env
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
SESSION_SECRET=tu_clave_secreta_super_segura
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
- **POST** `/auth/logout` - Cerrar sesión
- **GET** `/auth/logout` - Cerrar sesión (alternativa GET)
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
5. Si falla, el usuario es redirigido a `/auth/failure`

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