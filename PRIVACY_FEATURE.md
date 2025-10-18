# Funcionalidad de Privacidad en Allowed Apps

## Descripción

La funcionalidad de privacidad permite controlar qué información del usuario se devuelve a cada aplicación cliente. Esto se configura en la tabla `allowed_apps` mediante el campo `privacy`.

## Campo Privacy

El campo `privacy` es de tipo **string** con un máximo de **32 caracteres** y es **nullable** (opcional).

### Valores Soportados

#### 1. `"id_only"` - Solo ID del Usuario
Cuando el campo `privacy` está establecido a `"id_only"`, la API solo devuelve el `id` del usuario, ocultando toda la información personal.

**Respuesta en `/auth/login`:**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "bearer_token": "eyJhbGciOiJIUzI1NiI...",
    "expires_at": "2025-10-18T20:30:00.000Z",
    "user": {
      "id": 123
    }
  }
}
```

**Respuesta en `/auth/verify`:**
```json
{
  "success": true,
  "message": "Token válido",
  "data": {
    "valid": true,
    "extended": true,
    "expires_at": "2025-10-18T20:30:00.000Z",
    "user": {
      "id": 123
    }
  }
}
```

#### 2. `null` o vacío - Información Completa (default)
Cuando el campo `privacy` es `null` o vacío, se devuelve toda la información del usuario disponible.

**Respuesta:**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "bearer_token": "eyJhbGciOiJIUzI1NiI...",
    "expires_at": "2025-10-18T20:30:00.000Z",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "photo": "https://lh3.googleusercontent.com/...",
      "profile_img_base64": "iVBORw0KGgoAAAANS..." // Solo si full_info=true
    }
  }
}
```

## Endpoints Afectados

### 1. POST `/auth/login`
Devuelve información del usuario según el setting de privacidad de la app.

### 2. GET `/auth/verify?unique_id={id}`
Verifica el token y devuelve información del usuario según el setting de privacidad.

## Implementación

### En el Servicio (authService.js)

El método `buildUserData()` es responsable de construir los datos del usuario:

```javascript
static async buildUserData(user, profileImgBase64, appId) {
  // Si no hay appId, devolver todos los datos
  if (!appId) {
    return { id: user.id, email: user.email, ... };
  }

  // Obtener la app permitida
  const app = await AllowedApp.findById(appId);

  // Si privacy = "id_only", solo devolver el id
  if (app && app.privacy === 'id_only') {
    return { id: user.id };
  }

  // Por defecto, devolver todos los datos
  return { id: user.id, email: user.email, ... };
}
```

### En las Rutas (routes/auth.js)

Los endpoints `/auth/login` y `/auth/verify` utilizan automáticamente esta función para aplicar las restricciones de privacidad.

## Base de Datos

### Migración Aplicada
```sql
ALTER TABLE allowed_apps ADD COLUMN privacy VARCHAR(32) NULL;
```

### Ejemplo de Datos
```sql
INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, privacy, is_active)
VALUES 
  ('App Restringida', 'app_001', '["https://app1.com/callback"]', 'id_only', 1),
  ('App Completa', 'app_002', '["https://app2.com/callback"]', NULL, 1);
```

## Cómo Usar

### 1. Crear una app con privacidad restringida:

```bash
curl -X POST http://localhost:3000/admin/apps \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Mi App Restringida",
    "app_id": "my_app_001",
    "allowed_redirect_urls": ["https://myapp.com/callback"],
    "privacy": "id_only"
  }'
```

### 2. Actualizar la privacidad de una app existente:

```bash
curl -X PATCH http://localhost:3000/admin/apps/1 \
  -H "Content-Type: application/json" \
  -d '{
    "privacy": "id_only"
  }'
```

### 3. Ver configuración actual:

```bash
curl -X GET http://localhost:3000/admin/apps/1
```

## Consideraciones de Seguridad

1. **Privacy = "id_only"**: Limita la información expuesta a aplicaciones no confiables.
2. **Validación**: El campo `privacy` se valida contra valores permitidos.
3. **Fallback Seguro**: Si ocurre un error, solo se devuelve el `id` por seguridad.
4. **Log de Auditoría**: Todos los accesos se registran incluyendo el nivel de privacidad utilizado.

## Extensiones Futuras

Se pueden agregar más valores de privacidad en el futuro:

- `"id_name"` - Solo ID y nombre
- `"id_email"` - Solo ID y email
- `"minimal"` - Información mínima
- `"full"` - Información completa
- `"custom"` - Privacidad personalizada por campo

## Contacto y Soporte

Para cambios en los niveles de privacidad o nuevas funcionalidades, contactar al equipo de SSO.
