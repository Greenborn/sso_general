const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');

// Configuración de la estrategia de Google OAuth
passport.use(new GoogleStrategy({
  clientID: config.google.clientId,
  clientSecret: config.google.clientSecret,
  callbackURL: config.google.callbackUrl
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Aquí puedes agregar lógica para guardar o buscar el usuario en la base de datos
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      photo: profile.photos[0].value,
      provider: 'google',
      accessToken,
      refreshToken
    };
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialización del usuario para la sesión
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialización del usuario desde la sesión
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;