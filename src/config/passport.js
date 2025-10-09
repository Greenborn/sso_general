const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');

// Configuración de la estrategia de Google OAuth
passport.use(new GoogleStrategy({
  clientID: config.google.clientId,
  clientSecret: config.google.clientSecret,
  callbackURL: config.google.callbackUrl,
  accessType: 'offline', // Para obtener refresh token
  prompt: 'select_account' // Permitir seleccionar cuenta
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
      accessToken,
      refreshToken,
      profile // Guardar perfil completo
    };
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialización del usuario para la sesión
// Solo guardamos datos mínimos en la sesión
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialización del usuario desde la sesión
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;