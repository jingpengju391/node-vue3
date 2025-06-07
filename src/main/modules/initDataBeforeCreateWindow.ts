import path from 'path'
import { app } from 'electron'
import wifi from 'node-wifi'
import cron from 'node-cron'
import DbService from '@service/db'
import { generateFullPathUsingRelativePath } from '@lib'
import { isLinux } from '@util/process'
import getnitLoggerInfo from '@lib/figlet'
import TCPClient from '@service/socket'
import BluetoothService from '@shared/functional/bluetooth'
import MqttClient from '@service/mqtt'
import XmlParser from '@lib/XmlParser'
import devices, { netfg, netwapi } from '../utils/devices'
import { getModelWindow } from '../configWindows'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'
import { convertKeysToCamelCase, quickSort, sleep } from '@util/index'
import { getCurrentConnections, scanAvailableNetworks } from '@shared/functional/wifi'
import Scheduler, { singScheduler } from '@util/scheduler'
import { switchList, updatedSwitchWithAvailablewifi } from '../configWindows/switch'
import { getNetworkInterfaceType } from '@shared/functional/network'
import { NetWorkType, SignalType } from '@shared/dataModelTypes/socket'
import { clearDiskSpaceData } from '@lib/memory'
import { parseDeviceCodeFile } from '@lib/deviceCode'
import { getBluetoothName, getCpuUsage, getDiskUsage, getMemoryUsage } from '@lib/system'
import { getMqttHostDeviceCode } from '@shared/functional'
import handleGroupedFileUpload from '@shared/functional/task'
import workOrderManager from '@shared/functional/detectDataTransport'
import { DeviceEventMessage } from '@shared/dataModelTypes/mqtt'
import { receivePotDeviceVal } from '../../server/potAPIs'

let mainWindow: Electron.CrossProcessExports.BrowserWindow | undefined

export async function initWorkspaceBeforeCreateMainWindow() {
	// init log info ablout system
	logger.log(getnitLoggerInfo())
	console.log(getnitLoggerInfo())

	await initializeDBService()
	//in this file, you can include other time-consuming data for the application
	//code. you can also place them in separate functions and call them here.
	// receiveBaseSystemInfo()
	// await clearDiskSpaceDta()
}

export async function initServerAfterCreateMainWindow() {
	mainWindow = getModelWindow(ModelWindowKey.mainWindow)

	initDeviceCodeFile()
	initAppVersion()
	const netWorkType = await getNetworkInterfaceType()
	await scanWifiInformation()
	updatedSwitchWithAvailablewifi(false)
	await clientLocalServer(netWorkType)
	// receiveBaseSystemInfo()
	await createBluetoothServer()
	singScheduler.executeIdleCallback(handleGroupedFileUpload)
	receiveBaseSystemInfo()
	// start scheduled tasks
	startScheduledTasks()
}

function initDeviceCodeFile() {
	const deviceInfo = parseDeviceCodeFile()
	global.deviceInfo = { ...global.deviceInfo, ...deviceInfo }
	mainWindow?.webContents.send('updated:device-code', deviceInfo)
}

function initAppVersion() {
	const version = app.getVersion()
	mainWindow?.webContents.send('system:version', version)
}

// client db & create db table
async function initializeDBService() {
	const { MAIN_VITE_APP_DB_PATH, MAIN_VITE_IMAGE_DB_RELVTIVE_PATH } = import.meta.env
	const fullPath = isLinux ? generateFullPathUsingRelativePath(MAIN_VITE_IMAGE_DB_RELVTIVE_PATH) : path.resolve(__dirname, MAIN_VITE_APP_DB_PATH)
	await DbService.initializeDB(fullPath)
}

export async function scanWifiInformation() {
	let currentConnection: wifi.WiFiNetwork | undefined = undefined
	const availableWifiList: wifi.WiFiNetwork[] = []
	if (switchList.scanCurrentwifi) {
		const wifis = await getCurrentConnections()
		currentConnection = wifis[0]
	}

	if (switchList.scanAvailablewifi) {
		const availableWifis = await scanAvailableNetworks()
		availableWifiList.push(...quickSort(availableWifis, 'quality', true))
	}

	// const autoConnectWifi = await autoConnectAvailableWifi(currentConnection, availableWifiList)

	// if (autoConnectWifi) {
	// 	currentConnection = autoConnectWifi
	// }

	if (currentConnection) {
		const findIndex = availableWifiList.findIndex((wifi) => wifi.ssid === currentConnection!.ssid)
		availableWifiList.splice(findIndex, 1)
		availableWifiList.unshift(currentConnection)
	}

	global.wifi = currentConnection
	mainWindow?.webContents.send('updated:current-wifi-list', currentConnection)
	mainWindow?.webContents.send('updated:available-wifi-list', availableWifiList)
}

