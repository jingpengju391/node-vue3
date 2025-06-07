import { Knex, knex } from 'knex'

export default class DBClient {
	static allUsers: { [propName: string]: { instance: Knex; workspacePath: string } } = {}

	static getInstance(userSpace: string = ''): Knex {
		return DBClient.allUsers[userSpace].instance
	}

	static initialize(userSpace: string, workspacePath: string) {
		DBClient.allUsers[userSpace] = DBClient.allUsers[userSpace] || {}
		DBClient.allUsers[userSpace].workspacePath = workspacePath
		DBClient.allUsers[userSpace].instance = knex({
			client: 'sqlite3',
			connection: {
				filename: workspacePath
			},
			useNullAsDefault: true,
			pool: {
				min: 3,
				max: 10,
				// https://github.com/knex/knex/issues/453
				afterCreate: (conn: { run: (arg1: string, cb: () => void) => void }, cb: () => void) => conn.run('PRAGMA foreign_keys = ON', cb)
			},
			migrations: {
				tableName: 'knex_migrations'
			},
			acquireConnectionTimeout: 60000
		})
	}
}
