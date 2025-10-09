/**
 * Migración: Crear tabla de sesiones
 */
exports.up = function(knex) {
  return knex.schema.createTable('sessions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('bearer_token_hash', 64).notNullable().unique();
    table.string('unique_id', 255).notNullable().index();
    table.timestamp('expires_at').notNullable();
    table.string('ip_address', 45);
    table.text('user_agent');
    table.boolean('revoked').defaultTo(false);
    table.timestamps(true, true); // created_at, updated_at
    
    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Índices
    table.index('bearer_token_hash');
    table.index('user_id');
    table.index('unique_id');
    table.index('expires_at');
    table.index('revoked');
    table.index(['user_id', 'revoked', 'expires_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('sessions');
};