// client local server
async function clientLocalServer(netWorkType: NetWorkType | undefined) {
	workOrderManager.handlerMainWindow()
	const scheduler = new Scheduler(10)
	scheduler.add(async () => await clientMqttServer(SignalType.wapi))
	TCPClient.on('dataReceived', async (socketId: string, messages: string[] | Buffer) => {
		for (const message of messages) {
			if (/^127\.0\.0\.1:(9889|9890)$/.test(socketId)) {
				scheduler.add(async () => await receiveNetWorkInfo(message as string, socketId))
			}

			if (Buffer.isBuffer(message)) {
				scheduler.add(async () => await workOrderManager.handleProtocolResponse(message))
			}

			if (/^127\.0\.0\.1:9888$/.test(socketId)) {
				scheduler.add(async () => await receiveDeteceData(message as string, socketId))
			}
		}

		scheduler.add(async () => await scanWifiInformation())
		scheduler.add(async () => await receiveBaseSystemInfo(scheduler))
	})

	TCPClient.on('disconnect', (socketId: string) => {
		mainWindow?.webContents.send(`socket:disconnect`, socketId)
		if (/^127\.0\.0\.1:(9889|9890)$/.test(socketId)) {
			global.network = undefined
		}
	})

	TCPClient.on('connected', (socketId: string) => {
		mainWindow?.webContents.send(`socket:connected`, socketId)
	})

	if (netWorkType === NetWorkType.tun0) {
		TCPClient.connect(netfg.host, netfg.port)
	}

	if (netWorkType === NetWorkType.usb0) {
		TCPClient.connect(netwapi.host, netwapi.port)
	}

	for (const device of devices) {
		TCPClient.connect(device.host, device.port)
	}
}

async function createBluetoothServer() {
	if (!isLinux) return
	await BluetoothService.startBluetoothService()
	BluetoothService.on('dataReceived', async (mac, messages: Buffer[]) => {
		for (const message of messages) {
			await workOrderManager.handleProtocolResponse(message, mac)
		}
	})
	BluetoothService.on('disconnect', (mac: string) => {
		mainWindow?.webContents.send('bluetooth:disconnect', mac)
	})
	BluetoothService.on('connected', (mac: string) => {
		mainWindow?.webContents.send('bluetooth:connected', mac)
	})
}

// client mqtt server
export async function clientMqttServer(type?: SignalType) {
	const { platform_port, platform_host, platform_username, platform_password } = getMqttHostDeviceCode(type)

	// Define topic paths and their corresponding sendId
	const topicMapping: { [topic: string]: string } = {}

	// Subscribe to topics
	function subscribeTopics(host: string, port: number, topics: string[]) {
		topics.forEach((topic) => MqttClient.subscribe(host, port, topic))
	}

	// Disconnect all MQTT connections before connecting to new hosts
	MqttClient.disconnectAll()

	await sleep(3000)

	// Connect to platform and setup MQTT hosts
	MqttClient.connect(
		platform_host,
		platform_port,
		{
			username: platform_username,
			password: platform_password,
			clientId: 'short_term_platform' + Math.random().toString(16).substr(2, 8)
		},
		mainWindow
	)

	// Event handler for successful MQTT connection
	MqttClient.on('connect', ({ host, port }) => {
		const topics = Object.keys(topicMapping)
		// Determine whether it's a platform connection and subscribe accordingly
		subscribeTopics(host, port, topics) // Subscribe to all setup topics
	})

	// Event handler for receiving MQTT messages
	MqttClient.on('message', ({ payload, topic }) => {
		const sendId = topicMapping[topic]
		if (sendId) {
			mainWindow?.webContents.send(`mqtt:${sendId}`, payload)
		} else {
			logger.warn('Handling unknown topic:', topic)
		}
	})
}

