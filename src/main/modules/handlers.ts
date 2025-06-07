import { ipcMain, app } from 'electron'
import * as path from 'path'
import {
	insertUserDB,
	deleteUser,
	updatedUserInfo,
	queryUserDB,
	queryLastVisitedUser,
	queryAllUsersOfWorkspace,
	queryAllDictOfWorkspace,
	insertDictDB,
	queryAllOrdersOfWorkspace,
	queryAllSubOrdersOfWorkspace,
	queryAllSubOrderPointsOfWorkspace,
	insertOrdersOfWorkspace,
	updatePartialWorkOrder,
	insertSubOrderOfWorkspace,
	updatePartialSubWorkOrder,
	insertSubOrderPointOfWorkspace,
	updatePartialPointSubWorkOrder,
	queryAllFilesPointsOfWorkspace,
	insertFilesOfPoint,
	updatedFilesOfPoint,
	getPotWorkListHandler,
	submitPotWorkHandler,
	getPotWorkDetailListHandler,
	getPotExecListHandler,
	getPotDeviceHandler,
	getPotPositionHisListHandler,
	getPotPositionHisMoreHandler,
	getWeatherInfoHandler,
	getPotSyncCountHandler,
	getTestUserListHandler,
	submitPotItemHandler,
	submitItemScheduledHandler,
	disConnectPotHandler,
	sendDeviceConnectHandler,
	sendPotDeviceQueryHandler
} from '@server'
import { delWindow, getModelWindow } from '../configWindows'
import { getDesktopCapturer, showScreenshotWindow, closeScreenshotWindow } from './screenshot'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'
import { ScreenData } from '@shared/index'
import { scanWifiInformation } from './initDataBeforeCreateWindow'
import { updatedScanCurrentwifi, updatedSwitchWithAvailablewifi } from '../configWindows/switch'
import { autoConnectAvailableWifi, connectAvailableWifi, disconnectWifi } from '@shared/functional/wifi'
import { AvailableWifi, ExtendedConnectionOpts, NetTypeMapPort, NetWorkType, SignalType } from '@shared/dataModelTypes/socket'
import { getDefultNetwork, getNetworkInterfaceType, handlerDefultNetwork, switchNetwork } from '@shared/functional/network'
import TCPClient from '@service/socket'
import killProcess from '@lib/killProcess'
import { netfg, netwapi } from '../utils/devices'
import { fetchMacAddress, getScreenSize } from '../utils'
import { isDev } from '@util/process'
import { cancelUpdater, handlerUpgrade } from '@lib/updater'
import { synchronizeSystemClock } from '@lib/clock'
import MqttClient from '@service/mqtt'
import {
	login,
	queryPlatformTime,
	queryDictionaryEncode,
	queryWorkOrders,
	assignWorkOrder,
	querySubWorkOrders,
	queryRouteplanDetaillist,
	queryDetaillist,
	adoptSubwork,
	submitWorkOrder
} from '@server/request'
import { PointFile } from '@shared/dataModelTypes/WorkOrder'
import pollInfraredFiles, { stopPollInfraredFiles } from '@shared/functional/pollInfraredFiles'
import workOrderManager from '@shared/functional/detectDataTransport'
import { deleteFileIfExistsSync } from '@lib'
import DialogService from '../utils/dialogService'
import tts from '@lib/EkhoTTS'
import { handMaintenanceMode } from '@shared/functional/maintenance'

export function registerRenderMessageHandlers() {
	ipcMain.handle('db:insertUserDB', insertUserDB)
	ipcMain.handle('db:deleteUser', deleteUser)
	ipcMain.handle('db:updatedUserInfo', updatedUserInfo)
	ipcMain.handle('db:queryUserDB', queryUserDB)
	ipcMain.handle('db:queryLastVisitedUser', queryLastVisitedUser)
	ipcMain.handle('db:queryAllUsersOfWorkspace', queryAllUsersOfWorkspace)
	ipcMain.handle('db:queryAllDictOfWorkspace', queryAllDictOfWorkspace)
	ipcMain.handle('db:insertDictDB', insertDictDB)
	ipcMain.handle('db:queryAllOrdersOfWorkspace', queryAllOrdersOfWorkspace)
	ipcMain.handle('db:queryAllSubOrdersOfWorkspace', queryAllSubOrdersOfWorkspace)
	ipcMain.handle('db:queryAllSubOrderPointsOfWorkspace', queryAllSubOrderPointsOfWorkspace)
	ipcMain.handle('db:insertOrdersOfWorkspace', insertOrdersOfWorkspace)
	ipcMain.handle('db:updatePartialWorkOrder', updatePartialWorkOrder)
	ipcMain.handle('db:insertSubOrderOfWorkspace', insertSubOrderOfWorkspace)
	ipcMain.handle('db:updatePartialSubWorkOrder', updatePartialSubWorkOrder)
	ipcMain.handle('db:insertSubOrderPointOfWorkspace', insertSubOrderPointOfWorkspace)
	ipcMain.handle('db:updatePartialPointSubWorkOrder', updatePartialPointSubWorkOrder)
	ipcMain.handle('db:queryAllFilesPointsOfWorkspace', queryAllFilesPointsOfWorkspace)
	ipcMain.handle('db:insertFilesOfPoint', async (_event, files: PointFile[]) => {
		return await insertFilesOfPoint(files)
	})
	ipcMain.handle('db:updatedFilesOfPoint', updatedFilesOfPoint)
}

