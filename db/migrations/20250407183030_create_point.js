exports.up = function (knex) {
	return knex.schema.createTable('point', (table) => {
		table.string('workDetailId').primary()
		table.string('detectPositionId')
		table.integer('status')
		table.string('reasonNotDetect')
		table.integer('detectMethod')
		table.string('detectMethodCn')
		table.string('deviceTypeName')
		table.string('voltageLevel')
		table.string('detectPositionName')
		table.string('deviceName')
		table.string('dispatchNumber')
		table.string('deviceType')
		table.integer('orderNumber')
		table.integer('groupOrder')
		table.string('deviceId')
		table.string('blockName')
		table.string('workId')
		table.string('subWorkId')
		table.string('groupId')
		table.integer('workspaceId').defaultTo(1)
		table.foreign('workId').references('workOrder.workId').onDelete('CASCADE')
		table.foreign('subWorkId').references('subWorkOrder.subWorkId').onDelete('CASCADE')
		table.foreign('workspaceId').references('workspaces.id').onDelete('CASCADE')
		table.timestamp('updatedAt').defaultTo(knex.fn.now())
	})
}

exports.down = function (knex) {
	return knex.schema.dropTable('point')
}
