exports.up = function (knex) {
    return knex.schema.createTable('pot_work_detail_basic_info', (table) => {
        table.string('workId')
        table.string('userId')
        table.string('dataType')
        table.string('workName')
        table.string('substationName')
        table.string('potBeginTime')
        table.string('potEndTime')
        table.string('potNature')
        table.string('potNatureCn')
        table.string('status')
        table.string('workRemark')
        table.string('sysDeptId')
        table.string('sysDeptName')
        table.string('sysCenterId')
        table.string('sysCenterName')
        table.string('sysTeamId')
        table.string('sysTeamName')
    })
}

exports.down = function () {
    return null
}