export function unregisterRenderMessageHandlers() {
	ipcMain.removeHandler('db:insertUserDB')
	ipcMain.removeHandler('db:deleteUser')
	ipcMain.removeHandler('db:updatedUserInfo')
	ipcMain.removeHandler('db:queryUserDB')
	ipcMain.removeHandler('db:queryLastVisitedUser')
	ipcMain.removeHandler('db:queryAllUsersOfWorkspace')
	ipcMain.removeHandler('db:queryAllDictOfWorkspace')
	ipcMain.removeHandler('db:insertDictDB')
	ipcMain.removeHandler('db:queryAllOrdersOfWorkspace')
	ipcMain.removeHandler('db:queryAllSubOrdersOfWorkspace')
	ipcMain.removeHandler('db:queryAllSubOrderPointsOfWorkspace')
	ipcMain.removeHandler('db:insertOrdersOfWorkspace')
	ipcMain.removeHandler('db:updatePartialWorkOrder')
	ipcMain.removeHandler('db:insertSubOrderOfWorkspace')
	ipcMain.removeHandler('db:updatePartialSubWorkOrder')
	ipcMain.removeHandler('db:insertSubOrderPointOfWorkspace')
	ipcMain.removeHandler('db:updatePartialPointSubWorkOrder')
	ipcMain.removeHandler('db:queryAllFilesPointsOfWorkspace')
	ipcMain.removeHandler('db:insertFilesOfPoint')
	ipcMain.removeHandler('db:updatedFilesOfPoint')
}

