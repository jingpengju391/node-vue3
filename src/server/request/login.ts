import { $http } from '@service/httpClient/http'
import { DictParams } from '@shared/dataModelTypes/login'
import { IpcMainInvokeEvent } from 'electron'

export const login = (_event: IpcMainInvokeEvent, data: { username: string; password: string }) => $http('/v1/mt/user/login', 'POST', data, '登录')

export const queryPlatformTime = (_event: IpcMainInvokeEvent, data: { eid: string }) => $http('/v1/an/ntp/getPlatformTime', 'POST', data)

export const queryDictionaryEncode = (_event: IpcMainInvokeEvent, params: DictParams) => $http('/v1/mt/dict/dataList', 'POST', params)
