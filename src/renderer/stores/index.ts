import { defineStore } from 'pinia'
import { ModuleOption } from './definition'
import useWindowStore from './modules/window'
import useNetworkStore from './modules/network'
import useLoginStore from './modules/login'
import useWorkOrderStore from './modules/workOrder'
import { SystemMemory } from '@shared/dataModelTypes/windows'
import { isDev, process } from '@hooks/api'
import { http } from '@/hooks/api'
import { DetectMode } from '@shared/dataModelTypes/WorkOrder'

export interface State {
	workspack: { id: number }
	deviceInfo: { [propName: string]: string } | undefined
	sensorEid: { [k in DetectMode]: string } | object
	cpu: number
	memory: SystemMemory | undefined
	disk: { available: number; used: number } | undefined
	version: string
	blueToothName: string
	maintenanceCode: string
}

export type Getters = Record<string, never>

export interface Actions {
	syncClockWithTimezone: () => void
	updatedDeviceInfo: (deviceInfo: { [propName: string]: string }) => void
	updatedSensorEid: (eid: string, mode: DetectMode) => void
	updatedSystemInfoWithCpu: (cpu: number) => void
	updatedSystemInfoWithMemory: (memory: SystemMemory | undefined) => void
	updatedSystemInfoWithDisk: (disk: { available: number; used: number }) => void
	updatedSystemInfoWithVersion: (version: string) => void
	updatedSystemInfoWithBlueToothName: (blueToothName: string) => void
	updatedMaintenanceCode: (code: string) => void
}

type ModelsModule = ModuleOption<State, Getters, Actions>

const rootStoreOptions: ModelsModule = {
	persist: isDev
		? {
				storage: sessionStorage
			}
		: false,
	state: () => ({
		workspack: { id: 1 },
		deviceInfo: {
			deviceCode: '50010a010002719'
		},
		sensorEid: {},
		cpu: 0,
		memory: undefined,
		disk: undefined,
		version: '',
		blueToothName: '',
		maintenanceCode: ''
	}),
	actions: {
		async syncClockWithTimezone() {
			const { data } = await http.queryPlatformTime({ eid: Date.now().toString() })
			process.synchronizeSystemClock(data)
		},
		updatedDeviceInfo(deviceInfo) {
			this.deviceInfo = deviceInfo
		},
		updatedSensorEid(eid, mode) {
			this.sensorEid[mode] = eid
		},
		updatedSystemInfoWithCpu(cpu) {
			this.cpu = cpu
		},
		updatedSystemInfoWithMemory(memory) {
			this.memory = memory
		},
		updatedSystemInfoWithDisk(disk) {
			this.disk = disk
		},
		updatedSystemInfoWithVersion(version) {
			this.version = version
		},
		updatedSystemInfoWithBlueToothName(blueToothName) {
			this.blueToothName = blueToothName
		},
		updatedMaintenanceCode(code) {
			this.maintenanceCode = code
		}
	}
}

export const useRootStore = defineStore('root', rootStoreOptions)

export interface ModuleMap {
	root: ReturnType<typeof useRootStore>
	window: ReturnType<typeof useWindowStore>
	network: ReturnType<typeof useNetworkStore>
	login: ReturnType<typeof useLoginStore>
	workOrder: ReturnType<typeof useWorkOrderStore>
}

export const useStores = () => ({
	root: useRootStore(),
	window: useWindowStore(),
	network: useNetworkStore(),
	login: useLoginStore(),
	workOrder: useWorkOrderStore()
})

export const recoverWorkspace = async () => {
	const { login, root, workOrder } = useStores()
	await Promise.all([login.recoverDefaultWorkspaceFromDB(root.workspack.id), login.recoverDictDefaultWorkspaceFromDB(root.workspack.id), workOrder.recoverDefaultWorkspaceFromDB(root.workspack.id)])
}