export function registerRenderProcessMessageHandlers() {
	ipcMain.handle('process:close', async () => {
		MqttClient.disconnectAll()
		app.quit()
		killProcess()
	})
	ipcMain.handle('process:showMainWindow', async () => {
		const loadingWindow = getModelWindow(ModelWindowKey.loadingWindow)
		const mainWindow = getModelWindow(ModelWindowKey.mainWindow)
		const { width: w, height: h } = getScreenSize()
		const width = isDev ? Math.floor(w * 0.7) : w
		const height = isDev ? Math.floor(h * 0.7) : h
		loadingWindow?.hide()
		loadingWindow?.close()
		delWindow(ModelWindowKey.loadingWindow)
		mainWindow?.setContentSize(width, height)
		mainWindow?.setMinimumSize(width, height)
		mainWindow?.center()
	})
	ipcMain.handle('process:minimize', () => {
		const window = getModelWindow(ModelWindowKey.mainWindow)
		window?.setFullScreen(false)
		window?.minimize()
	})
	ipcMain.handle('process:maximize', () => {
		const window = getModelWindow(ModelWindowKey.mainWindow)
		window?.maximize()
		window?.setFullScreen(true)
	})

	ipcMain.handle('process:restore', () => {
		const window = getModelWindow(ModelWindowKey.mainWindow)
		window?.setFullScreen(false)
		window?.restore()
	})
	ipcMain.handle('get:basename', (_event, filePath) => {
		return path.basename(filePath)
	})
	ipcMain.handle('process:desktopCapturer', async () => {
		return await getDesktopCapturer()
	})
	ipcMain.handle('process:screenshot', async (_event, params: ScreenData) => {
		const window = getModelWindow(ModelWindowKey.shotWindow)
		window?.webContents.send('window-shot-param', params)
		params.screenshotStatus ? showScreenshotWindow() : closeScreenshotWindow()
		return params
	})
	ipcMain.handle('process:closeScreenshotWindow', () => {
		closeScreenshotWindow()
	})
	ipcMain.handle('process:screenshot-image', async (_event, params: ScreenData) => {
		const window = getModelWindow(ModelWindowKey.mainWindow)
		window?.webContents.send('window-shot-param-params', params)
		return params
	})

	ipcMain.handle('process:scanWifiInformation', async () => {
		try {
			await scanWifiInformation()
		} catch (error) {
			logger.log(error)
		}
	})

	ipcMain.handle('process:updatedScanCurrentwifi', async (_event, params: boolean) => {
		try {
			updatedScanCurrentwifi(params)
		} catch (error) {
			logger.log(error)
		}
	})

	ipcMain.handle('process:updatedSwitchWithAvailablewifi', async (_event, params: boolean) => {
		try {
			updatedSwitchWithAvailablewifi(params)
		} catch (error) {
			logger.log(error)
		}
	})

	ipcMain.handle('process:disconnectWifi', async (_event) => {
		try {
			await disconnectWifi()
		} catch (error) {
			logger.log(error)
		}
	})

	ipcMain.handle('process:connectAvailableWifi', async (_event, param: ExtendedConnectionOpts) => {
		return await connectAvailableWifi(param)
	})

	ipcMain.handle('process:autoConnectAvailableWifi', async (_event, { currentConnection, availableWifiList }: AvailableWifi) => {
		return await autoConnectAvailableWifi(currentConnection, availableWifiList)
	})

	ipcMain.handle('process:switchNetwork', async (_event, param: SignalType) => {
		TCPClient.disconnect(netfg.host, NetTypeMapPort.tun0)
		TCPClient.disconnect(netwapi.host, NetTypeMapPort.usb0)
		const result = await switchNetwork(param)
		const netWorkType = await getNetworkInterfaceType()

		if (netWorkType === NetWorkType.tun0) {
			TCPClient.connect(netfg.host, netfg.port)
		}

		if (netWorkType === NetWorkType.usb0) {
			TCPClient.connect(netwapi.host, netwapi.port)
		}
		return result
	})

	ipcMain.handle('process:upgrade', async () => {
		const mainWindow = getModelWindow(ModelWindowKey.mainWindow)
		await handlerUpgrade(app, mainWindow)
	})

	ipcMain.handle('process:upgrade:cancel', async () => {
		cancelUpdater()
	})

	ipcMain.handle('process:getDefultNetwork', getDefultNetwork)

	ipcMain.handle('process:handlerDefultNetwork', async (_event, defultNetwork) => {
		await handlerDefultNetwork(defultNetwork)
	})

	ipcMain.handle('process:synchronizeSystemClock', async (_event, time) => {
		synchronizeSystemClock(time)
	})

	ipcMain.handle('process:pollInfraredFiles', async (_event, mode) => {
		await pollInfraredFiles(mode)
	})

	ipcMain.handle('process:stopPollInfraredFiles', stopPollInfraredFiles)

	ipcMain.handle('process:server:connect', (_event, host, port) => {
		TCPClient.connect(host, port, 0)
	})

	ipcMain.handle('process:server:disconnect', (_event, host, port) => {
		TCPClient.connect(host, port)
	})

	ipcMain.handle('process:send:detect:data', async (_event, work, subwork, points) => {
		await workOrderManager.taskDispatcher(work, subwork, points)
	})

	ipcMain.handle('process:fetch:mac:address', async (_event, ip) => {
		return await fetchMacAddress(ip)
	})

	ipcMain.handle('process:delete:file', async (_event, filePath) => {
		return deleteFileIfExistsSync(filePath)
	})

	ipcMain.handle('dialog:showOpenWorkspaceDialog', async (_event, workId, subWorkId, pointId, detectMethod, mode, workDetailType, workDetailIndex, sensorEid) => {
		const value = await DialogService.showOpenWorkspaceDialog()
		await handMaintenanceMode(workId, subWorkId, pointId, detectMethod, mode, workDetailType, workDetailIndex, sensorEid, value)
		return value
	})

	ipcMain.handle('start:text:to:speech', async (_event, text) => {
		await tts.speak(text)
	})

	ipcMain.handle('stop:text:to:speech', () => {
		tts.stop()
	})

	ipcMain.handle('init:text:to:speech', (_event, v) => {
		tts.updatedVoiceGuide(v)
	})
}

