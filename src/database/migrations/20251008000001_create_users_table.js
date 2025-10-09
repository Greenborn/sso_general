/**
 * Migración: Crear tabla de usuarios
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('google_id', 255).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('first_name', 255);
    table.string('last_name', 255);
    table.string('photo_url', 500);
    table.string('last_unique_id', 255).index();
    table.text('google_access_token'); // Encriptado
    table.text('google_refresh_token'); // Encriptado
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamps(true, true); // created_at, updated_at
    
    // Índices
    table.index('email');
    table.index('google_id');
    table.index('is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
