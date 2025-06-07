<script setup lang="ts" name="Groups">
import { useRouter } from 'vue-router'
import { useStores } from '@stores'
import workOrderDataSource from '@/stores/modules/workOrderDataSource'
import {getTTStext} from '@/stores/modules/workOrderDataSource'
import { generateSearchOptions } from '@shared/functional/index'
import { VirtualList } from '@components'
import GroupItem from './GroupItem.vue'
import { loading } from '@/utils/loading'
import { process } from '@hooks/api'
import { sleep } from '@util'

const router = useRouter()

const { workOrder: workOrderStore } = useStores()
const { currentWorkOrder, currentSubWorkOrder, groups, currentGroup, currentMode, currentModeIPMap, socketIdConnected, voiceGuide, bluetoothMacs, completePointCount, deviceTypeName, voltageLevel, points, searchValue } = storeToRefs(workOrderStore)

const isShowSearch = ref(false)
const options = ref()
const showNotice = ref(false)

const title = computed(() => {
	const workId = currentWorkOrder.value?.workId
	const subWorkId = currentSubWorkOrder.value?.subWorkId
	if (!workId || !subWorkId) return ''
	const count = workOrderDataSource.getPointCountOfSubWorkOrder(workId, subWorkId)
	return `${currentSubWorkOrder.value?.detectMethodCn}(${completePointCount.value}/${count})`
})

const cancel = () => {
	isShowSearch.value = false
	workOrderStore.clearSearchValue()
}

const currentIndex = computed(() => groups.value.findIndex((item) => item.groupId === currentGroup.value?.groupId))

const isConnected = computed(() => {
	if (currentMode.value === 2) {
		return !!bluetoothMacs.value.length
	}
	if (!currentModeIPMap.value || (!currentMode.value && currentMode.value !== 0)) return false
	return socketIdConnected.value[currentModeIPMap.value![currentMode.value!]!]
})

const showPopover = ref(false)

const transmitDetectDataToServer = async () => {
	try {
		loading.value = {
			uuid: 'send_task',
			val: true,
			loadText: '任务下发中...'
		}
		showPopover.value = false
		await workOrderStore.transmitDetectDataToServer([])
	} catch (error) {
		ElMessage({
			type: 'error',
			message: '设备接收下发任务失败！',
			grouping: true
		})
	}

	loading.value = {
		uuid: 'send_task',
		val: false
	}
}

watch(
	() => voiceGuide.value,
	(newVal) => {
		process.updatedTTS(newVal)
		if (newVal) {
			if(!currentGroup.value || currentMode.value !== 0) return
			const workId = currentWorkOrder.value!.workId
			const subWorkId = currentSubWorkOrder.value!.subWorkId
			const countMap = workOrderDataSource.getFileStatusCountMap(workId, subWorkId, currentGroup.value!.groupId)
			if (countMap[0] === 0) return
			const total = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, currentMode.value, currentGroup.value).length
			const text = getTTStext(points.value, total)
			currentWorkOrder.value?.status !==2 &&
			text && process.startTTS(text)
		}else{
			process.stopTTS()
		}
	},
	{ immediate: true }
)

watch(
	() => isConnected.value,
	async (newVal) => {
		if(newVal && currentMode.value === 0){
			showNotice.value = true
			await sleep(5000)
			showNotice.value = false
		}
	},
	{ immediate: true }
)

onMounted(async () => {
	workOrderDataSource.deleteTemporaryFileForInfrared()
	workOrderStore.prepareGroupedDetectionPoints()
	const os = generateSearchOptions(groups.value, ['deviceTypeName', 'voltageLevel'], 'text')
	options.value = {
		deviceTypeName: [
			{
				text: '全部',
				value: '设备类型'
			},
			...(os.deviceTypeName || [])
		],
		voltageLevel: [
			{
				text: '全部',
				value: '电压等级'
			},
			...(os.voltageLevel || [])
		]
	}
})
</script>

<template>
	<van-nav-bar :title="title" @click-left="router.push({ name: 'WorkOrder-DetectMethod' })">
		<template #left>
			<van-icon name="arrow-left" />
		</template>
		<template #right>
			<i-ep-search v-if="!isShowSearch" @click="isShowSearch = !isShowSearch"></i-ep-search>
			<van-popover v-if="currentMode !== 2" v-model:show="showPopover" overlay class="group-more-icon">
				<aside class="more-action">
					<div v-if="currentMode === 0" class="voice-guide">
						<h2>语音引导</h2>
						<el-switch v-model="voiceGuide" size="large" />
					</div>
					<span v-if="currentMode === 0" class="describe voice-guide-describe">关闭后会同步关闭分组自动跳转。</span>
					<div v-if="currentMode === 1 || currentMode === 3" class="task-send">
						<h2>任务推送</h2>
						<van-button type="primary" @click="transmitDetectDataToServer">推送</van-button>
					</div>
					<span v-if="currentMode === 1 || currentMode === 3" class="describe">将检测任务数据整体推送给检测仪器。</span>
				</aside>
				<template #reference>
					<van-icon name="weapp-nav" />
				</template>
			</van-popover>
		</template>
	</van-nav-bar>
	<el-input v-if="isShowSearch" v-model="searchValue" v-keyboard clearable placeholder="设备名称" class="input-with-select" @input="workOrderStore.updatedGroupsBySearch">
		<template #prefix>
			<i-ep-search></i-ep-search>
		</template>
		<template #append>
			<div @click="cancel()">取消</div>
		</template>
	</el-input>
	<van-dropdown-menu class="dropdown-menu">
		<van-dropdown-item v-model="deviceTypeName" :title-class="deviceTypeName !== '设备类型' ? 'active' : ''" :title="deviceTypeName" :options="options?.deviceTypeName || []"  @change="workOrderStore.updatedGroupsBySearch"/>
		<van-dropdown-item v-model="voltageLevel" :title-class="voltageLevel !== '电压等级' ? 'active' : ''" :title="voltageLevel" :options="options?.voltageLevel || []"  @change="workOrderStore.updatedGroupsBySearch"/>
	</van-dropdown-menu>
	<van-notice-bar v-if="!isConnected" left-icon="info-o" text="检测仪器已断开！" />
	<van-notice-bar v-if="showNotice" left-icon="info-o" text="请确保仅有本设备连接红外检测仪器，避免卡顿！" />
	<virtual-list :list="groups" :current-index="currentIndex" class="container-group">
		<template #default="{ item, index }">
			<group-item :item="item" :current-data="currentGroup" :is-last="index === groups.length - 1" />
		</template>
	</virtual-list>
</template>
<style lang="scss" scoped>
@use '../scss/group.scss';
</style>
