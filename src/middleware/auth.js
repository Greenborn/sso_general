const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: 'Usuario no autenticado',
    error: 'Authentication required'
  });
};

const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.status(400).json({
    success: false,
    message: 'Usuario ya autenticado',
    user: req.user
  });
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated
};