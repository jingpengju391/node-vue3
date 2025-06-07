import DBClient from '@service/db/dbClient'
import { User, UserWithRequiredId } from '@shared/dataModelTypes/login'
import { omit } from '@shared/functional'

export const userAPIs = {
	userSpace: '',
	reformatUserJSONForModelDBInsertion(user: UserWithRequiredId) {
		return {
			...omit(['userId'], user)
		}
	},
	db: {
		async insertUserDB(user: User) {
			return await DBClient.getInstance(userAPIs.userSpace)('user').insert(user)
		},
		async deleteUser(userId: string) {
			return await DBClient.getInstance(userAPIs.userSpace)('user').where('userId', userId).delete()
		},
		async updateUserUpdatedAt(userId: string) {
			return await DBClient.getInstance(userAPIs.userSpace)('user').where('userId', userId).update({ updatedAt: Date.now() })
		},
		async updatedUserInfo(user: UserWithRequiredId) {
			return await DBClient.getInstance(userAPIs.userSpace)('user').where('userId', user.userId).update(userAPIs.reformatUserJSONForModelDBInsertion(user))
		},
		async queryUserDB(id: number) {
			return await DBClient.getInstance(userAPIs.userSpace)('user').where('id', id).select('*')
		},
		async queryLastVisitedUser() {
			return await DBClient.getInstance(userAPIs.userSpace)('user').orderBy('updatedAt', 'desc').first()
		},
		async queryAllUsersOfWorkspace(workspaceId: number) {
			return await DBClient.getInstance(userAPIs.userSpace)('user').where('workspaceId', workspaceId).select('*').orderBy('updatedAt')
		}
	}
}
