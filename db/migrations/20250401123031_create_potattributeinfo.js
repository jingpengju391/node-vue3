exports.up = function (knex) {
    return knex.schema.createTable('pot_attribute_info', (table) => {
        table.string('attributeId')
        table.string('userId')
        table.string('dataType')
        table.string('potDeviceId')
        table.string('sex')
        table.string('attributeName')
        table.string('attributeDataUnit')
    })
}

exports.down = function () {
    return null
}
