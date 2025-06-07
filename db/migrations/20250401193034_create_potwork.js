exports.up = function (knex) {
    return knex.schema.createTable('pot_work', (table) => {
        table.string('workId')
        table.string('dataType')
        table.string('userId')
        table.string('workName')
        table.string('substationName')
        table.string('potBeginTime')
        table.string('potEndTime')
        table.string('potDeviceNames')
        table.string('potItemCns')
        table.string('status')
    })
}

exports.down = function () {
    return null
}
