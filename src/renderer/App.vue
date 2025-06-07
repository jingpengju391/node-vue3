<script setup lang="ts" name="app">
import wifi from 'node-wifi'
import { Layout, Wifi, NetWork, SimpleKeyboard, Loading, UpgradeVersion } from '@/components'
import { electronAPI } from '@hooks/api'
import { NetTypeMapPort, NetWorkInformation, BlueTooth } from '@shared/dataModelTypes/socket'
import { useStores, recoverWorkspace } from '@stores'
import workOrderDataSource from '@stores/modules/workOrderDataSource'
import { process } from '@hooks/api'
import { UpgradeConfig } from '@shared/dataModelTypes/upgrade'
import { SystemMemory } from '@shared/dataModelTypes/windows'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { v4 as uuid } from 'uuid'
import { loading } from './utils/loading'
import { extractIpPort } from './utils/regex'
import { SubWorkOrderPoint, UploadFileInfo, WorkOrderStatus } from '@shared/dataModelTypes/WorkOrder'

const { network: networkStore, login: netLoginStore, root: rootStore, workOrder: workOrderStore } = useStores()
const { currentMode, currentModeIPMap } = storeToRefs(workOrderStore)
const { selectWifi, showWifiList } = storeToRefs(networkStore)

const socketHandlers = {
	[`127.0.0.1:${NetTypeMapPort.tun0}`]: {
		onConnect: () => networkStore.clearCommunication(),
		onDisconnect: () => networkStore.clearCommunication(),
		onMessage: (message: NetWorkInformation | undefined) => networkStore.updatedCommunication(message)
	},
	[`127.0.0.1:${NetTypeMapPort.usb0}`]: {
		onConnect: () => networkStore.clearCommunication(),
		onDisconnect: () => networkStore.clearCommunication(),
		onMessage: (message: NetWorkInformation | undefined) => networkStore.updatedCommunication(message)
	},
	[`127.0.0.1:${NetTypeMapPort.blueTooth}`]: {
		onConnect: () => networkStore.clearBlueTooth(),
		onDisconnect: () => networkStore.clearBlueTooth(),
		onMessage: (message: BlueTooth | undefined) => networkStore.updatedBlueTooth(message)
	},
	['192.168.4.1']: {
		onConnect: () => workOrderStore.updatedSocketIdConnectedStatus('192.168.4.1', true),
		onDisconnect: () => workOrderStore.updatedSocketIdConnectedStatus('192.168.4.1', false)
	}
}

electronAPI.receive('socket:connected', (socketId) => {
	const handler = socketHandlers[socketId]?.onConnect
	if (handler) {
		handler()
	} else {
		workOrderStore.updatedSocketIdConnectedStatus(`${socketId}`, true)
	}
})

electronAPI.receive('socket:disconnect', (socketId) => {
	const handler = socketHandlers[socketId]?.onDisconnect
	if (handler) {
		handler()
	} else {
		workOrderStore.updatedSocketIdConnectedStatus(`${socketId}`, false)
	}
})

electronAPI.receive('bluetooth:connected', (mac) => {
	workOrderStore.updatedBluetoothMacs(mac, true)
})

electronAPI.receive('bluetooth:disconnect', (mac) => {
	workOrderStore.updatedBluetoothMacs(mac, false)
})

electronAPI.receive('socket:message', (socketId, message) => {
	const handler = socketHandlers[socketId]?.onMessage
	if (handler) {
		handler(message)
	} else {
		console.log(`Socket message received on ${socketId}:`, message)
	}
})

electronAPI.receive(`updated:current-wifi-list`, (message: wifi.WiFiNetwork) => {
	if(selectWifi.value) return
	networkStore.updatedCurrentAvailableWifi(message)
})

electronAPI.receive(`updated:available-wifi-list`, (message: wifi.WiFiNetwork[]) => {
	if(selectWifi.value) return
	networkStore.updatedAvailableWifis(message)
})

electronAPI.receive(`upgrade:soft`, (message: UpgradeConfig | undefined) => {
	netLoginStore.updatedUpgradConfig(message)
})

