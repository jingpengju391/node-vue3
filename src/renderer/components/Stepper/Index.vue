<script setup lang="ts">
import { process } from '@hooks/api'
import { useStores } from '@stores'
import { SvgIcon } from '@/components'
import { getSignalLevel } from '@/utils/netWork'
import { hasOwnProperty, sleep } from '@util'
import { SignalType } from '@shared/dataModelTypes/socket'

type NetStatus = {
	status: 'exclamation-mark' | 'loader-mark' | 'check-mark'
	info: string
}

const { network: networkStore } = useStores()
const { showNetWork, currentAvailableWifi, openwifi, communication } = storeToRefs(networkStore)

const isMobile = computed<boolean>(() => connecting.value?.type === SignalType.mobile)
const isWapi = computed<boolean>(() => connecting.value?.type === SignalType.wapi)
const isMobileNet = computed<boolean>(() => !!communication.value?.cmd.toLocaleUpperCase().includes('5G'))
const isWapiNet = computed<boolean>(() => !!communication.value?.cmd.toLocaleUpperCase().includes('WAPI'))

const openWifiList = () => {
	networkStore.toggleNetNaviViewDisplay()
	networkStore.toggleWifiNaviViewDisplay(true)
}

const link_wifi_info = computed(() => {
	if (!openwifi.value) {
		return '未开启'
	} else {
		return currentAvailableWifi.value?.ssid ? `已连接：${currentAvailableWifi.value?.ssid}` : '未连接任何网络'
	}
})

const connecting = ref<{ type: SignalType; errorinfo?: string } | null>(null)

const switchNetwork = async (type: SignalType, isrefresh?: boolean) => {
	if (connecting.value && !isrefresh) {
		return
	}

	if (communication.value?.cmd.toLocaleUpperCase() === type.toLocaleUpperCase()) {
		return
	}

	networkStore.clearCommunication()
	connecting.value = { type }
	const errorinfo = await process.switchNetwork(type)
	await sleep(errorinfo ? 0 : 10000)
	connecting.value = errorinfo ? { type, errorinfo } : null
}

const netStatus = computed<NetStatus>(() => {
	if ((connecting.value && !hasOwnProperty(connecting.value, 'errorinfo')) || communication.value?.data.simCardNum === 'loading') {
		const n_s = connecting.value?.type || communication.value?.cmd
		const [name] = n_s!.split(' ')
		return {
			status: 'loader-mark',
			info: `${name.toLocaleUpperCase()}网络连接中…`
		}
	}

	if (connecting.value && hasOwnProperty(connecting.value, 'errorinfo')) {
		return {
			status: 'exclamation-mark',
			info: connecting.value.errorinfo || ''
		}
	}

	if (communication.value?.data.simCardNum === 'error') {
		return {
			status: 'exclamation-mark',
			info: 'SIM卡未识别，请重新插拔并等待1min后重试'
		}
	}

	if (communication.value && !['loading', 'error'].includes(communication.value!.data.simCardNum!)) {
		const [name] = communication.value.cmd.split(' ')
		return {
			status: 'check-mark',
			info: `${name.toLocaleUpperCase()}网络已启动！`
		}
	}

	return {
		status: 'exclamation-mark',
		info: '未连接网络，请选择合适网络！'
	}
})

const refreshNetwork = () => {
	if (!connecting.value?.type) {
		return
	}

	switchNetwork(connecting.value.type, true)
}
</script>

<template>
	<el-drawer v-model="showNetWork" modal-class="network-adrawer-modal" direction="btt" :show-close="false" size="80%">
		<template #header="{ close }">
			<div class="header-box">
				<van-icon class="close-network" name="arrow-down" @click="close" />
				<div class="network-status">
					<div :class="netStatus.status"></div>
					{{ netStatus.info }}
				</div>
				<div v-show="!communication && connecting?.errorinfo" class="refresh-network" @click="refreshNetwork">
					<!-- <i-ep-warn-triangle-filled color="#f56c6c" /> -->
					刷新试试
				</div>
				<div class="switch-box">
					<div :class="{ switchBtn: isMobile || isMobileNet, connectNet: isMobileNet }" @click="switchNetwork(SignalType.mobile)">5G</div>
					<div :class="{ switchBtn: isWapi || isWapiNet, connectNet: isWapiNet }" @click="switchNetwork(SignalType.wapi)">WAPI</div>
				</div>
			</div>
		</template>
		<div class="content-box">
			<div class="wifi-box" @click="openWifiList()">
				<div :class="openwifi ? 'wifi-icon' : 'wifi-icon wifi-icon-off'" @click.stop="networkStore.toggleWifiNaviViewTurnOff()">
					<svg-icon :name="`wifi_${getSignalLevel(currentAvailableWifi?.quality)}_white`" />
				</div>
				<div class="wifi-info">
					<span>Wi-Fi</span>
					<span>{{ link_wifi_info }}</span>
				</div>
				<van-icon class="right-t" name="arrow" />
			</div>
			<div class="wait-upload-box wait-upload-none">
				<i class="wait-upload-icon"></i>
				<span>待上传数量</span>
				<span>0</span>
			</div>
		</div>
	</el-drawer>
</template>
<style lang="scss" scoped>
@use './index.scss';
@use '../Header/header.scss';
</style>
