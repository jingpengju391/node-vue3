import { IdDelimiter } from '@shared/dataModelTypes/helpers'
import { DictionaryItem, User } from '@shared/dataModelTypes/login'

export class LoginDataSource {
	#userMap = new Map<string, User>()
	#dictMap = new Map<string, DictionaryItem>()
	#dictTypeMap = new Map<string, DictionaryItem[]>()

	addNewEntriesToUserMap(newEntries: User[]) {
		newEntries.forEach((entry) => this.#userMap.set(<string>entry.userId, entry))
	}

	addNewEntryToUserMap(newEntry: User) {
		this.#userMap.set(<string>newEntry.userId, newEntry)
	}

	addNewDictEntriesToDictMap(newEntries: DictionaryItem[]) {
		newEntries.forEach((entry) => {
			this.#dictMap.set(<string>entry.dictCode, entry)
			if (this.#dictTypeMap.has(entry.dictType)) {
				const existingArray = this.#dictTypeMap.get(entry.dictType)
				existingArray && existingArray.push(entry)
			} else {
				this.#dictTypeMap.set(entry.dictType, [entry])
			}
		})
	}

	updatedEntryToUserMap(entry: User) {
		this.#userMap.set(entry.userId, entry)
	}

	deleteEntryToUserMap(userId: string) {
		this.#userMap.delete(userId)
	}

	isExistUserInfo(userId: string): boolean {
		return !!this.#userMap.get(userId)
	}

	getLastVisitedCompleteUser(): User | undefined {
		let latestUser: User | undefined = undefined

		for (const user of this.#userMap.values()) {
			if (!latestUser || user.updatedAt > latestUser.updatedAt) {
				latestUser = user
			}
		}

		return latestUser
	}

	getCompleteUserByUerId(userId: string): User | undefined {
		return this.#userMap.get(userId)
	}

	getWorkIdsByUserId(userId: string): string[] {
		const user = this.#userMap.get(userId)
		if (!user?.workIds) return []
		return user?.workIds?.split(IdDelimiter) || []
	}

	hasAnyWorkOrderForUser(userId: string): boolean {
		const user = this.#userMap.get(userId)
		return !!user?.workIds
	}

	hasAnyDictionaryEncode(type: string): boolean {
		const dicts = this.#dictTypeMap.get(type)
		return !!(dicts && dicts?.length > 0)
	}

	getDictionaryEncodesByType(type: string): DictionaryItem[] {
		return this.#dictTypeMap.get(type) || []
	}

	getDictionaryEncodesByCode(code: string): DictionaryItem | undefined {
		return this.#dictMap.get(code)
	}
}
export default new LoginDataSource()
