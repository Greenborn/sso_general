# ✅ Checklist de Verificación: Sistema de Múltiples Credenciales OAuth

## Pre-requisitos

- [ ] Node.js >= 22.0.0 instalado
- [ ] MariaDB >= 10.6 instalado y corriendo
- [ ] Cuenta de Google Cloud con OAuth 2.0 configurado

## Instalación Base

- [ ] Repositorio clonado
- [ ] `npm install` ejecutado sin errores
- [ ] Base de datos creada: `CREATE DATABASE sso_general`
- [ ] Usuario de BD creado con permisos

## Configuración de Archivos

### .env
- [ ] Archivo `.env` creado (desde `.env.example`)
- [ ] `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` configurados
- [ ] `OAUTH_CREDENTIALS_PATH=./oauth_credentials.json` agregado
- [ ] `SESSION_SECRET` generado (32+ caracteres)
- [ ] `JWT_SECRET` generado (32+ caracteres)
- [ ] `ENCRYPTION_KEY` generado (64 caracteres hex)
- [ ] `GOOGLE_CALLBACK_URL` configurado correctamente

### oauth_credentials.json
- [ ] Archivo `oauth_credentials.json` creado
- [ ] JSON válido (sin errores de sintaxis)
- [ ] Al menos una app configurada con credenciales de Google
- [ ] `client_id` y `client_secret` correctos
- [ ] Archivo **NO** está en el repositorio (verificar con `git status`)

### .gitignore
- [ ] Línea `oauth_credentials.json` presente
- [ ] Archivo `.env` en gitignore

## Migraciones y Base de Datos

- [ ] `npm run migrate:latest` ejecutado sin errores
- [ ] Tabla `users` existe
- [ ] Tabla `sessions` existe
- [ ] Tabla `allowed_apps` existe
- [ ] Tabla `audit_logs` existe
- [ ] Campo `app_id` agregado a `allowed_apps`

### Verificar tablas:
```bash
mysql -u sso_general -p sso_general -e "SHOW TABLES;"
```

Debe mostrar:
- `allowed_apps`
- `audit_logs`
- `sessions`
- `users`
- `knex_migrations`
- `knex_migrations_lock`

### Verificar columna app_id:
```bash
mysql -u sso_general -p sso_general -e "DESCRIBE allowed_apps;"
```

Debe incluir columna `app_id`.

## Aplicaciones Permitidas

- [ ] Al menos una app insertada en `allowed_apps`
- [ ] La app tiene `app_id` único
- [ ] La app tiene `allowed_redirect_urls` configuradas
- [ ] El `app_id` coincide con el del `oauth_credentials.json`
- [ ] La app está activa (`is_active = 1`)

### Verificar:
```bash
mysql -u sso_general -p sso_general -e "SELECT id, app_name, app_id, is_active FROM allowed_apps;"
```

## Credenciales OAuth

### Verificar que se cargan correctamente:
```bash
node -e "const config = require('./src/config/config'); console.log('Credenciales cargadas:', config.getOAuthCredentials('tu_app_id', 'google'));"
```

Debe mostrar:
```javascript
{
  client_id: 'xxx.apps.googleusercontent.com',
  client_secret: 'GOCSPX-xxx'
}
```

## Archivos del Sistema

### Archivos nuevos creados:
- [ ] `oauth_credentials.json` existe
- [ ] `src/config/passportDynamic.js` existe
- [ ] `src/database/migrations/20251012000006_add_app_id_to_allowed_apps.js` existe
- [ ] `scripts/update-app-ids.js` existe
- [ ] `OAUTH_MULTIPLE_CREDENTIALS.md` existe
- [ ] `OAUTH_QUICKSTART.md` existe
- [ ] `ROADMAP_FACEBOOK.md` existe

### Archivos modificados:
- [ ] `src/config/config.js` tiene función `getOAuthCredentials`
- [ ] `src/routes/auth.js` usa estrategias dinámicas
- [ ] `src/models/AllowedApp.js` tiene método `getAppIdByUrl`
- [ ] `.env` tiene `OAUTH_CREDENTIALS_PATH`
- [ ] `.gitignore` incluye `oauth_credentials.json`

## Compilación y Errores

- [ ] No hay errores de sintaxis en el código
- [ ] `node src/app.js` arranca sin errores
- [ ] Se muestra mensaje: "✅ Credenciales OAuth cargadas correctamente"

### Verificar errores:
```bash
npm run dev
```

Buscar en la salida:
- ✅ "✅ Credenciales OAuth cargadas correctamente"
- ✅ "🚀 Servidor escuchando en puerto 3455"
- ❌ NO debe haber errores de conexión a BD
- ❌ NO debe haber "Error cargando oauth_credentials.json"