export function unregisterRenderProcessMessageHandlers() {
	ipcMain.removeHandler('process:close')
	ipcMain.removeHandler('process:showMainWindow')
	ipcMain.removeHandler('process:minimize')
	ipcMain.removeHandler('process:maximize')
	ipcMain.removeHandler('process:restore')
	ipcMain.removeHandler('get:basename')
	ipcMain.removeHandler('process:desktopCapturer')
	ipcMain.removeHandler('process:screenshot')
	ipcMain.removeHandler('process:closeScreenshotWindow')
	ipcMain.removeHandler('process:screenshot-image')
	ipcMain.removeHandler('process:scanWifiInformation')
	ipcMain.removeHandler('process:updatedScanCurrentwifi')
	ipcMain.removeHandler('process:updatedSwitchWithAvailablewifi')
	ipcMain.removeHandler('process:disconnectWifi')
	ipcMain.removeHandler('process:connectAvailableWifi')
	ipcMain.removeHandler('process:autoConnectAvailableWifi')
	ipcMain.removeHandler('process:switchNetwork')
	ipcMain.removeHandler('process:upgrade')
	ipcMain.removeHandler('process:upgrade:cancel')
	ipcMain.removeHandler('process:getDefultNetwork')
	ipcMain.removeHandler('process:handlerDefultNetwork')
	ipcMain.removeHandler('process:synchronizeSystemClock')
	ipcMain.removeHandler('process:pollInfraredFiles')
	ipcMain.removeHandler('process:server:connect')
	ipcMain.removeHandler('process:server:disconnect')
	ipcMain.removeHandler('process:send:detect:data')
	ipcMain.removeHandler('process:fetch:mac:address')
	ipcMain.removeHandler('process:delete:file')
	ipcMain.removeHandler('dialog:showOpenWorkspaceDialog')
	ipcMain.removeHandler('start:text:to:speech')
	ipcMain.removeHandler('stop:text:to:speech')
	ipcMain.removeHandler('init:text:to:speech')
}

export function registerRenderCreateWindowMessageHandler() {
	ipcMain.handle('http:login', login)
	ipcMain.handle('http:queryPlatformTime', queryPlatformTime)
	ipcMain.handle('http:queryDictionaryEncode', queryDictionaryEncode)
	ipcMain.handle('http:queryWorkOrders', queryWorkOrders)
	ipcMain.handle('http:assignWorkOrder', assignWorkOrder)
	ipcMain.handle('http:querySubWorkOrders', querySubWorkOrders)
	ipcMain.handle('http:queryRouteplanDetaillist', queryRouteplanDetaillist)
	ipcMain.handle('http:queryDetaillist', queryDetaillist)
	ipcMain.handle('http:adoptSubwork', adoptSubwork)
	ipcMain.handle('http:submitWorkOrder', submitWorkOrder)
	ipcMain.handle('http:getPotWorkList', getPotWorkListHandler)
	ipcMain.handle('http:submitPotWork', submitPotWorkHandler)
	ipcMain.handle('http:getPotWorkDetailList', getPotWorkDetailListHandler)
	ipcMain.handle('http:getPotDevice', getPotDeviceHandler)
	ipcMain.handle('http:getPotPositionHisList', getPotPositionHisListHandler)
	ipcMain.handle('http:getPotPositionHisMore', getPotPositionHisMoreHandler)
	ipcMain.handle('http:getPotExecList', getPotExecListHandler)
	ipcMain.handle('http:getWeatherInfo', getWeatherInfoHandler)
	ipcMain.handle('http:getPotSyncCount', getPotSyncCountHandler)
	ipcMain.handle('http:getTestUserList', getTestUserListHandler)
	ipcMain.handle('http:submitPotItem', submitPotItemHandler)
	ipcMain.handle('http:submitItemScheduled', submitItemScheduledHandler)
	ipcMain.handle('http:sendDeviceConnect', sendDeviceConnectHandler)
	ipcMain.handle('http:sendPotDeviceQuery', sendPotDeviceQueryHandler)
	ipcMain.handle('http:disConnectPot', disConnectPotHandler)
}

export function unregisterRenderCreateWindowMessageHandler() {
	ipcMain.removeHandler('http:login')
	ipcMain.removeHandler('http:queryPlatformTime')
	ipcMain.removeHandler('http:queryWorkOrders')
	ipcMain.removeHandler('http:assignWorkOrder')
	ipcMain.removeHandler('http:querySubWorkOrders')
	ipcMain.removeHandler('http:queryRouteplanDetaillist')
	ipcMain.removeHandler('http:queryDetaillist')
	ipcMain.removeHandler('http:adoptSubwork')
	ipcMain.removeHandler('http:submitWorkOrder')
	ipcMain.removeHandler('http:assignWorkOrderFile')
	ipcMain.removeHandler('http:getPotWorkDetailList')
	ipcMain.removeHandler('http:submitPotItem')
	ipcMain.removeHandler('http:submitPotWork')
	ipcMain.removeHandler('http:getPotWorkList')
	ipcMain.removeHandler('http:getPotDevice')
	ipcMain.removeHandler('http:getPotPositionHisList')
	ipcMain.removeHandler('http:getPotPositionHisMore')
	ipcMain.removeHandler('http:getPotExecList')
	ipcMain.removeHandler('http:getWeatherInfo')
	ipcMain.removeHandler('http:getPotSyncCount')
	ipcMain.removeHandler('http:getTestUserList')
	ipcMain.removeHandler('http:submitItemScheduled')
	ipcMain.removeHandler('http:sendDeviceConnect')
	ipcMain.removeHandler('http:sendPotDeviceQuery')
	ipcMain.removeHandler('http:disConnectPot')
}
