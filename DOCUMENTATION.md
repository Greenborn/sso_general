# 🔐 SSO General - Servicio de Autenticación con Google OAuth

Sistema de Single Sign-On (SSO) completo con gestión de sesiones, tokens JWT y base de datos MariaDB.

## 📋 Características

- ✅ Autenticación OAuth 2.0 con Google
- ✅ Sistema de tokens de dos niveles (temporal + bearer)
- ✅ Gestión de sesiones en base de datos MariaDB
- ✅ Encriptación de tokens sensibles
- ✅ Lista blanca de URLs de redirección
- ✅ Logs de auditoría completos
- ✅ Trazabilidad con unique_id
- ✅ Extensión automática de tokens con sesión Google activa
- ✅ Revocación de tokens de Google al logout
- ✅ Rate limiting para prevenir abuso
- ✅ API RESTful con respuestas JSON

## 🚀 Instalación

### Requisitos Previos

- Node.js >= 22.0.0
- MariaDB >= 10.6
- Cuenta de Google Cloud con OAuth 2.0 configurado

### 1. Clonar el repositorio

```bash
git clone https://github.com/Greenborn/sso_general.git
cd sso_general
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```bash
# Base de datos
DB_HOST=localhost
DB_NAME=sso_general
DB_USER=root
DB_PASSWORD=tu_password

# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=https://auth.greenborn.com.ar/auth/google/callback

# Secrets (generar valores únicos)
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### 4. Crear base de datos

```bash
mysql -u root -p
```

```sql
CREATE DATABASE sso_general CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Ejecutar migraciones

```bash
npm run migrate:latest
```

### 6. Insertar aplicaciones permitidas

Insertar en la tabla `allowed_apps`:

```sql
INSERT INTO allowed_apps (app_name, allowed_redirect_urls, is_active) VALUES
('MisMascotas', '["https://buscar.mismascotas.top", "https://buscar.mismascotas.top/auth/callback"]', 1);
```

### 7. Iniciar servidor

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📚 Flujo de Autenticación

### Diagrama del Flujo

```
App Cliente                SSO Service              Google OAuth           MariaDB
     │                          │                         │                    │
     │ 1. GET /auth/google?     │                         │                    │
     │    params                │                         │                    │
     ├─────────────────────────>│                         │                    │
     │                          │ 2. Redirect             │                    │
     │                          ├────────────────────────>│                    │
     │                          │                         │                    │
     │                          │ 3. User Login           │                    │
     │                          │<────────────────────────┤                    │
     │                          │                         │                    │
     │                          │ 4. Save User            │                    │
     │                          ├────────────────────────────────────────────>│
     │ 5. Redirect + token      │                         │                    │
     │<─────────────────────────┤                         │                    │
     │                          │                         │                    │
     │ 6. POST /auth/login      │                         │                    │
     ├─────────────────────────>│                         │                    │
     │                          │ 7. Create Session       │                    │
     │                          ├────────────────────────────────────────────>│
     │ 8. bearer_token          │                         │                    │
     │<─────────────────────────┤                         │                    │
```

### Pasos Detallados

1. **Iniciar autenticación**: App redirige a:
   ```
   GET https://auth.greenborn.com.ar/auth/google?url_redireccion_app=https://tu-app.com/callback&unique_id=abc123
   ```

2. **Usuario se autentica con Google**

3. **SSO redirige con token temporal**:
   ```
   https://tu-app.com/callback?token=eyJhbGc...&unique_id=abc123
   ```

4. **App obtiene bearer token**:
   ```bash
   POST https://auth.greenborn.com.ar/auth/login
   Content-Type: application/json
   
   { "token": "eyJhbGc..." }
   ```

5. **SSO retorna bearer token**:
   ```json
   {
     "success": true,
     "data": {
       "bearer_token": "eyJhbGc...",
       "expires_at": "2025-10-09T12:00:00Z",
       "user": { ... }
     }
   }
   ```

6. **App usa bearer token** en cada petición:
   ```
   Authorization: Bearer eyJhbGc...
   ```

## 🔌 API Endpoints

### `GET /auth/google`

Inicia el proceso de autenticación con Google.

**Query Parameters:**
- `url_redireccion_app` (required): URL de redirección
- `unique_id` (required): ID único para trazabilidad

**Ejemplo:**
```bash
https://auth.greenborn.com.ar/auth/google?url_redireccion_app=https://app.com/callback&unique_id=req_12345
```

---

### `POST /auth/login`

Autentica con token temporal y genera bearer token.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bearer_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-10-09T12:00:00.000Z",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "photo": "https://..."
    }
  }
}
```

