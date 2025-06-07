exports.up = function (knex) {
    return knex.schema.createTable('pot_dept_user_info', (table) => {
        table.string('deptUserId')
        table.string('dataType')
        table.string('userNick')
        table.string('userId')
    })
}

exports.down = function () {
    return null
}
