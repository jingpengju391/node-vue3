import { $http } from '@service/httpClient/http'
import { AssignParams, DetectClimate, DetectRequestParams, SubWorkPointRequestParams, UploadRequestPayload, WorkOrderParams } from '@shared/dataModelTypes/WorkOrder'
import { IpcMainInvokeEvent } from 'electron'

export const queryWorkOrders = (_event: IpcMainInvokeEvent, params: WorkOrderParams) => $http('/v1/mt/work/list', 'POST', params)

export const assignWorkOrder = (_event: IpcMainInvokeEvent, params: AssignParams) => $http('/v1/mt/work/adopt', 'POST', params, '认领中...', { timeout: 20000 })

export const querySubWorkOrders = (_event: IpcMainInvokeEvent, params: AssignParams) => $http('/v1/mt/work/subworklist', 'POST', params, '加载中...')

export const queryRouteplanDetaillist = (_event: IpcMainInvokeEvent, params: DetectRequestParams) => $http('/v1/mt/routeplan/detaillist', 'POST', params)

export const queryDetaillist = (_event: IpcMainInvokeEvent, params: SubWorkPointRequestParams) => $http('/v1/mt/work/detaillist', 'POST', params)

export const adoptSubwork = (_event: IpcMainInvokeEvent, params: SubWorkPointRequestParams) => $http('/v1/mt/work/adoptsubwork', 'POST', params, '认领中...')

export const submitWorkOrder = (_event: IpcMainInvokeEvent, params: DetectClimate) => $http('/v1/mt/work/submit', 'POST', params, '提交中..', { timeout: 20000 })

export const assignWorkOrderFile = (params: UploadRequestPayload) => $http('/v1/mt/file/upload', 'POST', params)
