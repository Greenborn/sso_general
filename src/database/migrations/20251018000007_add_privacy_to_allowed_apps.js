exports.up = function(knex) {
  return knex.schema.table('allowed_apps', function(table) {
    table.string('privacy', 32).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('allowed_apps', function(table) {
    table.dropColumn('privacy');
  });
};
