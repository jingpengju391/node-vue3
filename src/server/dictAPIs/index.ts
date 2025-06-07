import DBClient from '@service/db/dbClient'
import { DictionaryItem } from '@shared/dataModelTypes/login'

export const dictAPIs = {
	userSpace: '',
	db: {
		async insertDictDB(dicts: DictionaryItem[]) {
			return await DBClient.getInstance(dictAPIs.userSpace).transaction(async (trx) => {
				for (const dict of dicts) {
					await trx('dict')
						.insert({ ...dict })
						.onConflict('dictCode')
						.merge()
				}
			})
		},
		async queryAllDictOfWorkspace(workspaceId: number) {
			return await DBClient.getInstance(dictAPIs.userSpace)('dict').where('workspaceId', workspaceId).select('*').orderBy('updatedAt')
		}
	}
}
