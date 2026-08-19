const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const MySQLStore = require('express-mysql-session')(session);
const { passport } = require('./config/passportDynamic');
const config = require('./config/config');

// Importar base de datos (inicializa conexión)
require('./config/database');

// Handlers globales para evitar que Node mate el proceso ante errores no capturados.
// Un crash del proceso provoca ventanas de error 502 (Nginx no tiene upstream).
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection (el proceso continúa):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception (el proceso continúa):', err);
});

// Importar middlewares
const { generalLimiter } = require('./middleware/rateLimiter');

// Importar rutas
const authRoutes = require('./routes/auth');

const app = express();

// Middlewares de seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (ej: aplicaciones móviles)
    if (!origin) return callback(null, true);
    
    // En desarrollo, permitir cualquier origen
    if (config.server.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // En producción, configurar los orígenes permitidos
    let allowedOrigins = [];
    if (Array.isArray(config.baseUrl)) {
      allowedOrigins = config.baseUrl;
    } else if (typeof config.baseUrl === 'string') {
      allowedOrigins = config.baseUrl.split(',').map(o => o.trim());
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

// Logging
if (config.server.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones (store persistente en MariaDB para evitar el MemoryStore)
const sessionStore = new MySQLStore({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  createDatabaseTable: true,
  schema: { tableName: 'sessions' },
  expiration: 24 * 60 * 60 * 1000,
  checkExpirationInterval: 15 * 60 * 1000
});
app.use(session({ ...config.session, store: sessionStore }));

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting (aplicar después de las sesiones)
if (config.server.nodeEnv !== 'development' || process.env.ENABLE_RATE_LIMIT === 'true') {
  app.use(generalLimiter);
}

// Middleware temporal para depuración de sesión
app.use((req, res, next) => {
  //console.log('Contenido de la sesión:', req.session);
  next();
});

// Rutas
app.use('/auth', authRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Servicio de autenticación SSO con Google OAuth',
    version: '2.0.0',
    endpoints: {
      authentication: {
        'GET /auth/google?url_redireccion_app={url}&unique_id={id}': 'Iniciar autenticación con Google',
        'GET /auth/google/callback': 'Callback de Google OAuth (uso interno)',
        'POST /auth/login': 'Login con token temporal (Body: { token })',
        'GET /auth/verify': 'Verificar y extender bearer token (Header: Authorization: Bearer {token})',
        'POST /auth/renew': 'Renovar bearer token expirado (Header: Authorization: Bearer {token}, Body: { unique_id })',
        'POST /auth/logout': 'Cerrar sesión (Header: Authorization: Bearer {token})',
        'GET /auth/sessions': 'Listar sesiones activas (Header: Authorization: Bearer {token})',
        'GET /auth/status': 'Verificar estado de autenticación (opcional bearer token)'
      },
      legacy: {
        'GET /auth/success': 'Página informativa de éxito',
        'GET /auth/failure': 'Página informativa de fallo'
      }
    },
    documentation: {
      flow: [
        '1. App cliente llama: GET /auth/google?url_redireccion_app={url}&unique_id={id}',
        '2. Usuario se autentica con Google',
        '3. Sistema redirige a: {url_redireccion_app}?token={temporal_token}&unique_id={id}',
        '4. App cliente llama: POST /auth/login con { token: temporal_token }',
        '5. Sistema retorna: { bearer_token, expires_at, user }',
        '6. App usa bearer_token en header: Authorization: Bearer {token}',
        '7. Para verificar/extender token: GET /auth/verify',
        '8. Para cerrar sesión: POST /auth/logout'
      ]
    }
  });
});

// Ruta para verificar salud del servicio
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    error: 'Not Found'
  });
});

// Manejo de errores globales
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    error: config.server.nodeEnv === 'development' ? error.stack : 'Internal Server Error'
  });
});

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`🚀 Servidor SSO ejecutándose en puerto ${PORT}`);
  console.log(`📝 Entorno: ${config.server.nodeEnv}`);
  console.log(`🔗 URL: ${config.baseUrl}`);
  console.log(`📚 Documentación de endpoints disponible en: ${config.baseUrl}/`);
  
  // Verificar configuración de Google OAuth
  if (!config.google.clientId || !config.google.clientSecret) {
    console.warn('⚠️  Advertencia: Configuración de Google OAuth incompleta');
    console.warn('    Verifica GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env');
  }
  
  // Verificar configuración de JWT
  if (!config.jwt.secret || config.jwt.secret === 'default-jwt-secret-key') {
    console.warn('⚠️  Advertencia: JWT_SECRET no configurado o usando valor por defecto');
    console.warn('    Configura JWT_SECRET en .env para producción');
  }
  
  // Verificar configuración de encriptación
  if (!config.encryption.key || config.encryption.key.length < 64) {
    console.warn('⚠️  Advertencia: ENCRYPTION_KEY no configurado correctamente');
    console.warn('    Configura ENCRYPTION_KEY (64 caracteres hex) en .env');
  }
  
  console.log('✅ Sistema de gestión de sesiones activado');
  console.log('✅ Base de datos MariaDB configurada');
  console.log('✅ Sistema de tokens JWT implementado');
  console.log('✅ Auditoría de logs habilitada');
});

module.exports = app;