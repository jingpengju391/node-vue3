<script setup lang="ts" name="DetectPoint">
import { useRouter } from 'vue-router'
import { useStores } from '@stores'
import InfraredDetection from '../components/InfraredDetection.vue'
import BureauDetection from '../components/BureauDetection.vue'
import { loading } from '@/utils/loading'
const router = useRouter()
const { workOrder: workOrderStore } = useStores()
const { currentGroup, groups, points, currentMode, currentWorkOrder } = storeToRefs(workOrderStore)

const next = () => {
	if (groups.value.length === 0) return

	const currentIndex = groups.value.findIndex((group) => group.groupId === currentGroup.value?.groupId)

	const nextIndex = (currentIndex + 1) % groups.value.length
	const nextGroup = groups.value[nextIndex]

	if (nextGroup) {
		const { workId, subWorkId, groupId } = nextGroup
		workOrderStore.updatedCurrentGroup(workId, subWorkId, groupId)
		currentMode.value === 0 &&
		workOrderStore.createdTemporaryFileGroup()
	}
}

const prev = () => {
	if (groups.value.length === 0) return

	let currentIndex = groups.value.findIndex((group) => group.groupId === currentGroup.value?.groupId)

	if (currentIndex === -1) currentIndex = 0

	const prevIndex = (currentIndex - 1 + groups.value.length) % groups.value.length
	const prevGroup = groups.value[prevIndex]

	if (prevGroup) {
		const { workId, subWorkId, groupId } = prevGroup
		workOrderStore.updatedCurrentGroup(workId, subWorkId, groupId)
		currentMode.value === 0 &&
		workOrderStore.createdTemporaryFileGroup()
	}
}

const transmitDetectDataToServer = async () => {
	try {
		loading.value = {
			uuid: 'send_task_point',
			val: true,
			loadText: '任务下发中...'
		}
		await workOrderStore.transmitDetectDataToServer([currentGroup.value!.groupId])
	} catch (error) {
		ElMessage({
			type: 'error',
			message: `任务下发失败！${(error as Error).message}`,
			grouping: true
		})
	}

	loading.value = {
		uuid: 'send_task_point',
		val: false
	}
}

const onSure = () => {
	ElMessageBox.confirm('将当前分组检测任务推送到检测仪器', '任务推送', {
		distinguishCancelAndClose: true,
		confirmButtonText: '确定',
		cancelButtonText: '取消',
		showClose: false
	})
		.then(() => {
			transmitDetectDataToServer()
		})
		.catch(() => {})
}
</script>
<template>
	<van-nav-bar :title="`分组点位数: ${points.length}`" @click-left="router.push({ name: 'WorkOrder-Groups' })">
		<template #left>
			<van-icon name="arrow-left" />
		</template>
		<template v-if="currentMode === 2 && currentWorkOrder?.status !== 2" #right>
			<van-button type="primary" @click="onSure">推送任务</van-button>
		</template>
	</van-nav-bar>
	<component :is="currentGroup?.detectMethod === 6 ? InfraredDetection : BureauDetection" />
	<aside class="button-box">
		<span @click="prev">上一组</span>
		<span @click="next">下一组</span>
	</aside>
</template>
<style lang="scss" scoped>
@use '../../../themes/variables' as *;
.button-box {
	display: flex;
	width: 100%;
	font-size: $font-size-lg;
	gap: 2px;
	margin-top: auto;
	span {
		flex: 1;
		text-align: center;
		color: #333;
		background: #fff;
		line-height: 80px;
	}
	span:last-child {
		color: $dominant-color;
	}
}
</style>
