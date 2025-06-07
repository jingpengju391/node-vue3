exports.up = function (knex) {
	return knex.schema.createTable('file', (table) => {
		table.increments('id').primary()
		table.string('userId')
		table.string('workId')
		table.string('subWorkId')
		table.string('groupId')
		table.string('fileGroup')
		table.string('workDetailId')
		table.integer('status')
		table.string('flieKey')
		table.string('fileValue')
		table.integer('type')
		table.string('idCode')
		table.integer('workDetailType')
		table.integer('mode')
		table.integer('workDetailIndex')
		table.integer('detectMethod')
		table.integer('workspaceId').defaultTo(1)
		table.foreign('workspaceId').references('workspaces.id').onDelete('CASCADE')
		table.foreign('workId').references('workOrder.workId').onDelete('CASCADE')
		table.foreign('subWorkId').references('subWorkOrder.subWorkId').onDelete('CASCADE')
		table.foreign('workDetailId').references('point.workDetailId').onDelete('CASCADE')
		table.bigint('updatedAt')
		table.timestamp('createdAt').defaultTo(knex.fn.now())
		table.unique(['workId', 'subWorkId', 'groupId', 'workDetailId', 'workDetailIndex', 'flieKey'], 'file_unique_constraint')
	})
}

exports.down = function (knex) {
	return knex.schema.dropTable('file')
}
