<script setup lang="ts" name="InfraredDetection">
import { useStores } from '@stores'
import { formatDateTime } from '@util/index'
import { process } from '@hooks/api'
import { SvgIcon } from '@components'
import workOrderDataSource from '@stores/modules/workOrderDataSource'
const { workOrder: workOrderStore, root: rootStore } = useStores()
const { points, currentFileGroupId, currentMode, currentFilesGroup, currentWorkOrder, currentSubWorkOrder, currentGroup } = storeToRefs(workOrderStore)
const { maintenanceCode } = storeToRefs(rootStore)

const srcList = ref<string[]>([])
const isCollapse = ref(false)
const showPoints = computed(() => (isCollapse.value || points.value.length <= 1 ? points.value! : [points.value[0], points.value.at(-1)]))

const onShow = (fileGroup: string) => {
	currentFileGroupId.value = fileGroup
	show.value = !show.value
}

const show = ref(false)
const actions = [
	{
		name: '重测'
	}
]

const isReDelete = ref(false)
const onSelect = () => {
	isReDelete.value = true
}

const onCancel = () => {
	currentFileGroupId.value = undefined
	isReDelete.value = false
}

const createdTemporaryFileGroup = (created?: boolean) => {
	workOrderStore.createdTemporaryFileGroup(created)
}

onMounted(() => {
	currentMode.value === 0 &&
	createdTemporaryFileGroup()
})

watch(
	() => currentFileGroupId.value,
	() => {
		isReDelete.value = false
	}
)

const handleImgError = (e: Event) => {
	const target = e.target as HTMLImageElement
	target.src = '../../../assets/imgs/error-img.svg'
}

const handMaintenanceMode = async (key: string) => {
	if (!maintenanceCode.value) return
	const workId = currentWorkOrder.value?.workId
	const subWorkId = currentSubWorkOrder.value?.subWorkId
	const pointId = points.value[0].workDetailId
	const detectMethod = currentSubWorkOrder.value?.detectMethod
	const mode = currentMode.value
	const sensorEid = maintenanceCode.value
	const groupId = currentGroup.value?.groupId

	if (!workId || !subWorkId || !pointId || !detectMethod || (!mode && mode !== 0) || !sensorEid || !groupId) {
		ElMessage.error('信息错误')
		return
	}

	const workDetailType = workOrderDataSource.getFileOfWorkDetailType(workId, subWorkId, groupId, key)
	const workDetailIndex = workOrderDataSource.getFileOfWorkDetailIndex(workId, subWorkId, groupId, key)

	await process.showOpenWorkspaceDialog(workId, subWorkId, pointId, detectMethod, mode, workDetailType, workDetailIndex, sensorEid)
}
</script>
<template>
	<el-scrollbar>
		<aside class="infrared-content">
			<h3>检测部位</h3>
			<article :class="{ infraredPoints: true, infraredPointsMinHeight: points.length >= 2, infraredPointsMore: points.length > 2, infraredPointsFlex: isCollapse }">
				<div v-for="point in showPoints" :key="point?.workDetailId" class="infrared-point-item">
					<p>
						<span class="device-name">{{ point?.deviceName }}</span>
						<span>{{ point?.detectPositionName }}</span>
					</p>
					<p>
						<img src="@assets/imgs/number.svg" alt="" srcset="" />
						<span>调度号：{{ point?.dispatchNumber }}</span>
					</p>
				</div>
			</article>
			<div v-if="points.length > 2" class="collapse-button" @click="isCollapse = !isCollapse">
				<span>{{ isCollapse ? '收起显示' : '展开更多' }}</span>
				<i-ep-caretBottom v-show="!isCollapse" />
				<i-ep-caretTop v-show="isCollapse" />
			</div>
			<h3 class="result-title">检测结果</h3>
			<article class="point-files">
				<div v-for="[key, files] in Object.entries(currentFilesGroup)" :key="key" :class="{ ['point-file-item']: true, active: currentFileGroupId === key }" @click="handMaintenanceMode(key)">
					<span>
						<em v-for="item in files" :key="item.id">
							<svg-icon v-if="item.status !== 0" class="file-status" :name="`upload-${item.status}`" size="24px" />
							<img v-if="item.fileValue && (!isReDelete || currentFileGroupId !== key)" :src="`file:///${item.fileValue}`" @error="handleImgError" @click="(item.fileValue && srcList.push(`file:///${item.fileValue}`))"/>
							<i v-else>暂无</i>
						</em>
					</span>
					<span>
						<i :class="files[0].updatedAt ? 'time' : 'tip'">{{ files[0].updatedAt ? formatDateTime(undefined, files[0].updatedAt) : '请在仪器上进行检测' }}</i>
						<van-icon v-if="files[0].fileValue && currentMode === 0 && currentWorkOrder?.status !== 2" class="more" name="weapp-nav" @click="onShow(key)" />
					</span>
				</div>
				<div v-if="currentMode === 0 && currentWorkOrder?.status !== 2" class="point-file-item" @click="createdTemporaryFileGroup(true)">
					<span>
						<em class="add">
							<van-icon name="plus" color="#0d867f" size="40px" />
						</em>
					</span>
					<span>
						<i class="tip">增测一组</i>
					</span>
				</div>
			</article>
		</aside>
	</el-scrollbar>
	<van-action-sheet v-model:show="show" class="reason-detect-sheet" :actions="actions" cancel-text="取消" close-on-click-action @select="onSelect" @cancel="onCancel" />
	<div v-if="srcList.length" class="infrared-image-viewer">
		<el-image-viewer
			v-if="srcList.length"
			:url-list="srcList"
			show-progress
			hide-on-click-modal
			@close="srcList.length = 0"
		/>
	</div>
</template>
<style lang="scss" scoped>
@use '../scss/infrared-etection.scss';
</style>
<style lang="scss">
@use '../../../themes/variables' as *;
.reason-detect-sheet {
	background-color: #f5f7fa;
	.van-action-sheet__item,
	.van-action-sheet__cancel {
		font-size: $font-size-xl;
		line-height: 50px;
		color: #646566;
		margin-bottom: 2px;
	}
}
.infrared-image-viewer{
	.el-image-viewer__canvas{
		img{
			display: inline-block !important;
		}
	}
}
</style>
