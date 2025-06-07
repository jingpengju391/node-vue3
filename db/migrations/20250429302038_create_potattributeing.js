exports.up = function (knex) {
    return knex.schema.createTable('pot_attribute_ing', (table) => {
        table.string('dataType')
        table.string('potWorkItemId')
        table.string('potPositionId')
        table.string('attributeId')
        table.string('dataValue')
    })
}

exports.down = function () {
    return null
}
