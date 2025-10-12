const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');

// Mapa de estrategias registradas
const registeredStrategies = new Map();

/**
 * Registra una estrategia de Google OAuth para una app específica
 * @param {string} appId - ID de la app
 * @param {object} credentials - Credenciales (client_id, client_secret)
 */
function registerGoogleStrategy(appId, credentials) {
  const strategyName = `google-${appId}`;
  
  // Si ya existe, no la registramos de nuevo
  if (registeredStrategies.has(strategyName)) {
    return strategyName;
  }

  const strategy = new GoogleStrategy({
    clientID: credentials.client_id,
    clientSecret: credentials.client_secret,
    callbackURL: config.google.callbackUrl,
    accessType: 'offline',
    prompt: 'select_account'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Crear objeto de usuario temporal para la sesión
      const user = {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        photo: profile.photos[0].value,
        provider: 'google',
        appId: appId, // Agregar app_id al usuario
        accessToken,
        refreshToken,
        profile
      };
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  });

  passport.use(strategyName, strategy);
  registeredStrategies.set(strategyName, true);
  
  console.log(`✅ Estrategia OAuth registrada: ${strategyName}`);
  return strategyName;
}

/**
 * Obtiene el nombre de la estrategia para una app
 * @param {string} appId - ID de la app
 * @returns {string} Nombre de la estrategia
 */
function getStrategyName(appId) {
  return `google-${appId}`;
}

/**
 * Verifica si una estrategia está registrada
 * @param {string} appId - ID de la app
 * @returns {boolean}
 */
function isStrategyRegistered(appId) {
  return registeredStrategies.has(getStrategyName(appId));
}

// Serialización del usuario para la sesión
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialización del usuario desde la sesión
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = {
  passport,
  registerGoogleStrategy,
  getStrategyName,
  isStrategyRegistered
};
