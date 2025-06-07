exports.up = function (knex) {
    return knex.schema.createTable('pot_work_detail_ing', (table) => {
        table.string('dataType')
        table.string('potWorkItemId')
        table.string('potPositionId')
        table.string('potWorkDetailId')
    })
}

exports.down = function () {
    return null
}
