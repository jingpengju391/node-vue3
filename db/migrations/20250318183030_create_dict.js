exports.up = function (knex) {
	return knex.schema.createTable('dict', (table) => {
		table.string('dictCode').primary()
		table.string('dictValue')
		table.string('dictLabel')
		table.string('dictSort')
		table.string('dictType')
		table.integer('workspaceId').defaultTo(1)
		table.foreign('workspaceId').references('workspaces.id').onDelete('CASCADE')
		table.timestamp('updatedAt').defaultTo(knex.fn.now())
	})
}

exports.down = function (knex) {
	return knex.schema.dropTable('dict')
}
