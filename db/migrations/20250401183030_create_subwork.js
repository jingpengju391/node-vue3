exports.up = function (knex) {
	return knex.schema.createTable('subWorkOrder', (table) => {
		table.string('subWorkId').primary()
		table.string('workId')
		table.string('subWorkUserId')
		table.integer('detectMethod')
		table.string('detectMethodCn')
		table.integer('detectPositionTotal')
		table.integer('detectPositionComplete')
		table.integer('status')
		table.integer('workspaceId').defaultTo(1)
		table.foreign('workId').references('workOrder.workId').onDelete('CASCADE')
		table.foreign('workspaceId').references('workspaces.id').onDelete('CASCADE')
		table.timestamp('updatedAt').defaultTo(knex.fn.now())
	})
}

exports.down = function (knex) {
	return knex.schema.dropTable('subWorkOrder')
}