exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.string('profile_img_int', 255).nullable().comment('Nombre de archivo de imagen interna');
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('profile_img_int');
  });
};
