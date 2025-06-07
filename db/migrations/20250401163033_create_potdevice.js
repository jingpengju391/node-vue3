exports.up = function (knex) {
    return knex.schema.createTable('pot_device', (table) => {
        table.string('potDeviceId')
        table.string('dataType')
        table.string('userId')
        table.string('potDeviceName')
        table.string('potDeviceCode')
        table.string('potDeviceType')
        table.string('potDeviceModel')
        table.string('potDeviceCompany')
    })
}

exports.down = function () {
    return null
}
