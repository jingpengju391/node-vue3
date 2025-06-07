exports.up = function (knex) {
    return knex.schema.createTable('pot_item_base_ing', (table) => {
        table.string('dataType')
        table.string('userId')
        table.string('workId')
        table.string('potWorkItemId')
        table.string('submitTime')
        table.string('potResult')
        table.string('oilTemp')
        table.string('potDeviceId')
    })
}

exports.down = function () {
    return null
}
