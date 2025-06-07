exports.up = function (knex) {
	return knex.schema.createTable('workspaces', (table) => {
		table.increments('id').primary()
		table.string('name')
	})
}

exports.down = function () {
	return null
}