// client local system server
async function receiveBaseSystemInfo(scheduler?: Scheduler) {
	getCpuUsage()
		.then((cpuUsage) => {
			mainWindow?.webContents.send('system:cpu', cpuUsage)
			global.deviceInfo = {
				...global.deviceInfo,
				cpuUsage
			}
		})
		.catch(function (err) {
			logger.error('Error:', err)
		})
	getMemoryUsage().then((memory) => {
		mainWindow?.webContents.send('system:memory', memory)
		global.deviceInfo = {
			...global.deviceInfo,
			memory
		}
	})
	getDiskUsage().then((disk) => {
		mainWindow?.webContents.send('system:disk', disk)
		global.deviceInfo = {
			...global.deviceInfo,
			disk
		}

		const usagePercent = Math.round((disk.used / (disk.available + disk.used)) * 100)

		if (usagePercent >= 80) {
			scheduler?.add(async () => await clearDiskSpaceData())
		}
	})
	getBluetoothName().then((name) => {
		mainWindow?.webContents.send('system:blueToothName', name)
		global.deviceInfo = {
			...global.deviceInfo,
			name
		}
	})
}

function startScheduledTasks() {
	const { platform_port, platform_host, deviceCode: mtCode } = getMqttHostDeviceCode()
	cron.schedule('0 */10 * * * *', () => {
		singScheduler.add(
			async () =>
				await new Promise((resolve) => {
					const { memory, disk, cpuUsage } = global.deviceInfo
					const systemInfo: DeviceEventMessage = {
						eventId: Date.now().toString(),
						deviceId: mtCode,
						timestamp: Date.now(),
						data: [
							{
								deviceId: mtCode,
								memoryUse: memory.memoryUsagePercentage,
								memoryAll: memory.usedMemory.toString(),
								cpuUse: cpuUsage.toString(),
								hardDiskUse: (disk.used / (disk.available + disk.used)).toFixed(2),
								hardDiskAll: disk.used.toString(),
								lastReboot: '-',
								// wanIp: '', // 北向网口IP
								// wanMac: '', // 北向网口MAC地址
								wapiMac1: global.deviceInfo['WAPI-MAC1'],
								wapiMac2: global.deviceInfo['WAPI-MAC2'],
								eth0Mac: global.deviceInfo['ETH0-MAC'],
								fivegSim: global.deviceInfo['5G-ICCID']
							}
						]
					}
					MqttClient.publish(platform_host, platform_port, `/v1/${mtCode}/mt/systeminfo`, systemInfo, undefined, undefined, 2)
					resolve()
				})
		)
	})
}
async function receiveNetWorkInfo(message: string, socketId: string) {
	const parsedObject = await XmlParser.parseXmlToObject(message)
	const parsedStringToObject = XmlParser.parseStringToObject(parsedObject.head.data)
	mainWindow?.webContents.send(`socket:message`, socketId, convertKeysToCamelCase({ ...parsedObject.head, data: parsedStringToObject }))
	const newNetwork = { ...parsedObject.head, data: parsedStringToObject }
	const isConnect = !!newNetwork?.data?.connect
	if (isConnect) {
		global.network = newNetwork
	}
}

async function receiveDeteceData(message: string, socketId: string) {
	const parsedObject = await XmlParser.parseXmlToObject(message)
	const parsedStringToObject = XmlParser.parseStringToObject(parsedObject.head.data)
	const receiveType: string = parsedObject.head.cmd
	if (receiveType === 'query_ack') {
		logger.log('parsedObject.head', JSON.stringify(parsedObject.head))
		await receivePotDeviceVal(parsedObject.head)
		mainWindow?.webContents.send(`socket:${socketId}`, convertKeysToCamelCase({ ...parsedObject.head, data: parsedStringToObject }))
	}
}

// function isPlatform(host: string, port: number): boolean {
// 	const { MAIN_VITE_PLATFORM_MQTT_WAPI_PORT, MAIN_VITE_PLATFORM_MQTT_WAPI_HOST, MAIN_VITE_PLATFORM_MQTT_FG_PORT, MAIN_VITE_PLATFORM_MQTT_FG_HOST } = import.meta.env
// 	return host + port === MAIN_VITE_PLATFORM_MQTT_WAPI_HOST + MAIN_VITE_PLATFORM_MQTT_WAPI_PORT || host + port === MAIN_VITE_PLATFORM_MQTT_FG_HOST + MAIN_VITE_PLATFORM_MQTT_FG_PORT
// }
