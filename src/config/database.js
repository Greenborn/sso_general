const knex = require('knex');
const knexConfig = require('./knexfile');
const config = require('./config');

const environment = config.server.nodeEnv || 'development';
const connectionConfig = knexConfig[environment];

const db = knex(connectionConfig);

// Test de conexión
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Conexión a base de datos establecida');
  })
  .catch((err) => {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    if (environment === 'production') {
      process.exit(1);
    }
  });

module.exports = db;