electronAPI.receive('updated:device-code', (message: { [propName: string]: string }) => {
	rootStore.updatedDeviceInfo(message)
})

electronAPI.receive('system:cpu', (cpu: number) => {
	rootStore.updatedSystemInfoWithCpu(cpu)
})

electronAPI.receive('system:memory', (memory: SystemMemory) => {
	rootStore.updatedSystemInfoWithMemory(memory)
})

electronAPI.receive('system:disk', (disk: { available: number; used: number }) => {
	rootStore.updatedSystemInfoWithDisk(disk)
})

electronAPI.receive('system:version', (version: string) => {
	rootStore.updatedSystemInfoWithVersion(version)
})

electronAPI.receive('system:blueToothName', (name: string) => {
	rootStore.updatedSystemInfoWithBlueToothName(name)
})

electronAPI.receive('mqtt:loading', (loadConfig: { loadText: string; val: boolean; result?: 1 | 2; message?: string }) => {
	loading.value = {
		uuid: uuid(),
		val: loadConfig.val,
		loadText: loadConfig.loadText
	}
	// if (loadConfig.val || !loadConfig.result) return
	// const res = loadConfig.result === 1 ? '成功' : '失败'
	// ElMessage({
	// 	type: loadConfig.result === 1 ? 'success' : 'error',
	// 	message: loadConfig.message || `${loadConfig.loadText}${res}`,
	// 	grouping: true
	// })
})

electronAPI.receive(`renderer-files-request`, () => {
	const files = workOrderDataSource.getAllAndTemporaryUploadFiles()
	electronAPI.send('renderer-files-response', files)
})

electronAPI.receive(`renderer-client-request`, async (workId?: string, subWorkId?: string) => {
	let port = 0
	let host = ''
	let workDetailFileNameMap: Record<string, string[]> | undefined
	let workStatus: WorkOrderStatus | undefined

	if (currentMode.value) {
		const { ip, port: p } = currentMode.value !== 2 ? extractIpPort(currentModeIPMap.value[currentMode.value] || '') : { ip: '', port: 0 }
		port = p
		host = ip
	}

	if (workId && subWorkId) {
		workDetailFileNameMap = await workOrderDataSource.getWorkDetailToFileNames(workId, subWorkId)
		workStatus = workOrderDataSource.getWorkOrderStatusByWorkId(workId)
	}
	electronAPI.send('renderer-client-response', { host, port, mode: currentMode.value, workDetailFileNameMap, workStatus })
})

electronAPI.receive('file:sensorEid', (message: string) => {
	rootStore.updatedSensorEid(message, 0)
})

electronAPI.receive('file:0', (message: { vi: string; ir: string }) => {
	workOrderStore.updateCurrentInfraredFileStatusAndValue(message.vi, message.ir)
	electronAPI.send('file:0:done', true)
})

electronAPI.receive('files:updated:upload', (message: UploadFileInfo[]) => {
	workOrderStore.updatedFileStatusAndValue(message)
	electronAPI.send('files:updated:upload:over', true)
})

electronAPI.receive('file:save:upload:end', async (message: Map<number, number>) => {
	await workOrderStore.updatedCurrentInfraredFileStatusAndValue(message, 2)
	electronAPI.send('file:save:upload:end:over', true)
})

electronAPI.receive('file:save:upload:error', async (message: Map<number, number>) => {
	await workOrderStore.updatedCurrentInfraredFileStatusAndValue(message, 500)
	electronAPI.send('file:save:upload:error:over', true)
})

electronAPI.receive('send:points:success', (points: SubWorkOrderPoint[]) => {
	workOrderStore.taskDispatcherSuccess(points)
})

watch(() => showWifiList.value, () => {
	networkStore.selectWiFiNetwork(null)
}, { immediate: true })

onMounted(async () => {
	await recoverWorkspace()
	process.showMainWindow()
})
</script>

<template>
	<el-config-provider :locale="zhCn">
		<Layout />
		<Wifi />
		<NetWork />
		<SimpleKeyboard />
		<Loading />
		<UpgradeVersion />
	</el-config-provider>
</template>
