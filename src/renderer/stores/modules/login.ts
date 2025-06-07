import { defineStore } from 'pinia'
import { ModuleOption } from '../definition'
import { DictionaryItem, LoginParam, User } from '@shared/dataModelTypes/login'
import { db, http, isDev } from '@hooks/api'
import { storage } from '@lib/storage'
import loginDataSource from './loginDataSource'
import { formatDateTime } from '@util/index'
import { UpgradeConfig } from '@shared/dataModelTypes/upgrade'

export interface State {
	user: User | undefined
	remember: boolean | undefined
	upgradConfig: UpgradeConfig | undefined
	dicts: DictionaryItem[]
	dictType: 'reason_not_detect'
}

export type Getters = Record<string, never>

export interface Actions {
	resetLogin: () => void
	login: (params: LoginParam) => Promise<void>
	recoverDefaultWorkspaceFromDB: (workspackId: number) => Promise<void>
	recoverDictDefaultWorkspaceFromDB: (workspackId: number) => Promise<void>
	updatedUpgradConfig: (params: UpgradeConfig | undefined) => void
	syncDictionaryEncode: (isForce?: boolean) => Promise<void>
}

type ModelsModule = ModuleOption<State, Getters, Actions>

const loginStoreOptions: ModelsModule = {
	persist: isDev
		? {
				storage: sessionStorage
			}
		: false,
	state: () => ({
		user: undefined,
		remember: undefined,
		upgradConfig: undefined,
		dicts: [],
		dictType: 'reason_not_detect'
	}),
	actions: {
		resetLogin() {
			this.user = undefined
			const remember = storage.localGet('remember')
			this.remember = remember ? JSON.parse(remember) : false
			this.upgradConfig = undefined
			this.dicts = []
		},
		async recoverDefaultWorkspaceFromDB(workspaceId) {
			this.resetLogin()
			const users = await db.queryAllUsersOfWorkspace(workspaceId)
			loginDataSource.addNewEntriesToUserMap(users)
			if (!this.remember) return
			this.user = loginDataSource.getLastVisitedCompleteUser()
		},
		async recoverDictDefaultWorkspaceFromDB(workspaceId) {
			const dicts = await db.queryAllDictOfWorkspace(workspaceId)
			loginDataSource.addNewDictEntriesToDictMap(dicts)
			this.dicts = loginDataSource.getDictionaryEncodesByType(this.dictType)
		},
		async login({ username, password, remember }) {
			const updatedAt = Date.now()
			const { data } = await http.login({ username, password })
			// update store login user data
			this.user = { ...data, updatedAt, password }
			this.remember = remember
			// update local login remember data
			storage.localSet('remember', JSON.stringify(remember))

			if (remember) {
				const userId = this.user!.userId
				const isExist = loginDataSource.isExistUserInfo(userId)
				if (isExist) {
					const user = loginDataSource.getCompleteUserByUerId(userId)
					// update source login user data
					loginDataSource.updatedEntryToUserMap({ ...this.user!, workIds: user?.workIds })
					// update db login user data
					await db.updatedUserInfo({ userId, updatedAt: Date.now() })
				} else {
					// insert source login user data
					loginDataSource.addNewEntryToUserMap(this.user!)
					// insert db login user data
					await db.insertUserDB({ ...this.user!, workIds: '' })
				}
			} else {
				// delete source login user data
				loginDataSource.deleteEntryToUserMap(data.userId)
				// delete db login user data
				await db.deleteUser(data.userId)
			}

			const currentTime = formatDateTime('YYYY MM DD')
			storage.set('loginTime', currentTime)
		},
		async syncDictionaryEncode(isForce) {
			const userId = this.user?.userId
			const dictType = this.dictType
			if (!userId || (!isForce && loginDataSource.hasAnyDictionaryEncode(dictType))) {
				if (!userId) return
				this.dicts = loginDataSource.getDictionaryEncodesByType(dictType)
				return
			}

			const { data = [] } = await http.queryDictionaryEncode({ userId, dictType })

			const dicts = data.map((d: DictionaryItem) => ({
				dictCode: d.dictCode,
				dictValue: d.dictValue,
				dictLabel: d.dictLabel,
				dictSort: d.dictSort,
				dictType
			}))
			loginDataSource.addNewDictEntriesToDictMap(dicts)
			this.dicts = dicts
			await db.insertDictDB(dicts)
		},
		updatedUpgradConfig(upgradConfig) {
			this.upgradConfig = upgradConfig
		}
	}
}

export default defineStore('login', loginStoreOptions)
