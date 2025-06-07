import { DictionaryItem, DictParams, User, UserWithRequiredId } from './login'
import { AvailableWifi, ExtendedConnectionOpts, SignalType } from './socket'
import wifi from 'node-wifi'
import {
	AdopSubWorkRequestParams,
	AnchorWorkOrder,
	AssignParams,
	DetectClimate,
	DetectGroup,
	DetectRequestParams,
	PointFile,
	SubWork,
	SubWorkBasics,
	SubWorkOrdePointrWithRequiredId,
	SubWorkOrderPoint,
	SubWorkOrderPointBasics,
	SubWorkOrderWithRequiredId,
	SubWorkPointRequestParams,
	WorkOrder,
	WorkOrderParams,
	WorkOrderWithRequiredId,
	DetectMode,
	PartialPointFile,
	WorkDetailType,
	DetectMethod
} from './WorkOrder'
import {
	deptUser,
	potDetailWorkReq,
	potDetailWorkResultVO,
	PotDevice,
	potExecParam,
	potExecResultVO,
	potItemParam,
	potPositionHisMoreParam,
	potPositionHisParam,
	potSocket,
	potWork,
	potWorkReq,
	submitItemScheduledReq,
	submitPotWorkReq,
	WeatherDTO
} from '../../server/potAPIs'
export type Api = {
	isMac: boolean
	isDev: boolean
	isLinux: boolean
	isWin: boolean
	db: {
		insertUserDB: (user: User) => Promise<void>
		deleteUser: (userId: string) => Promise<void>
		updatedUserInfo: (user: UserWithRequiredId) => Promise<void>
		queryUserDB: (id: number) => Promise<void>
		queryLastVisitedUser: () => Promise<void>
		queryAllUsersOfWorkspace: (workspaceId: number) => Promise<User[]>
		queryAllDictOfWorkspace: (workspaceId: number) => Promise<DictionaryItem[]>
		insertDictDB: (dicts: DictionaryItem[]) => Promise<void>
		queryAllOrdersOfWorkspace: (workspaceId: number) => Promise<AnchorWorkOrder[]>
		queryAllSubOrdersOfWorkspace: (workspaceId: number) => Promise<SubWork[]>
		queryAllSubOrderPointsOfWorkspace: (workspaceId: number) => Promise<SubWorkOrderPoint[]>
		insertOrdersOfWorkspace: (works: WorkOrder[]) => Promise<void>
		updatePartialWorkOrder: (order: WorkOrderWithRequiredId) => Promise<void>
		insertSubOrderOfWorkspace: (subwork: SubWork) => Promise<void>
		updatePartialSubWorkOrder: (subwork: SubWorkOrderWithRequiredId) => Promise<void>
		insertSubOrderPointOfWorkspace: (subwork: SubWorkOrderPoint) => Promise<void>
		updatePartialPointSubWorkOrder: (subwork: SubWorkOrdePointrWithRequiredId) => Promise<void>
		queryAllFilesPointsOfWorkspace: (workspaceId: number) => Promise<PointFile[]>
		insertFilesOfPoint: (files: PointFile[]) => Promise<number[]>
		updatedFilesOfPoint: (files: PartialPointFile[]) => Promise<void>
	}
	process: {
		close: () => Promise<void>
		showMainWindow: () => Promise<void>
		restore: () => Promise<void>
		getBasename: (filePath: string) => Promise<string>
		minimize: () => Promise<void>
		maximize: () => Promise<void>
		desktopCapturer: () => Promise<string>
		screenshot: (params: ScreenData) => Promise<ScreenData>
		closeScreenshotWindow: () => Promise<void>
		screenshotImage: (params: ScreenData) => Promise<ScreenData>
		scanWifiInformation: () => Promise<void>
		updatedScanCurrentwifi: (params: boolean) => Promise<void>
		updatedSwitchWithAvailablewifi: (params: boolean) => Promise<void>
		disconnectWifi: () => Promise<void>
		connectAvailableWifi: (params: ExtendedConnectionOpts) => Promise<wifi.WiFiNetwork>
		autoConnectAvailableWifi: (params: AvailableWifi) => Promise<wifi.WiFiNetwork | undefined>
		switchNetwork: (params: SignalType) => Promise<string | undefined>
		upgrade: () => Promise<void>
		cancelUpgrade: () => Promise<void>
		getDefultNetwork: () => Promise<'wapi' | '5g' | undefined>
		handlerDefultNetwork: (DefultNetwork: 'wapi' | '5g') => Promise<'wapi' | '5g'>
		synchronizeSystemClock: (time: number | string) => Promise<void>
		pollInfraredFiles: (mode: DetectMode) => Promise<void>
		stopPollInfraredFiles: () => Promise<void>
		serverConnect: (host: string, port: number) => Promise<void>
		serverDisconnect: (host: string, port: number) => Promise<void>
		sendDetectData: (work: WorkOrder, subwork: SubWork, points: SubWorkOrderPoint[]) => Promise<void>
		fetchMacAddress: (ip: string) => Promise<string>
		deleteFile: (filePath: string) => Promise<void>
		showOpenWorkspaceDialog: (
			workId: string,
			subWorkId: string,
			pointId: string,
			detectMethod: DetectMethod,
			mode: DetectMode,
			workDetailType: WorkDetailType,
			workDetailIndex: number,
			deviceCode: string
		) => Promise<Electron.OpenDialogReturnValue>
		startTTS: (text: string) => Promise<void>
		stopTTS: () => Promise<void>
		updatedTTS: (v: boolean) => void
	}
	publish: {}
	http: {
		login: (params: { username: string; password: string }) => Promise<{ data: User }>
		queryPlatformTime: (params: { eid: string }) => Promise<{ data: number | string }>
		queryDictionaryEncode: (params: DictParams) => Promise<{ data: DictionaryItem[] }>
		queryWorkOrders: (params: WorkOrderParams) => Promise<{ data: WorkOrder[] }>
		assignWorkOrder: (params: AssignParams) => Promise<void>
		querySubWorkOrders: (params: AssignParams) => Promise<{ data: SubWorkBasics[] }>
		queryRouteplanDetaillist: (params: DetectRequestParams) => Promise<{ data: DetectGroup[] }>
		queryDetaillist: (params: SubWorkPointRequestParams) => Promise<{ data: SubWorkOrderPointBasics[] }>
		adoptSubwork: (params: AdopSubWorkRequestParams) => Promise<void>
		submitWorkOrder: (params: DetectClimate) => Promise<void>
		getPotWorkListHandler: (params: potWorkReq) => Promise<potWork[]>
		submitPotWorkHandler: (params: submitPotWorkReq) => Promise<number>
		getPotWorkDetailListHandler: (params: potDetailWorkReq) => Promise<potDetailWorkResultVO>
		getPotExecListHandler: (params: potExecParam) => Promise<potExecResultVO>
		getPotDeviceHandler: () => Promise<PotDevice[]>
		getPotPositionHisListHandler: (params: potPositionHisParam) => Promise<[]>
		getPotPositionHisMoreHandler: (params: potPositionHisMoreParam) => Promise<[]>
		getWeatherInfoHandler: () => Promise<WeatherDTO[]>
		getTestUserListHandler: () => Promise<deptUser[]>
		submitPotItemHandler: (params: potItemParam) => Promise<void>
		submitItemScheduledHandler: (params: submitItemScheduledReq) => Promise<number>
		sendDeviceConnectHandler: (params: potSocket) => Promise<void>
		sendPotDeviceQueryHandler: (params: potSocket) => Promise<void>
		disConnectPotHandler: (params: potSocket) => Promise<void>
		getPotSyncCountHandler: () => Promise<number>
	}
}

export type ElectronApi = {
	send: (channel: string, data: any) => void
	receive: (channel: string, callback: (...args: any[]) => void) => void
	invoke: (channel: string, ...args: any[]) => Promise<any>
}

export type ScreenData = {
	src: string
	screenshotStatus: boolean
}
