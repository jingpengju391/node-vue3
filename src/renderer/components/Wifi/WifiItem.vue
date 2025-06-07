<script setup lang="ts">
import wifi from 'node-wifi'
import { process } from '@hooks/api'
import { SvgIcon } from '@/components'
import { WifiConnectStatus, WifiCS, WifiCSCode, WifiIsOpen } from '@shared/dataModelTypes/socket'
import { useStores } from '@stores'
import { hasOwnProperty } from '@util/index'
const { network: networkStore } = useStores()
const { selectWifi } = storeToRefs(networkStore)

enum ConnectZhMap {
	next = '下一步',
	connect = '连接',
	disconnect = '断开连接'
}

const hasPassword = computed<boolean>(() => hasOwnProperty(selectWifi.value, 'password'))

const props = withDefaults(defineProps<{ item: wifi.WiFiNetwork; currentData: wifi.WiFiNetwork | undefined }>(), {
	item: undefined,
	currentData: undefined
})

const getSignalLevel = (score: number | string | undefined) => {
	score = score ? Number(score) : 0
	return Math.min(score === 0 ? 0 : Math.ceil(score / 20), 5)
}

const iSelect = computed<boolean>(() => !!(selectWifi.value && selectWifi.value?.ssid === props.item.ssid))

const connect = computed<WifiConnectStatus | WifiIsOpen | null>(() => {
	if (props.currentData?.ssid === props.item.ssid) {
		return WifiConnectStatus.connected
	}

	if (!iSelect.value) return null

	return props.item.isOpenNetwork ? WifiIsOpen.isOpen : WifiIsOpen.notOpen
})

const connectTXT = computed<ConnectZhMap>(() => {
	if (props.currentData && selectWifi.value?.ssid === props.currentData.ssid) {
		return ConnectZhMap.disconnect
	}
	return hasPassword.value ? ConnectZhMap.next : ConnectZhMap.connect
})

const connectResult = ref<{ code?: WifiCSCode; message?: string; loading: boolean }>({ loading: false })
const connectWifiBySelect = async () => {
	if (!selectWifi.value) {
		// connect wiifi fail, not find select target wifi
		return
	}

	if (connectTXT.value === ConnectZhMap.disconnect) {
		// disconnect wifi
		await process.disconnectWifi()
		networkStore.updatedCurrentAvailableWifi(undefined)
		networkStore.selectWiFiNetwork(null)
		return
	}

	connectResult.value.loading = true

	if (props.currentData) {
		await process.disconnectWifi()
	}

	try {
		const result = await process.connectAvailableWifi({
			ssid: selectWifi.value.ssid,
			password: selectWifi.value.password
		})
		networkStore.updatedCurrentAvailableWifi(result)
		connectResult.value = { ...WifiCS['SUCCESS'], loading: false }
		networkStore.selectWiFiNetwork(null)
	} catch (error) {
		const KEYCODE = (error as { message: string }).message.split(':').at(-1)?.trim() || 'PASSWORD_ERROR'
		connectResult.value = { ...WifiCS[KEYCODE], loading: false }
		if (!hasPassword.value && !selectWifi.value.isOpenNetwork) {
			networkStore.selectWiFiNetwork({ ...selectWifi.value, password: '' })
			return
		}
	}
}
</script>
<template>
	<div :class="[{ active: iSelect }, 'content-box']">
		<div class="item-box" @click="networkStore.selectWiFiNetwork(item, item.ssid === selectWifi?.ssid)">
			<i-ep-select v-show="connect === WifiConnectStatus.connected && selectWifi?.ssid !== currentData?.ssid" class="item-select" color="#0d867f" />
			<div class="left">
				<h2>{{ item.ssid || '隐藏的网络' }}</h2>
				<em v-show="connect">{{ connect }}</em>
			</div>
			<svg-icon class="wifi-icon" color="#0d867f" :name="`wifi_${getSignalLevel(item?.quality)}${iSelect ? '_white' : ''}`" />
		</div>
		<div v-show="iSelect" class="connect-box">
			<em v-show="item.isOpenNetwork">其他人可能会看到你通过此网络发送的信息</em>
			<i v-show="connectResult.loading">正在检查网络要求<i class="loader"></i></i>
			<div v-if="connectResult.code !== 200 && hasPassword && !connectResult.loading && !currentData?.ssid" class="load-info">
				<i v-show="connectResult.code !== 501">输入网络安全密钥</i>
				<el-input v-show="connectResult.code !== 501" v-model="selectWifi!.password" v-keyboard type="password" clearable show-password size="large" />
				<el-text v-show="connectResult.code !== 504" class="mx-1" type="info">{{ connectResult.message }}</el-text>
			</div>
			<div class="button-group-box">
				<van-button type="primary" @click.stop="networkStore.selectWiFiNetwork(null)">取消</van-button>
				<van-button type="primary" :disabled="(!selectWifi?.password && connectTXT === ConnectZhMap.next) || connectResult.loading" @click.stop="connectWifiBySelect">{{
					connectTXT
				}}</van-button>
			</div>
		</div>
	</div>
</template>
<style lang="scss" scoped>
@use './item.scss';
</style>
