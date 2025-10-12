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

## Configuración de credenciales OAuth

Las credenciales de cada aplicación y proveedor se configuran en el archivo `oauth_credentials.json` (excluido del repositorio por seguridad).

Referencia en `.env`:
```bash
OAUTH_CREDENTIALS_PATH=./oauth_credentials.json
```

Ejemplo de `oauth_credentials.json`:
```json
{
  "busquedas_pet_app": {
    "google": {
      "client_id": "<client_id>",
      "client_secret": "<client_secret>"
    }
  }
}
```

> **Importante:** No compartas ni subas este archivo al repositorio. Está incluido en `.gitignore` por defecto.

La aplicación selecciona las credenciales según el `id_app` (por ejemplo, el valor de `busquedas_pet_app` en la tabla `allowed_apps`) y el proveedor (`google`, `meta`, etc).

# Google OAuth (legacy, solo si se requiere una credencial global)
# GOOGLE_CLIENT_ID=tu_client_id
# GOOGLE_CLIENT_SECRET=tu_client_secret
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
<<<<<<< HEAD
INSERT INTO allowed_apps (app_name, allowed_redirect_urls, is_active) VALUES
('MisMascotas', '["https://buscar.mismascotas.top/#/login-redirect", "http://localhost:3001/#/login-redirect"]', 1);
```

**Nota:** Las URLs pueden incluir fragmentos (`#`) y rutas completas. El sistema decodifica automáticamente URLs codificadas y valida que comiencen con `http://` o `https://`.
=======
INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, is_active) VALUES
('MisMascotas', 'busquedas_pet_app', '["https://buscar.mismascotas.top/#/login-redirect", "http://localhost:3001/#/login-redirect"]', 1);
```

**Importante:** 
- Cada app debe tener un `app_id` único que se usa para cargar las credenciales OAuth desde `oauth_credentials.json`
- Las URLs pueden incluir fragmentos (`#`) y rutas completas
- El sistema decodifica automáticamente URLs codificadas y valida que comiencen con `http://` o `https://`

**Configurar Credenciales OAuth:**

Edita el archivo `oauth_credentials.json` (referenciado en `.env` con `OAUTH_CREDENTIALS_PATH`):

```json
{
  "busquedas_pet_app": {
    "google": {
      "client_id": "tu_client_id.apps.googleusercontent.com",
      "client_secret": "GOCSPX-tu_client_secret"
    }
  }
}
```

Este archivo permite configurar múltiples credenciales OAuth para diferentes apps y proveedores. Ver [OAUTH_MULTIPLE_CREDENTIALS.md](OAUTH_MULTIPLE_CREDENTIALS.md) para más detalles.
>>>>>>> multi_credencial

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
App Cliente            SSO Service                Google OAuth           MariaDB
     │                      │                           │                    │
     │ 1. GET /auth/google? │                           │                    │
     │    params            │                           │                    │
     ├─────────────────────>│                           │                    │
     │                      │ 2. Redirect               │                    │
     │                      ├──────────────────────────>│                    │
     │                      │                           │                    │
     │                      │ 3. User Login             │                    │
     │                      │<──────────────────────────┤                    │
     │                      │                           │                    │
     │                      │ 4. Callback: Save User    │                    │
     │                      ├───────────────────────────────────────────────>│
     │                      │                           │                    │
     │                      │ 5. Redirect /auth/success │                    │
     │                      │    (SUCCESS_REDIRECT_URL) │                    │
     │                      │                           │                    │
     │ 6. Redirect + token  │                           │                    │
     │<─────────────────────┤                           │                    │
     │                      │                           │                    │
     │ 7. POST /auth/login  │                           │                    │
     ├─────────────────────>│                           │                    │
     │                      │ 8. Create Session         │                    │
     │                      ├───────────────────────────────────────────────>│
     │ 9. bearer_token      │                           │                    │
     │<─────────────────────┤                           │                    │
