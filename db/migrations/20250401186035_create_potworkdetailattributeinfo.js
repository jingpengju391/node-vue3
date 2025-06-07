exports.up = function (knex) {
    return knex.schema.createTable('pot_work_detail_attribute_info', (table) => {
        table.string('workId')
        table.string('userId')
        table.string('dataType')
        table.string('potPositionId')
        table.string('attributeId')
        table.string('attributeName')
        table.string('attributeDataUnit')
        table.string('dataValue')
        table.string('temperature')
        table.string('humidity')
        table.string('weather')
        table.string('weatherCn')
        table.string('oilTemp')
        table.string('potBeginTime')
        table.string('potDeviceId')
        table.string('potWorkDetailId')
        table.string('potWorkItemId')
    })
}

exports.down = function () {
    return null
}
