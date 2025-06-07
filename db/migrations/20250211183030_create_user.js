exports.up = function (knex) {
	return knex.schema.createTable('user', (table) => {
		table.string('userId').primary()
		table.integer('appMajor')
		table.integer('phonenumber')
		table.string('sex')
		table.string('userName')
		table.string('userNick')
		table.string('password')
		table.string('workIds')
		table.integer('workspaceId').defaultTo(1)
		table.foreign('workspaceId').references('workspaces.id').onDelete('CASCADE')
		table.timestamp('updatedAt').defaultTo(knex.fn.now())
	})
}

exports.down = function () {
	return null
}
