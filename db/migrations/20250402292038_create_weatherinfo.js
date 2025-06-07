exports.up = function (knex) {
    return knex.schema.createTable('weather_info', (table) => {
        table.string('dictCode')
        table.string('dataType')
        table.string('dictValue')
        table.string('dictLabel')
        table.string('dictSort')
    })
}

exports.down = function () {
    return null
}
