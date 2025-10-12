/**
 * Migración: Crear tabla de aplicaciones permitidas
 */
exports.up = function(knex) {
  return knex.schema.createTable('allowed_apps', function(table) {
    table.increments('id').primary();
    table.string('app_name', 255).notNullable().unique();
    table.text('allowed_redirect_urls').notNullable(); // JSON array
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true); // created_at, updated_at
    
    // Índices
    table.index('app_name');
    table.index('is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('allowed_apps');
};
