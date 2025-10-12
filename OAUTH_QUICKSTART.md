# 🔐 Sistema de Múltiples Credenciales OAuth - Guía Rápida

## ¿Qué es esto?

Este sistema permite que tu servicio SSO maneje **múltiples aplicaciones** con **diferentes credenciales OAuth** (Google, Facebook, etc.), cada una con sus propios `client_id` y `client_secret`.

## Configuración Rápida

### 1. Archivo de Credenciales

Crea/edita `oauth_credentials.json` en la raíz del proyecto:

```json
{
  "mi_app_1": {
    "google": {
      "client_id": "xxx-xxx.apps.googleusercontent.com",
      "client_secret": "GOCSPX-xxxxx"
    },
    "meta": {
      "app_id": "facebook_app_id",
      "app_secret": "facebook_secret"
    }
  },
  "mi_app_2": {
    "google": {
      "client_id": "yyy-yyy.apps.googleusercontent.com",
      "client_secret": "GOCSPX-yyyyy"
    }
  }
}
```

**Este archivo está en `.gitignore` - no se sube al repositorio**

### 2. Base de Datos

Cada app en `allowed_apps` necesita un `app_id`:

```sql
-- Agregar nueva app
INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, is_active) 
VALUES (
  'Mi Aplicación',
  'mi_app_1',  -- Este debe coincidir con el del JSON
  '["https://mi-app.com/#/login"]',
  1
);

-- Actualizar app existente
UPDATE allowed_apps SET app_id = 'mi_app_1' WHERE app_name = 'Mi Aplicación';
```

### 3. Variable de Entorno

En `.env`:

```bash
OAUTH_CREDENTIALS_PATH=./oauth_credentials.json
```

### 4. Reiniciar

```bash
npm restart
```

## ¿Cómo Funciona?

1. Cliente hace request a `/auth/google?url_redireccion_app=https://mi-app.com&unique_id=123`
2. SSO busca qué app tiene esa URL → encuentra `app_id: "mi_app_1"`
3. SSO carga credenciales de `oauth_credentials["mi_app_1"]["google"]`
4. SSO crea una estrategia OAuth específica con esas credenciales
5. Usuario se autentica con Google usando las credenciales de `mi_app_1`

## Scripts Útiles

```bash
# Ejecutar migración (agregar campo app_id)
npm run migrate:latest

# Generar app_id automáticamente para apps existentes
node scripts/update-app-ids.js

# Verificar credenciales cargadas
node -e "const c = require('./src/config/config'); console.log(c.getOAuthCredentials('mi_app_1', 'google'));"
```

## Agregar Nueva App

1. **Crear credenciales OAuth en Google Cloud Console**
   - URI de redirección: `https://tu-dominio.com/auth/google/callback`

2. **Agregar a la base de datos**
   ```sql
   INSERT INTO allowed_apps (app_name, app_id, allowed_redirect_urls, is_active) 
   VALUES ('Nueva App', 'nueva_app', '["https://nueva-app.com/#/login"]', 1);
   ```

3. **Agregar credenciales al JSON**
   ```json
   {
     "nueva_app": {
       "google": {
         "client_id": "nuevo_client_id",
         "client_secret": "nuevo_secret"
       }
     }
   }
   ```

4. **Reiniciar servidor**
   ```bash
   npm restart
   ```

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `OAUTH_CREDENTIALS_NOT_FOUND` | No hay credenciales para el app_id | Agregar al JSON |
| `APP_ID_NOT_FOUND` | La app no tiene app_id en BD | Ejecutar `UPDATE allowed_apps SET app_id='xxx'...` |
| `Archivo oauth_credentials.json no encontrado` | Archivo no existe | Crear el archivo |

## Documentación Completa

- **Guía detallada**: [OAUTH_MULTIPLE_CREDENTIALS.md](OAUTH_MULTIPLE_CREDENTIALS.md)
- **Resumen de implementación**: [IMPLEMENTATION_OAUTH_MULTI.md](IMPLEMENTATION_OAUTH_MULTI.md)
- **Documentación general**: [DOCUMENTATION.md](DOCUMENTATION.md)

---

**¿Necesitas ayuda?** Revisa los archivos de documentación o contacta al equipo de desarrollo.
