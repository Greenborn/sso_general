const express = require('express');
const passport = require('../config/passport');
const config = require('../config/config');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Ruta para iniciar la autenticación con Google
router.get('/google', 
  isNotAuthenticated,
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Callback de Google OAuth
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: config.redirect.failure 
  }),
  (req, res) => {
    // Autenticación exitosa
    res.redirect(config.redirect.success);
  }
);

// Ruta de logout
router.post('/logout', isAuthenticated, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión',
        error: err.message
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error al destruir la sesión',
          error: err.message
        });
      }
      
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    });
  });
});

// Ruta GET para logout (alternativa)
router.get('/logout', isAuthenticated, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión',
        error: err.message
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error al destruir la sesión',
          error: err.message
        });
      }
      
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

// Ruta para verificar el estado de autenticación
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }
});

// Ruta de éxito después de la autenticación
router.get('/success', isAuthenticated, (req, res) => {
  res.json({
    success: true,
    message: 'Autenticación exitosa',
    user: req.user
  });
});

// Ruta de fallo en la autenticación
router.get('/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Fallo en la autenticación con Google',
    error: 'Authentication failed'
  });
});

module.exports = router;