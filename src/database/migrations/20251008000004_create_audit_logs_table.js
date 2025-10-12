/**
 * Migración: Crear tabla de logs de auditoría
 */
exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned();
    table.string('action', 50).notNullable();
    table.string('unique_id', 255).index();
    table.string('ip_address', 45);
    table.text('user_agent');
    table.text('details'); // JSON
    table.boolean('success').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Foreign key (nullable para logs sin usuario)
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    
    // Índices
    table.index('user_id');
    table.index('action');
    table.index('created_at');
    table.index(['user_id', 'action']);
    table.index(['unique_id', 'action']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
