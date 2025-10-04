const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('./config/passport');
const config = require('./config/config');

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
    const allowedOrigins = [config.baseUrl];
    if (allowedOrigins.indexOf(origin) !== -1) {
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

// Configuración de sesiones
app.use(session(config.session));

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

// Rutas
app.use('/auth', authRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Servicio de autenticación OAuth con Google',
    version: '1.0.0',
    endpoints: {
      auth: {
        'GET /auth/google': 'Iniciar autenticación con Google',
        'GET /auth/google/callback': 'Callback de Google OAuth',
        'POST /auth/logout': 'Cerrar sesión',
        'GET /auth/logout': 'Cerrar sesión (GET)',
        'GET /auth/status': 'Verificar estado de autenticación',
        'GET /auth/success': 'Página de éxito',
        'GET /auth/failure': 'Página de fallo'
      }
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
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📝 Entorno: ${config.server.nodeEnv}`);
  console.log(`🔗 URL: ${config.baseUrl}`);
  console.log(`📚 Documentación de endpoints disponible en: ${config.baseUrl}/`);
  
  // Verificar configuración de Google OAuth
  if (!config.google.clientId || !config.google.clientSecret) {
    console.warn('⚠️  Advertencia: Configuración de Google OAuth incompleta. Verifica las variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en tu archivo .env');
  }
});

module.exports = app;