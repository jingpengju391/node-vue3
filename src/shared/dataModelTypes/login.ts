export type LoginParam = {
	username: string
	password: string
	remember: boolean
}

export type User = {
	appMajor: number
	phonenumber: number | null
	sex: string
	userId: string
	userName: string
	userNick: string
	password: string
	workspaceId?: number
	updatedAt: number
	workIds?: string
}

export type UserWithRequiredId = Partial<Omit<User, 'userId'>> & { userId: string }

export interface DictionaryItem {
	dictCode: string
	dictValue: string
	dictLabel: string
	dictSort: string
	dictType: string
	updatedAt?: number
}

export interface DictParams {
	userId: string
	dictType: string
}
