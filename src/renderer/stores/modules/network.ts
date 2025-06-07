import { defineStore } from 'pinia'
import wifi from 'node-wifi'
import { ModuleOption } from '../definition'
import { NetWorkInformation, BlueTooth } from '@shared/dataModelTypes/socket'
import { isDev } from '@/hooks/api'

export interface State {
	communication: NetWorkInformation | undefined
	blueTooth: BlueTooth | undefined
	currentAvailableWifi: wifi.WiFiNetwork | undefined
	availableWifis: wifi.WiFiNetwork[]
	showWifiList: boolean
	showNetWork: boolean
	openwifi: boolean
	selectWifi: wifi.WiFiNetwork | null
}

export type Getters = Record<string, never>

export interface Actions {
	updatedCommunication: (communication: NetWorkInformation | undefined) => void
	clearCommunication: () => void
	updatedBlueTooth: (blueTooth: BlueTooth | undefined) => void
	clearBlueTooth: () => void
	updatedCurrentAvailableWifi: (wifi: wifi.WiFiNetwork | undefined) => void
	updatedAvailableWifis: (wifis: wifi.WiFiNetwork[]) => void
	toggleWifiNaviViewDisplay: (hide: boolean) => void
	toggleNetNaviViewDisplay: () => void
	toggleWifiNaviViewTurnOff: () => void
	selectWiFiNetwork: (select: wifi.WiFiNetwork | null, isAssign?: boolean) => void
	changeSelectwifiValue: (val: string) => void
}

type ModelsModule = ModuleOption<State, Getters, Actions>

const networkStoreOptions: ModelsModule = {
	persist: isDev
		? {
				storage: sessionStorage
			}
		: false,
	state: () => ({
		communication: undefined,
		blueTooth: undefined,
		currentAvailableWifi: undefined,
		availableWifis: [],
		showWifiList: false,
		showNetWork: false,
		openwifi: true,
		selectWifi: null
	}),
	actions: {
		updatedCommunication(communication) {
			this.communication = communication
		},
		clearCommunication() {
			this.communication = undefined
		},
		updatedBlueTooth(blueTooth) {
			this.blueTooth = blueTooth
		},
		clearBlueTooth() {
			this.blueTooth = undefined
		},
		updatedCurrentAvailableWifi(wifi) {
			this.currentAvailableWifi = wifi
			if (!this.currentAvailableWifi) return
			const findIndex = this.availableWifis.findIndex((wifi) => wifi.ssid === this.currentAvailableWifi!.ssid)
			this.availableWifis.splice(findIndex, 1)
			this.availableWifis.unshift(this.currentAvailableWifi)
		},
		updatedAvailableWifis(wifis) {
			this.availableWifis = wifis
		},
		toggleWifiNaviViewDisplay(isHide) {
			this.showWifiList = isHide
		},
		toggleNetNaviViewDisplay() {
			this.showNetWork = !this.showNetWork
		},
		toggleWifiNaviViewTurnOff() {
			this.openwifi = !this.openwifi
		},
		selectWiFiNetwork(select, isAssign = false) {
			this.selectWifi = isAssign ? Object.assign({}, this.selectWifi, select) : select
		},
		changeSelectwifiValue(val) {
			if (this.selectWifi) {
				this.selectWifi.password = val
			}
		}
	}
}

export default defineStore('network', networkStoreOptions)