```

### Pasos Detallados

1. **Iniciar autenticación**: App redirige a:
  ```
  GET https://auth.greenborn.com.ar/auth/google?url_redireccion_app=https%3A%2F%2Fbuscar.mismascotas.top&unique_id=abc123
  # (Recomendado: codificar la URL con encodeURIComponent)
  ```

2. **Usuario se autentica con Google**

3. **SSO procesa el callback de Google**:
   - Crea o actualiza el usuario en la base de datos
   - Genera un token temporal (válido por 10 minutos)
   - Guarda los datos en la sesión
   - Redirige a `SUCCESS_REDIRECT_URL` (endpoint del servicio SSO: `/auth/success`)

4. **SSO redirige a la app con token temporal**:
   ```
   https://buscar.mismascotas.top?token=eyJhbGc...&unique_id=abc123
   ```

5. **App obtiene bearer token**:
   ```bash
   POST https://auth.greenborn.com.ar/auth/login
   Content-Type: application/json
   
   { "token": "eyJhbGc..." }
   ```

6. **SSO retorna bearer token**:
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

7. **App usa bearer token** en cada petición:
   ```
   Authorization: Bearer eyJhbGc...
   ```

> **Nota importante**: La interacción con Google OAuth ocurre completamente dentro del servicio SSO. El usuario nunca sale del dominio `auth.greenborn.com.ar` hasta que se completa la autenticación y se genera el token temporal. Luego, el servicio redirige a la URL de la app cliente especificada en `url_redireccion_app`.

## 🔌 API Endpoints

### `GET /auth/google`

Inicia el proceso de autenticación con Google.

**Query Parameters:**
- `url_redireccion_app` (required): URL de redirección (puede ser codificada o sin codificar, se decodifica automáticamente)
- `unique_id` (required): ID único para trazabilidad

**Validaciones:**
- `url_redireccion_app` debe comenzar con `http://` o `https://`
- `url_redireccion_app` debe estar en la lista blanca de URLs permitidas
- `unique_id` debe ser una cadena de 1-255 caracteres
- Acepta URLs con fragmentos (ej: `http://localhost:3001/#/login-redirect`)

**Ejemplo:**
```bash
# Con URL codificada (recomendado)
https://auth.greenborn.com.ar/auth/google?url_redireccion_app=http%3A%2F%2Flocalhost%3A3001%2F%23%2Flogin-redirect&unique_id=req_12345

# Con URL sin codificar (también soportado)
https://auth.greenborn.com.ar/auth/google?url_redireccion_app=http://localhost:3001/#/login-redirect&unique_id=req_12345
```

**Flujo:**
1. Decodifica automáticamente el parámetro `url_redireccion_app` si está codificado
2. Valida que la URL comience con `http://` o `https://`
3. Verifica que la URL esté en la lista blanca de aplicaciones permitidas
4. Guarda los datos en la sesión del servidor
5. Redirige al usuario a Google para autenticación
6. Google redirige a `/auth/google/callback` (interno del SSO)
7. SSO procesa la autenticación y redirige a `/auth/success` (SUCCESS_REDIRECT_URL)
8. `/auth/success` redirige finalmente a `url_redireccion_app` con el token temporal

---

### `GET /auth/success`

Endpoint intermedio del servicio SSO (definido en SUCCESS_REDIRECT_URL).

**Descripción:**
- Recibe el control después de que Google autentica al usuario
- Obtiene los datos de la sesión (token temporal, URL de redirección, unique_id)
- Construye la URL final con los parámetros
- Redirige a la aplicación cliente

**Nota:** Este endpoint es parte del flujo interno del SSO. Las aplicaciones cliente no lo llaman directamente.

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

Verifica bearer token y extiende duración si hay sesión Google activa. Ahora requiere también el parámetro `unique_id` como query param para mayor seguridad y trazabilidad. Si se especifica el parámetro `full_info=true`, la respuesta incluirá la imagen de perfil en base64 (`profile_img_base64`).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Params:**
```
unique_id=req_12345
full_info=true   # Opcional, retorna imagen de perfil en base64 si está presente
```

**Response (éxito):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "extended": true,
    "expires_at": "2025-10-09T12:00:00.000Z",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "photo": "https://...",
      "profile_img_base64": "iVBORw0KGgoAAAANS..." // Solo si full_info=true
    }
  }
}
```

**Response (unique_id incorrecto):**
```json
{
  "success": false,
  "message": "unique_id no coincide con la sesión",
  "error": "UNIQUE_ID_MISMATCH"
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

**Query Params:**
```
unique_id=req_12345
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

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

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

---

### `GET /auth/failure`

Endpoint de error (definido en FAILURE_REDIRECT_URL).

**Query Parameters:**
- `error`: Código del error ocurrido

**Response:**
```json
{
  "success": false,
  "message": "Fallo en la autenticación con Google",
  "error": "AUTH_ERROR"
}
```

**Códigos de error comunes:**
- `MISSING_PARAMS`: Faltan parámetros en la sesión
- `AUTH_ERROR`: Error general de autenticación
- `UNAUTHORIZED_REDIRECT_URL`: URL no autorizada
- `INVALID_UNIQUE_ID`: ID único inválido

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
('MiApp', '["https://mi-app.com/#/callback", "http://localhost:3001/#/callback"]', 1);
```

**Nota:** Asegúrate de incluir la URL completa con el fragmento (`#`) si tu aplicación lo utiliza.

### "El parámetro url_redireccion_app debe ser una URL válida"

Este error ocurre cuando:
1. La URL no comienza con `http://` o `https://`
2. La URL no está en la lista blanca de aplicaciones permitidas

**Soluciones:**
- Verifica que la URL comience con el protocolo correcto
- Asegúrate de que la URL esté registrada en la tabla `allowed_apps`
- Las URLs pueden estar codificadas o sin codificar (se decodifican automáticamente)
- Las URLs pueden incluir fragmentos: `http://localhost:3001/#/login-redirect`

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
