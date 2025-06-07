exports.up = function (knex) {
    return knex.schema.createTable('pot_work_detail_device_info', (table) => {
        table.string('dataType')
        table.string('workId')
        table.string('userId')
        table.string('potWorkDeviceId')
        table.string('deviceName')
        table.string('dispatchNumber')
        table.string('potResult')
        table.string('potDeviceRemark')
        table.string('adoptUserId')
        table.string('adoptUserName')
        table.string('deviceType')

    })
}

exports.down = function () {
    return null
}
