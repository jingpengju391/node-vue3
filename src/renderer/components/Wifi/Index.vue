<script lang="ts" setup>
import { useStores } from '@stores'
import { debounce, deepClone, retryWithExponentialBackoff } from '@util'
import WifiItem from './WifiItem.vue'
import { electronAPI, process } from '@hooks/api'

const { network: networkStore } = useStores()
const { showWifiList, availableWifis, currentAvailableWifi, openwifi } = storeToRefs(networkStore)

const containerOrderNode = useTemplateRef<HTMLDivElement | null>('containerOrder')
const height = ref<number>(0)

const setHeight = debounce(() => {
	height.value = containerOrderNode.value?.offsetHeight || 0
}, 500)

const watchWifiOpen = async () => {
	await process.scanWifiInformation()
	try {
		const availableWifiList = await retryWithExponentialBackoff(
			() => {
				if (!availableWifis.value.length) throw new Error('wifis list empty')
				return availableWifis.value
			},
			3,
			0,
			false
		)

		const wifi = await process.autoConnectAvailableWifi(
			deepClone({
				currentConnection: currentAvailableWifi.value,
				availableWifiList
			})
		)
		networkStore.updatedCurrentAvailableWifi(wifi)
	} catch (error) {
		console.log(error)
	}
}

const watchWifiClose = () => {
	networkStore.updatedCurrentAvailableWifi(undefined)
	networkStore.updatedAvailableWifis([])
	networkStore.selectWiFiNetwork(null)
	process.disconnectWifi()
}

onMounted(() => setHeight())
electronAPI.receive('window-change-resize', setHeight)

watch(
	() => openwifi.value,
	async (newValue) => {
		process.updatedScanCurrentwifi(newValue)
		process.updatedSwitchWithAvailablewifi(newValue)
		if (newValue) {
			watchWifiOpen()
		} else {
			watchWifiClose()
		}
	},
	{ immediate: true }
)
</script>
<template>
	<el-drawer v-model="showWifiList" modal-class="wifi-adrawer-modal" :show-close="false" :modal="false" size="100%">
		<template #header="{ close }">
			<div class="header-box">
				<div class="header-top">
					<i-ep-arrow-left-bold color="#333333" @click="close" />
					<h2>Wi-Fi连接</h2>
					<em></em>
				</div>
				<div class="header-btm">
					<h2>开启Wi-Fi</h2>
					<el-switch v-model="openwifi" size="large" />
				</div>
				<el-text v-show="!openwifi" class="mx-1" size="large">想要连接Wi-Fi，请打开Wi-Fi开关</el-text>
			</div>
		</template>
		<div v-show="openwifi" ref="containerOrder" class="container-order">
			<el-scrollbar class="container-scrollbar" :height="height">
				<wifi-item v-for="item in availableWifis" :key="item.ssid" :item="item" :current-data="currentAvailableWifi" />
			</el-scrollbar>
		</div>
	</el-drawer>
</template>
<style lang="scss">
@use './wifi.scss';
</style>
