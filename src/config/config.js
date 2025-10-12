require('dotenv').config();

// Validación de variables requeridas en producción
if (process.env.NODE_ENV === 'production') {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SESSION_SECRET',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ Variables de entorno requeridas faltantes:', missing.join(', '));
    process.exit(1);
  }
}

// --- OAuth Credentials Loader ---
const fs = require('fs');
const path = require('path');

// Ruta al archivo de credenciales OAuth
const OAUTH_CREDENTIALS_PATH = process.env.OAUTH_CREDENTIALS_PATH || './oauth_credentials.json';

// Cargar credenciales OAuth
let oauthCredentials = {};
try {
  const credentialsPath = path.resolve(OAUTH_CREDENTIALS_PATH);
  if (fs.existsSync(credentialsPath)) {
    oauthCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('✅ Credenciales OAuth cargadas correctamente');
  } else {
    console.warn('⚠️ Archivo oauth_credentials.json no encontrado');
  }
} catch (err) {
  console.error('❌ Error cargando oauth_credentials.json:', err);
}

/**
 * Obtiene las credenciales OAuth para una app y proveedor
 * @param {string} idApp - ID de la app (ej: busquedas_pet_app)
 * @param {string} provider - Proveedor (ej: google, meta)
 * @returns {object|null} Credenciales o null si no existen
 */
function getOAuthCredentials(idApp, provider) {
  if (
    oauthCredentials[idApp] &&
    oauthCredentials[idApp][provider]
  ) {
    return oauthCredentials[idApp][provider];
  }
  return null;
}

// Configuración principal
const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'sso_general',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-key',
    algorithm: process.env.JWT_ALGORITHM || 'HS256'
  },
  
  tokens: {
    temporalExpiry: parseInt(process.env.TEMPORAL_TOKEN_EXPIRY) || 600, // 10 minutos
    bearerExpiry: parseInt(process.env.BEARER_TOKEN_EXPIRY) || 86400, // 24 horas
    renewalThreshold: parseInt(process.env.TOKEN_RENEWAL_THRESHOLD) || 3600 // 1 hora
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  redirect: {
    success: process.env.SUCCESS_REDIRECT_URL || '/auth/success',
    failure: process.env.FAILURE_REDIRECT_URL || '/auth/failure'
  },
  
  baseUrl: process.env.BASE_URL || 'http://localhost:3000'
};

module.exports = config;
module.exports.getOAuthCredentials = getOAuthCredentials;