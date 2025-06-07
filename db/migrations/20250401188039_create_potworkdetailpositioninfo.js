exports.up = function (knex) {
    return knex.schema.createTable('pot_work_detail_position_info', (table) => {
        table.string('workId')
        table.string('userId')
        table.string('dataType')
        table.string('potWorkDeviceId')
        table.string('potWorkItemId')
        table.string('potWorkDetailId')
        table.string('potPositionId')
        table.string('potPositionName')
        table.string('orderNumber')
    })
}

exports.down = function () {
    return null
}
