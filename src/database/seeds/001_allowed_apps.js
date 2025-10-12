/**
 * Seed: Datos iniciales de aplicaciones permitidas
 * Ejecutar después de las migraciones
 */
exports.seed = async function(knex) {
  // Eliminar registros existentes
  await knex('allowed_apps').del();
  
  // Insertar aplicaciones de ejemplo
  await knex('allowed_apps').insert([
    {
      app_name: 'MisMascotas',
      allowed_redirect_urls: JSON.stringify([
        'https://buscar.mismascotas.top',
        'https://buscar.mismascotas.top/auth/callback',
        'http://localhost:3001',
        'http://localhost:3001/auth/callback'
      ]),
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};
