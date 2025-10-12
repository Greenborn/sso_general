/**
 * Migración: Agregar campo app_id a allowed_apps
 * Este campo servirá como identificador único para buscar credenciales OAuth
 */
exports.up = function(knex) {
  return knex.schema.table('allowed_apps', function(table) {
    table.string('app_id', 255).nullable().unique();
    table.index('app_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('allowed_apps', function(table) {
    table.dropColumn('app_id');
  });
};
