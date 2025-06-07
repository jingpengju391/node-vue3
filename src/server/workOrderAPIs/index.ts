import DBClient from '@service/db/dbClient'
import { omit } from '@shared/functional'
import {
	PartialPointFile,
	PointFile,
	SubWork,
	SubWorkOrdePointrWithRequiredId,
	SubWorkOrderPoint,
	SubWorkOrderWithRequiredId,
	WorkOrder,
	WorkOrderWithRequiredId
} from '@shared/dataModelTypes/WorkOrder'
import { formatDateTime } from '@util/index'

export const workOrderAPIs = {
	userSpace: '',
	reformatWorkJSONForModelDBInsertion(work: WorkOrderWithRequiredId) {
		return {
			...omit(['workId'], work)
		}
	},
	reformatSensorJSONForModelDBInsertion(work: WorkOrder) {
		return {
			...work,
			detectMethods: JSON.stringify(work.detectMethods)
		}
	},
	reformatSubWorkJSONForModelDBInsertion(subWork: SubWorkOrderWithRequiredId) {
		return {
			...omit(['workId', 'userId', 'subWorkId', 'mode'], subWork),
			updatedAt: formatDateTime()
		}
	},
	reformatSubWorkPonitJSONForModelDBInsertion(point: SubWorkOrdePointrWithRequiredId) {
		return {
			...omit(['workId', 'workDetailId', 'subWorkId', 'resultList'], point),
			updatedAt: formatDateTime()
		}
	},
	db: {
		async queryAllOrdersOfWorkspace(workspaceId: number) {
			return await DBClient.getInstance(workOrderAPIs.userSpace)('workOrder').where('workspaceId', workspaceId).select('*').orderBy('updatedAt')
		},

		async queryAllSubOrdersOfWorkspace(workspaceId: number) {
			return await DBClient.getInstance(workOrderAPIs.userSpace)('subWorkOrder').where('workspaceId', workspaceId).select('*').orderBy('updatedAt')
		},

		async queryAllSubOrderPointsOfWorkspace(workspaceId: number) {
			return await DBClient.getInstance(workOrderAPIs.userSpace)('point').where('workspaceId', workspaceId).select('*').orderBy('orderNumber')
		},

		async queryAllFilesPointsOfWorkspace(workspaceId: number) {
			return await DBClient.getInstance(workOrderAPIs.userSpace)('file').where('workspaceId', workspaceId).select('*').orderBy('updatedAt')
		},

		async insertOrdersOfWorkspace(works: WorkOrder[]) {
			return await DBClient.getInstance(workOrderAPIs.userSpace).transaction(async (trx) => {
				for (const work of works) {
					await trx('workOrder').insert(workOrderAPIs.reformatSensorJSONForModelDBInsertion(work)).onConflict('workId').merge()
				}
			})
		},

		async updatePartialWorkOrder(workOrder: WorkOrderWithRequiredId) {
			return await DBClient.getInstance(workOrderAPIs.userSpace)('workOrder').where('workId', workOrder.workId).update(workOrderAPIs.reformatWorkJSONForModelDBInsertion(workOrder))
		},

		async insertSubOrderOfWorkspace(subWorkOrder: SubWork) {
			return await DBClient.getInstance(workOrderAPIs.userSpace)('subWorkOrder')
				.insert({ ...omit(['mode'], subWorkOrder) })
				.onConflict('subWorkId')
				.merge()
		},

		async updatePartialSubWorkOrder(subWorkOrder: SubWorkOrderWithRequiredId) {
			const { workId, subWorkId } = subWorkOrder
			return await DBClient.getInstance(workOrderAPIs.userSpace)('subWorkOrder').where({ workId, subWorkId }).update(workOrderAPIs.reformatSubWorkJSONForModelDBInsertion(subWorkOrder))
		},

		async insertSubOrderPointOfWorkspace(point: SubWorkOrderPoint) {
			return await DBClient.getInstance(workOrderAPIs.userSpace)('point')
				.insert({ ...omit(['resultList'], point) })
				.onConflict('workDetailId')
				.merge()
		},

		async updatePartialPointSubWorkOrder(point: SubWorkOrdePointrWithRequiredId) {
			const { workId, subWorkId, workDetailId } = point
			return await DBClient.getInstance(workOrderAPIs.userSpace)('point').where({ workId, subWorkId, workDetailId }).update(workOrderAPIs.reformatSubWorkPonitJSONForModelDBInsertion(point))
		},

		async insertFilesOfPoint(files: PointFile[]) {
			const ids: number[] = []
			await DBClient.getInstance(workOrderAPIs.userSpace).transaction(async (trx) => {
				for (const file of files) {
					const res = await trx('file')
						.insert({
							...omit(['id'], file)
						})
						.onConflict(['workId', 'subWorkId', 'groupId', 'workDetailId', 'workDetailIndex', 'flieKey'])
						.merge()
						.returning('id')
					ids.push(res[0].id)
				}
			})
			return ids
		},

		async updatedFilesOfPoint(files: PartialPointFile[]) {
			return await DBClient.getInstance(workOrderAPIs.userSpace).transaction(async (trx) => {
				for (const file of files) {
					await trx('file')
						.where({ id: file.id })
						.update({
							...omit(['id'], file)
						})
				}
			})
		},

		async clearWorkOrderWithStatus(date: number) {
			const now = Date.now()
			const cutoffTime = now - date * 24 * 60 * 60 * 1000

			const toDelete = await DBClient.getInstance(workOrderAPIs.userSpace)('workOrder').select('workId').where('adoptAt', '<', cutoffTime)

			const workIds = toDelete.map((row) => row.workId)

			if (workIds.length > 0) {
				await DBClient.getInstance(workOrderAPIs.userSpace)('workOrder').whereIn('workId', workIds).del()
			}

			return workIds
		}
	}
}
