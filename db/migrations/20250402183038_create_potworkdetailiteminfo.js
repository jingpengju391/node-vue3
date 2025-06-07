exports.up = function (knex) {
    return knex.schema.createTable('pot_work_detail_item_info', (table) => {
        table.string('dataType')
        table.string('workId')
        table.string('userId')
        table.string('potWorkDeviceId')
        table.string('potWorkItemId')
        table.string('potItem')
        table.string('potItemCn')
        table.string('potResult')
        table.string('oilTemp')
        table.string('potDeviceId')
        table.string('potDeviceName')
        table.string('potDeviceCode')
        table.string('createUserId')
        table.string('createUserName')
        table.string('adoptUserId')
        table.string('adoptUserName')
        table.string('potDeviceRemark')
    })
}

exports.down = function () {
    return null
}