## Google Cloud Console

- [ ] Proyecto de Google Cloud creado
- [ ] OAuth 2.0 Client ID creado
- [ ] URI de redirección configurada: `https://tu-dominio.com/auth/google/callback`
- [ ] Client ID y Client Secret copiados a `oauth_credentials.json`
- [ ] Google+ API o Google People API habilitada

## Testing Funcional

### Test 1: Servidor arranca
```bash
npm start
```
- [ ] Servidor arranca sin errores
- [ ] Puerto configurado está disponible
- [ ] Logs muestran "Credenciales OAuth cargadas"

### Test 2: Endpoint de salud
```bash
curl http://localhost:3455/health
```
- [ ] Responde con status 200
- [ ] JSON válido retornado

### Test 3: Inicio de autenticación
```bash
curl -I "http://localhost:3455/auth/google?url_redireccion_app=http://localhost:3001/%23/login&unique_id=test123"
```
- [ ] Responde con redirect 302
- [ ] Location header apunta a accounts.google.com
- [ ] No hay errores en los logs

### Test 4: Verificar credenciales por app
```bash
# Reemplazar 'tu_app_id' con el app_id real
node -e "const c = require('./src/config/config'); console.log(c.getOAuthCredentials('tu_app_id', 'google'));"
```
- [ ] Retorna objeto con client_id y client_secret
- [ ] Valores coinciden con los del JSON

### Test 5: Estrategia dinámica
Iniciar servidor y verificar logs al hacer un request a `/auth/google`:
- [ ] Log muestra "✅ Estrategia OAuth registrada: google-{app_id}"

## Seguridad

- [ ] Archivo `oauth_credentials.json` NO está en git
- [ ] Archivo `.env` NO está en git
- [ ] Credenciales en BD están encriptadas
- [ ] Rate limiting configurado
- [ ] Cookies secure en producción

### Verificar gitignore:
```bash
git status
```
- [ ] `oauth_credentials.json` NO aparece en cambios
- [ ] `.env` NO aparece en cambios

## Documentación

- [ ] README.md actualizado
- [ ] DOCUMENTATION.md referencia el nuevo sistema
- [ ] OAUTH_QUICKSTART.md es claro y completo
- [ ] OAUTH_MULTIPLE_CREDENTIALS.md tiene ejemplos funcionales
- [ ] ROADMAP_FACEBOOK.md está listo para seguir

## Scripts

### Script de actualización de app_ids:
```bash
node scripts/update-app-ids.js
```
- [ ] Se ejecuta sin errores
- [ ] Actualiza apps existentes sin app_id
- [ ] Genera app_id en formato snake_case

## Logs y Auditoría

- [ ] Tabla `audit_logs` recibe registros
- [ ] Logs incluyen `unique_id`
- [ ] Logs de autenticación se registran correctamente

### Verificar audit logs:
```bash
mysql -u sso_general -p sso_general -e "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```

## Performance

- [ ] Servidor responde en < 200ms en endpoints simples
- [ ] Credenciales se cargan una sola vez al inicio
- [ ] No hay memory leaks obvios

## Producción (si aplica)

- [ ] Variables de entorno de producción configuradas
- [ ] Base de datos de producción lista
- [ ] SSL/HTTPS configurado
- [ ] PM2 o similar para proceso
- [ ] Logs configurados (archivos o servicio)
- [ ] Backup de `oauth_credentials.json` en lugar seguro
- [ ] Monitoreo configurado

## Problemas Comunes

### ❌ "Error cargando oauth_credentials.json"
- Verificar que el archivo existe
- Verificar que el JSON es válido
- Verificar permisos del archivo

### ❌ "OAUTH_CREDENTIALS_NOT_FOUND"
- Verificar que el `app_id` en BD coincide con el del JSON
- Verificar que el proveedor está configurado (ej: "google")

### ❌ "APP_ID_NOT_FOUND"
- Ejecutar `node scripts/update-app-ids.js`
- O actualizar manualmente: `UPDATE allowed_apps SET app_id='xxx' WHERE id=1;`

### ❌ "Access denied for user 'root'@'localhost'"
- Usar credenciales correctas de `.env`
- Verificar que el usuario de BD existe y tiene permisos

## ✅ Checklist Final

Antes de considerar la implementación completa:

- [ ] Todos los checks anteriores están ✅
- [ ] Servidor arranca sin errores
- [ ] Se puede iniciar autenticación con Google
- [ ] Credenciales se cargan dinámicamente
- [ ] Documentación está completa
- [ ] `.gitignore` protege archivos sensibles
- [ ] Al menos 1 app funcionando end-to-end

---

## 🎉 Si todos los checks están ✅, la implementación está completa!

Fecha: 12 de octubre de 2025
