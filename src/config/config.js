require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
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
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  },
  
  redirect: {
    success: process.env.SUCCESS_REDIRECT_URL || '/auth/success',
    failure: process.env.FAILURE_REDIRECT_URL || '/auth/failure'
  },
  
  baseUrl: process.env.BASE_URL || 'http://localhost:3000'
};