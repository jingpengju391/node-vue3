<script setup lang="ts">
import { useRoute } from 'vue-router'
import { process, isMac, isLinux, isDev } from '@hooks/api'
import { useStores } from '@stores'
import { SvgIcon } from '@/components'
import { SignalType } from '@shared/dataModelTypes/socket'
import { hasOwnProperty } from '@util'
import { getNetWorkInfo, getSignalLevel } from '@utils/netWork'

const currentRoute = useRoute()
const _white = computed(() => (currentRoute.path === '/LoginView' ? '_white' : ''))

const { window: windowStore, network: networkStore, workOrder: workOrderStore } = useStores()

const { minimize } = storeToRefs(windowStore)
const { communication, blueTooth, currentAvailableWifi } = storeToRefs(networkStore)
const { pendingUploadCount } = storeToRefs(workOrderStore)

const handleMize = () => {
	minimize.value ? process.maximize() : process.restore()
	windowStore.updatedMinimize()
}

const signalType = computed<string>(() => {
	return communication.value?.cmd === SignalType.wapi ? 'wapi' : communication.value?.data?.mobile?.toLocaleUpperCase() || ''
})

const isConnectBlueTooth = computed<boolean>(() => hasOwnProperty(blueTooth.value?.data, 'connect'))

const netInfo = ref<NetworkInformationMode>({ type: '无服务', rtt: 0, downlink: 0 })
const signal = computed<number>(() => {
	if (!netInfo.value.rtt) return 0
	return {
		['2g']: 3,
		['3g']: 4,
		['4g']: 5,
		['slow-2g']: 1,
		['无服务']: 0
	}[netInfo.value.type]
})

const updateWithNetWork = () => (netInfo.value = getNetWorkInfo())

const close = () => {
	ElMessageBox.alert(`确认退出程序吗？`, {
		confirmButtonText: '确认',
		cancelButtonText: '取消',
		showCancelButton: true,
		center: true
	}).then(async () => {
		process.close()
	})
}

onMounted(() => {
	if (isLinux) return
	updateWithNetWork()
	window.addEventListener('online', updateWithNetWork)
	window.addEventListener('offline', updateWithNetWork)
	navigator.connection?.addEventListener('change', updateWithNetWork)
})
</script>

<template>
	<div :class="[{ headHgWhite: _white !== '_white' }, 'container']">
		<div class="container-click" @click="networkStore.toggleNetNaviViewDisplay">
			<i-ep-close v-show="!isMac" class="close" color="#0d867f" @click.stop="close()" />
			<svg-icon v-show="!isMac && isDev" color="#0d867f" size="38" :name="minimize ? 'maximize' : 'restore'" @click.stop="handleMize()" />
			<svg-icon :class="{rightAuto: !pendingUploadCount}" v-show="!isMac" color="#0d867f" name="suoxiao" @click.stop="process.minimize()" />
			<div v-if="pendingUploadCount" :class="{ ['wait-upload']: true, ['wait-upload-none']: !pendingUploadCount, ['box-auto']: true }">
				<i class="wait-upload-icon"></i>
				<span>{{ pendingUploadCount }}</span>
			</div>
			<svg-icon v-show="isConnectBlueTooth" color="#0d867f" name="lanya" @click.stop="process.minimize()" />
			<svg-icon :name="`wifi_${getSignalLevel(currentAvailableWifi?.quality)}${_white}`" />
			<div>
				<svg-icon :name="`mobile_${isLinux ? getSignalLevel(communication?.data.csq) : signal}${_white}`" />
				<span :class="`signal-type${_white}`">{{ isLinux ? signalType : netInfo.type.toUpperCase() }}</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use './header.scss';
</style>