---

### `GET /auth/verify`

Verifica bearer token y extiende duración si hay sesión Google activa.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (éxito):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "extended": true,
    "expires_at": "2025-10-09T12:00:00.000Z",
    "user": { ... }
  }
}
```

**Response (sesión Google expirada):**
```json
{
  "success": false,
  "error": "GOOGLE_SESSION_EXPIRED",
  "require_reauth": true
}
```

---

### `POST /auth/logout`

Cierra sesión y revoca tokens de Google.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

---

### `GET /auth/sessions`

Lista sesiones activas del usuario.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 1,
        "unique_id": "req_12345",
        "ip_address": "192.168.1.100",
        "expires_at": "2025-10-09T12:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

## 🗄️ Estructura de Base de Datos

### Tabla `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK | ID único |
| google_id | VARCHAR(255) | ID de Google |
| email | VARCHAR(255) | Email (unique) |
| name | VARCHAR(255) | Nombre completo |
| last_unique_id | VARCHAR(255) | Último unique_id |
| google_access_token | TEXT | Token encriptado |
| is_active | BOOLEAN | Usuario activo |

### Tabla `sessions`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK | ID único |
| user_id | INT FK | ID del usuario |
| bearer_token_hash | VARCHAR(64) | Hash del token |
| unique_id | VARCHAR(255) | Trazabilidad |
| expires_at | TIMESTAMP | Expiración |
| revoked | BOOLEAN | Revocada |

### Tabla `allowed_apps`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK | ID único |
| app_name | VARCHAR(255) | Nombre app |
| allowed_redirect_urls | TEXT | JSON URLs permitidas |
| is_active | BOOLEAN | Activa |

### Tabla `audit_logs`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK | ID único |
| user_id | INT FK | Usuario |
| action | VARCHAR(50) | Acción |
| unique_id | VARCHAR(255) | Trazabilidad |
| success | BOOLEAN | Éxito |
| details | TEXT | JSON detalles |

## 🔧 Comandos

```bash
# Desarrollo con hot-reload
npm run dev

# Producción
npm start

# Migraciones
npm run migrate:latest      # Ejecutar migraciones
npm run migrate:rollback    # Revertir última migración
npm run migrate:make nombre # Crear nueva migración
```

## 🔒 Seguridad

- **Tokens encriptados**: AES-256-CBC
- **Rate limiting**: 100 req/15min (general), 10 req/15min (auth)
- **Lista blanca**: URLs validadas en BD
- **Cookies seguras**: httpOnly, secure, sameSite

## 📊 Logs de Auditoría

Acciones registradas:
- `LOGIN`: Inicio de sesión
- `LOGOUT`: Cierre de sesión
- `AUTHORIZE`: Verificación de token
- `TOKEN_EXTENDED`: Extensión de token
- `AUTH_ERROR`: Errores

## 🐛 Troubleshooting

### "URL de redirección no autorizada"

Agregar URL a `allowed_apps`:
```sql
INSERT INTO allowed_apps (app_name, allowed_redirect_urls, is_active) VALUES
('MiApp', '["https://mi-app.com"]', 1);
```

### "Sesión de Google expirada"

Usuario debe re-autenticarse. Redirigir a `/auth/google`.

### Error conexión BD

Verificar `.env` y que MariaDB esté activo:
```bash
systemctl status mariadb
```

## 📝 Licencia

ISC

## 👥 Autor

Greenborn

---

**🌟 Sistema SSO completo y listo para producción**
