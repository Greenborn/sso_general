# 🚀 Guía de Instalación Rápida - SSO General

## ✅ Checklist de Instalación

### 1️⃣ Requisitos Previos

```bash
# Verificar Node.js
node --version  # Debe ser >= 22.0.0

# Verificar MariaDB
mysql --version  # Debe ser >= 10.6
```

### 2️⃣ Clonar e Instalar

```bash
git clone https://github.com/Greenborn/sso_general.git
cd sso_general
npm install
```

### 3️⃣ Generar Claves de Seguridad

```bash
node scripts/generate-keys.js
```

Copia los valores generados a tu `.env`.

### 4️⃣ Configurar Variables de Entorno

```bash
cp .env.example .env
nano .env  # o tu editor preferido
```

**Variables OBLIGATORIAS a configurar:**

```bash
# Base de datos
DB_HOST=localhost
DB_NAME=sso_general
DB_USER=root
DB_PASSWORD=TU_PASSWORD_AQUI

# Google OAuth (obtener de Google Cloud Console)
GOOGLE_CLIENT_ID=TU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET_AQUI
GOOGLE_CALLBACK_URL=https://auth.greenborn.com.ar/auth/google/callback

# Secrets (usar los generados en paso 3)
SESSION_SECRET=VALOR_GENERADO
JWT_SECRET=VALOR_GENERADO
ENCRYPTION_KEY=VALOR_GENERADO

# URL base
BASE_URL=https://auth.greenborn.com.ar
```

### 5️⃣ Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita "Google+ API" o "Google People API"
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth 2.0"
5. Configura:
   - **Tipo**: Aplicación web
   - **Orígenes autorizados**: 
     - `https://auth.greenborn.com.ar`
     - `http://localhost:3000` (para desarrollo)
   - **URIs de redirección autorizados**:
     - `https://auth.greenborn.com.ar/auth/google/callback`
     - `http://localhost:3000/auth/google/callback` (para desarrollo)
6. Copia el **Client ID** y **Client Secret** a tu `.env`

### 6️⃣ Crear Base de Datos

```bash
mysql -u root -p
```

```sql
CREATE DATABASE sso_general CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 7️⃣ Ejecutar Migraciones

```bash
npm run migrate:latest
```

Deberías ver:
```
✅ Batch 1 run: 4 migrations
✅ users
✅ sessions
✅ allowed_apps
✅ audit_logs
```

### 8️⃣ Agregar Aplicaciones Permitidas

**Opción A: Usando el script**

```bash
node scripts/add-allowed-app.js "MisMascotas" "https://buscar.mismascotas.top/#/login-redirect,http://localhost:3001/#/login-redirect"
```

**Opción B: Manualmente en MySQL**

```bash
mysql -u root -p sso_general
```

```sql
INSERT INTO allowed_apps (app_name, allowed_redirect_urls, is_active) VALUES
('MisMascotas', '["https://buscar.mismascotas.top/#/login-redirect", "http://localhost:3001/#/login-redirect"]', 1);

-- Para desarrollo local
INSERT INTO allowed_apps (app_name, allowed_redirect_urls, is_active) VALUES
('LocalDev', '["http://localhost:3001/#/callback", "http://localhost:3001/#/login-redirect"]', 1);
```

**Nota importante:** Las URLs pueden incluir fragmentos (`#`) y rutas completas. Por ejemplo:
- ✅ `http://localhost:3001/#/login-redirect`
- ✅ `https://app.com/#/auth/callback`
- ✅ `https://app.com/callback`

El sistema decodifica automáticamente URLs codificadas y valida que comiencen con `http://` o `https://`.

### 9️⃣ Iniciar Servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

Deberías ver:
```
🚀 Servidor SSO ejecutándose en puerto 3000
📝 Entorno: development
🔗 URL: https://auth.greenborn.com.ar
✅ Conexión a base de datos establecida
✅ Sistema de gestión de sesiones activado
```

### 🔟 Verificar Instalación

```bash
# Test de salud
curl http://localhost:3000/health

# Debería retornar:
# {"success":true,"status":"OK",...}
```

## 🎯 Configuración para Producción

### Con PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar servicio
pm2 start src/app.js --name sso-auth

# Guardar configuración
pm2 save

# Iniciar en boot
pm2 startup
```

### Con Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name auth.greenborn.com.ar;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name auth.greenborn.com.ar;

    ssl_certificate /etc/letsencrypt/live/auth.greenborn.com.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/auth.greenborn.com.ar/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d auth.greenborn.com.ar

# Renovación automática ya está configurada
```

## 📊 Tareas de Mantenimiento

### Limpieza de Sesiones Expiradas

```bash
# Ejecutar manualmente
node scripts/cleanup.js

# O configurar cron job
crontab -e

# Agregar: Ejecutar cada día a las 3 AM
0 3 * * * cd /ruta/a/sso_general && node scripts/cleanup.js >> /var/log/sso-cleanup.log 2>&1
```

### Backups de Base de Datos

```bash
# Backup manual
mysqldump -u root -p sso_general > backup_$(date +%Y%m%d).sql

# Cron job para backup diario
0 2 * * * mysqldump -u root -pPASSWORD sso_general > /backups/sso_$(date +\%Y\%m\%d).sql
```

## 🐛 Solución de Problemas Comunes

### Error: "Cannot connect to database"

```bash
# Verificar que MariaDB esté corriendo
sudo systemctl status mariadb

# Verificar credenciales en .env
# Verificar que el usuario tenga permisos
mysql -u root -p
GRANT ALL PRIVILEGES ON sso_general.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

### Error: "Google OAuth redirect_uri_mismatch"

- Verifica que `GOOGLE_CALLBACK_URL` en `.env` coincida EXACTAMENTE con la URL configurada en Google Cloud Console
- Incluye el protocolo (http:// o https://)
- No incluyas barra final (/)

### Error: "URL de redirección no autorizada"

```bash
# Agregar URL a la lista blanca (incluyendo fragmentos si es necesario)
node scripts/add-allowed-app.js "NombreApp" "https://tu-app.com/#/callback,http://localhost:3001/#/callback"
```

### Error: "El parámetro url_redireccion_app debe ser una URL válida"

**Causas comunes:**
- La URL no comienza con `http://` o `https://`
- La URL no está en la lista blanca de aplicaciones permitidas

**Soluciones:**
```bash
# 1. Verificar que la URL esté en la lista blanca
mysql -u root -p sso_general -e "SELECT * FROM allowed_apps WHERE is_active = 1;"

# 2. Agregar la URL si falta
node scripts/add-allowed-app.js "MiApp" "http://localhost:3001/#/login-redirect"

# 3. Verificar formato correcto (debe empezar con http:// o https://)
```

**Nota:** El sistema acepta URLs con fragmentos (`#`) y decodifica automáticamente URLs codificadas.

### Sesiones no persisten

- Verifica que `SESSION_SECRET` esté configurado en `.env`
- En producción, asegúrate de usar HTTPS

## 📚 Siguientes Pasos

1. ✅ Lee la [Documentación Completa](./DOCUMENTATION.md)
2. ✅ Revisa los [Ejemplos de Integración](./INTEGRATION_EXAMPLES.md)
3. ✅ Configura monitoreo y logs
4. ✅ Implementa backups automatizados
5. ✅ Configura alertas de seguridad

## 📞 Soporte

- Issues: https://github.com/Greenborn/sso_general/issues
- Documentación: [DOCUMENTATION.md](./DOCUMENTATION.md)
- Ejemplos: [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)

---

**¡Listo! Tu servicio SSO está configurado y funcionando.** 🎉
