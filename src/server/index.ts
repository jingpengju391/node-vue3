import { IpcMainInvokeEvent } from 'electron'
import { DictionaryItem, User, UserWithRequiredId } from '@shared/dataModelTypes/login'
import { userAPIs } from './userAPIs'
import { dictAPIs } from './dictAPIs'
import { workOrderAPIs } from './workOrderAPIs'
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

import {
	getPotWorkList,
	submitPotWork,
	potWork,
	potWorkReq,
	submitPotWorkReq,
	potDetailWorkReq,
	potDetailWorkResultVO,
	getPotWorkDetailList,
	getPotExecList,
	potExecParam,
	potExecResultVO,
	getPotDevice,
	PotDevice,
	potPositionHisParam,
	getPotPositionHisList,
	getPotPositionHisMore,
	getWeatherInfo,
	WeatherDTO,
	getPotSyncCount,
	getTestUserList,
	deptUser,
	submitPotItem,
	potItemParam,
	submitItemScheduled,
	submitItemScheduledReq,
	potSocket,
	sendDeviceConnect,
	sendPotDeviceQuery,
	disConnectPot,
	potPositionHisMoreParam
} from './potAPIs'
export async function insertUserDB(_event: IpcMainInvokeEvent, user: User) {
	return await userAPIs.db.insertUserDB(user)
}

export async function deleteUser(_event: IpcMainInvokeEvent, userId: string) {
	return await userAPIs.db.deleteUser(userId)
}

export async function updatedUserInfo(_event: IpcMainInvokeEvent, user: UserWithRequiredId) {
	return await userAPIs.db.updatedUserInfo(user)
}

export async function queryUserDB(_event: IpcMainInvokeEvent, id: number) {
	return await userAPIs.db.queryUserDB(id)
}

export async function queryLastVisitedUser() {
	return await userAPIs.db.queryLastVisitedUser()
}

export async function queryAllUsersOfWorkspace(_event: IpcMainInvokeEvent, workspaceId: number) {
	return await userAPIs.db.queryAllUsersOfWorkspace(workspaceId)
}

export async function queryAllDictOfWorkspace(_event: IpcMainInvokeEvent, workspaceId: number): Promise<DictionaryItem[]> {
	return await dictAPIs.db.queryAllDictOfWorkspace(workspaceId)
}

export async function insertDictDB(_event: IpcMainInvokeEvent, dicts: DictionaryItem[]) {
	return await dictAPIs.db.insertDictDB(dicts)
}

export async function queryAllOrdersOfWorkspace(_event: IpcMainInvokeEvent, workspaceId: number) {
	return await workOrderAPIs.db.queryAllOrdersOfWorkspace(workspaceId)
}

export async function queryAllSubOrdersOfWorkspace(_event: IpcMainInvokeEvent, workspaceId: number) {
	return await workOrderAPIs.db.queryAllSubOrdersOfWorkspace(workspaceId)
}

export async function queryAllSubOrderPointsOfWorkspace(_event: IpcMainInvokeEvent, workspaceId: number) {
	return await workOrderAPIs.db.queryAllSubOrderPointsOfWorkspace(workspaceId)
}

export async function queryAllFilesPointsOfWorkspace(_event: IpcMainInvokeEvent, workspaceId: number) {
	return await workOrderAPIs.db.queryAllFilesPointsOfWorkspace(workspaceId)
}

export async function insertOrdersOfWorkspace(_event: IpcMainInvokeEvent, works: WorkOrder[]) {
	return await workOrderAPIs.db.insertOrdersOfWorkspace(works)
}

export async function updatePartialWorkOrder(_event: IpcMainInvokeEvent, workorder: WorkOrderWithRequiredId) {
	return await workOrderAPIs.db.updatePartialWorkOrder(workorder)
}

export async function insertSubOrderOfWorkspace(_event: IpcMainInvokeEvent, subWorkorder: SubWork) {
	return await workOrderAPIs.db.insertSubOrderOfWorkspace(subWorkorder)
}

export async function updatePartialSubWorkOrder(_event: IpcMainInvokeEvent, subWorkorder: SubWorkOrderWithRequiredId) {
	return await workOrderAPIs.db.updatePartialSubWorkOrder(subWorkorder)
}

export async function insertSubOrderPointOfWorkspace(_event: IpcMainInvokeEvent, point: SubWorkOrderPoint) {
	return await workOrderAPIs.db.insertSubOrderPointOfWorkspace(point)
}

export async function updatePartialPointSubWorkOrder(_event: IpcMainInvokeEvent, point: SubWorkOrdePointrWithRequiredId) {
	return await workOrderAPIs.db.updatePartialPointSubWorkOrder(point)
}

export async function insertFilesOfPoint(files: PointFile[]): Promise<number[]> {
	return await workOrderAPIs.db.insertFilesOfPoint(files)
}

export async function updatedFilesOfPoint(_event: IpcMainInvokeEvent | undefined, files: PartialPointFile[]) {
	return await workOrderAPIs.db.updatedFilesOfPoint(files)
}

export async function clearWorkOrderWithStatus(date: number): Promise<number[]> {
	return await workOrderAPIs.db.clearWorkOrderWithStatus(date)
}

export async function getPotWorkListHandler(_event: IpcMainInvokeEvent, param: potWorkReq): Promise<potWork[]> {
	return await getPotWorkList(param)
}

export async function submitPotWorkHandler(_event: IpcMainInvokeEvent, param: submitPotWorkReq): Promise<number> {
	return await submitPotWork(param)
}

export async function getPotWorkDetailListHandler(_event: IpcMainInvokeEvent, param: potDetailWorkReq): Promise<potDetailWorkResultVO> {
	return await getPotWorkDetailList(param)
}

export async function getPotExecListHandler(_event: IpcMainInvokeEvent, param: potExecParam): Promise<potExecResultVO> {
	return await getPotExecList(param)
}

export async function getPotDeviceHandler(): Promise<PotDevice[]> {
	return await getPotDevice()
}

export async function getPotPositionHisListHandler(_event: IpcMainInvokeEvent, param: potPositionHisParam): Promise<[]> {
	return await getPotPositionHisList(param)
}
export async function getPotPositionHisMoreHandler(_event: IpcMainInvokeEvent, param: potPositionHisMoreParam): Promise<[]> {
	return await getPotPositionHisMore(param)
}

export async function getWeatherInfoHandler(): Promise<WeatherDTO[]> {
	return await getWeatherInfo()
}

export async function getPotSyncCountHandler(): Promise<number> {
	return await getPotSyncCount()
}
export async function getTestUserListHandler(): Promise<deptUser[]> {
	return await getTestUserList()
}

export async function submitPotItemHandler(_event: IpcMainInvokeEvent, param: potItemParam): Promise<void> {
	return await submitPotItem(param)
}

export async function submitItemScheduledHandler(_event: IpcMainInvokeEvent, param: submitItemScheduledReq): Promise<number> {
	return await submitItemScheduled(param)
}

export async function sendDeviceConnectHandler(_event: IpcMainInvokeEvent, param: potSocket): Promise<void> {
	return await sendDeviceConnect(param)
}
export async function sendPotDeviceQueryHandler(_event: IpcMainInvokeEvent, param: potSocket): Promise<void> {
	return await sendPotDeviceQuery(param)
}

export async function disConnectPotHandler(_event: IpcMainInvokeEvent, param: potSocket): Promise<void> {
	return await disConnectPot(param)
}
