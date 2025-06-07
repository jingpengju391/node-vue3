import { Knex } from 'knex'
import path from 'path'
import moment from 'moment'
import { ensureDirSync, copyFileSync, existsSync } from 'fs-extra'

import DBClient from './dbClient'
import { resolvePath } from '../util'
import { singleton } from '@util'

export interface DbServiceClass {
	userSpace: string
	migrationFilePath: string
	seedFilePath: string
	initializeDB: (workspacePath: string) => Promise<void>
	backupOldVersionWorkspace: (workspacePath: string) => Promise<void>
}

class DbService implements DbServiceClass {
	userSpace: string
	migrationFilePath: string
	seedFilePath: string
	constructor() {
		this.userSpace = ''
		this.migrationFilePath = resolvePath(import.meta.env.MAIN_VITE_APP_DB_MIGRATIONS)
		this.seedFilePath = resolvePath(import.meta.env.MAIN_VITE_APP_DB_SEEDS)
	}
	async initializeDB(workspacePath: string): Promise<void> {
		try {
			DBClient.initialize(this.userSpace, workspacePath)
			const migrationConfig: Knex.MigratorConfig = { directory: this.migrationFilePath }
			await this.backupOldVersionWorkspace(workspacePath)
			const currentVersion = await DBClient.getInstance(this.userSpace).migrate.currentVersion(migrationConfig)
			const targetVersion = await DBClient.getInstance(this.userSpace).migrate.latest(migrationConfig)

			currentVersion !== targetVersion && (await DBClient.getInstance(this.userSpace).migrate.latest(migrationConfig))

			const isAppFirstLoaded = currentVersion === 'none' || currentVersion === '0'
			isAppFirstLoaded &&
				(await DBClient.getInstance(this.userSpace).seed.run({
					directory: this.seedFilePath
				}))
		} catch (err) {
			console.log(err)
		}
	}
	async backupOldVersionWorkspace(workspacePath: string): Promise<void> {
		try {
			const migrateList = await DBClient.getInstance(this.userSpace).migrate.list({
				directory: this.migrationFilePath
			})
			// pending migrations length eq to 0
			if (migrateList[1].length !== 0) {
				const currVersion = await DBClient.getInstance(this.userSpace).migrate.currentVersion()

				const parsedPath = path.parse(workspacePath)
				const dataPath = parsedPath.dir
				const backupDir = path.join(dataPath, import.meta.env.MAIN_VITE_APP_DB_BACK_UP)
				const timestamp = moment(new Date()).format('YYYY_MM_DD_HH_MM')
				const backupName = `${parsedPath.name}_${currVersion}_${timestamp}${parsedPath.ext}`

				ensureDirSync(backupDir)
				const backupPath = path.join(backupDir, backupName)

				!existsSync(backupPath) && copyFileSync(workspacePath, backupPath)
			} else {
				console.log('No pending migrations to backup.')
			}
		} catch (error) {
			console.error('Error during backup:', error)
		}
	}
}

const DbServiceSingleton = singleton(DbService)
export default new DbServiceSingleton()
