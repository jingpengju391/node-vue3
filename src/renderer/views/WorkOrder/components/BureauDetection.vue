<script setup lang="ts" name="BureauDetection">
import { SvgIcon } from '@components'
import { PointFile, PointFileStatus, SubWorkOrderPoint } from '@shared/dataModelTypes/WorkOrder'
import { useStores } from '@stores'
import { process } from '@hooks/api'
import { hasOwnProperty, quickSort } from '@util/index'
import { loading } from '@utils/loading'
const { workOrder: workOrderStore, root: rootStore } = useStores()
const { points, currentFilesGroup, currentMode, currentWorkOrder, currentSubWorkOrder, currentGroup } = storeToRefs(workOrderStore)
const { maintenanceCode } = storeToRefs(rootStore)

const isCollapse = ref<{[propsName: string]: boolean}>({})

const show = ref(false)
const actions = [
	{
		name: '增测',
		value: 1
	}
]

const temporaryPoint = ref<SubWorkOrderPoint | undefined>(undefined)
const onShow = (point: SubWorkOrderPoint | undefined) => {
	show.value = !show.value
	temporaryPoint.value = point
}
const onCancel = () => {
	temporaryPoint.value = undefined
}
const onSelect = async () => {
	loading.value = {
		uuid: 'send_detece_data',
		val: true,
		loadText: '任务下发中...'
	}
	try {
		if (!temporaryPoint.value) {
			ElMessage({
				type: 'warning',
				message: '请选择点位！',
				grouping: true
			})
			return
		}

		await workOrderStore.transmitDetectPointDataToServer(temporaryPoint.value)
		loading.value = {
			uuid: 'send_detece_data',
			val: false
		}
	} catch (error) {
		loading.value = {
			uuid: 'send_detece_data',
			val: false
		}
		ElMessage({
			type: 'error',
			message: `任务下发失败！${(error as Error).message}`,
			grouping: true
		})
	}
}

const pointInfoMap = computed<{ statusMap: { [propName: string]: { [k in PointFileStatus]: number } | object }; fileMap: { [propName: string]: PointFile[] } }>(() => {
	const fileMap: { [propName: string]: PointFile[] } = {}
	const statusMap: { [propName: string]: { [k in PointFileStatus]: number } | object } = {}
	for (const [, files] of Object.entries(currentFilesGroup.value)) {
		for (const file of files) {
			if (!fileMap[file.workDetailId]) {
				fileMap[file.workDetailId] = []
			}

			if (!hasOwnProperty(statusMap[file.workDetailId], file.status)) {
				statusMap[file.workDetailId] = {
					...statusMap[file.workDetailId],
					[file.status]: 0
				}
			}
			fileMap[file.workDetailId].push(file)
			statusMap[file.workDetailId][file.status]++
			quickSort(fileMap[file.workDetailId], 'updatedAt', true)
		}
	}
	return { fileMap, statusMap }
})

const handMaintenanceMode = async () => {
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

	const workDetailType = 2
	const workDetailIndex = 1

	await process.showOpenWorkspaceDialog(workId, subWorkId, pointId, detectMethod, mode, workDetailType, workDetailIndex, sensorEid)
}

function getFileName(path: string | undefined) {
	if (!path) {
		return '暂无数据'
	}
	const normalizedPath = path.replace(/\\/g, '/')
	return normalizedPath.split('/').pop()
}

const handlerCollapse = (point: SubWorkOrderPoint) => {
	
	if (!isCollapse.value[point.workDetailId]) {
		isCollapse.value[point.workDetailId] = false
	}

	isCollapse.value[point.workDetailId] = !isCollapse.value[point.workDetailId]

	console.log('handlerCollapse',pointInfoMap.value, isCollapse.value)
}
</script>
<template>
	<el-scrollbar>
		<aside class="bureau-content">
			<div v-for="point in points" :key="point?.workDetailId" class="point-item">
				<p class="point-status" @click="handlerCollapse(point)">
					<span class="point-status-name">{{ point?.deviceName }}</span>
					<span class="point-status-count">
						<template v-for="[key, value] in Object.entries(pointInfoMap.statusMap[point.workDetailId] || { 0: 1 })" :key="key">
							<em v-if="value > 0">
								<svg-icon :name="`upload-${key}`" size="28px" />
								<i :class="{ ['upload-count']: true, [`count-${key}`]: true }">{{ value }}</i>
							</em>
						</template>
					</span>
				</p>
				<p :class="{['point-action']: true, collapse: !isCollapse[point.workDetailId] && pointInfoMap.fileMap[point.workDetailId]?.length}" @click="handlerCollapse(point)">
					<span class="point-action-position">{{ point?.detectPositionName }}</span>
					<span class="point-action-count">调度号: {{ point?.dispatchNumber }}</span>
					<van-icon v-if="currentMode === 2 && currentWorkOrder?.status !== 2" clas="point-action-button" name="weapp-nav" @click.stop="onShow(point)" />
				</p>
				<template v-for="file in pointInfoMap.fileMap[point.workDetailId]" :key="file.workDetailId">
					<p  v-if="isCollapse[point.workDetailId]" class="point-file">
						<svg-icon name="file" size="28px" />
						<span class="point-file-name">{{ getFileName(file.fileValue) }}</span>
						<svg-icon :name="`upload-${file.status}`" size="28px" />
					</p>
				</template>
				<p v-if="!pointInfoMap.fileMap[point.workDetailId]?.length" class="point-file" @click="handMaintenanceMode()">
					<svg-icon name="file" size="28px" />
					<span class="point-file-name">暂无数据</span>
					<svg-icon name="upload-0" size="28px" />
				</p>
			</div>
		</aside>
	</el-scrollbar>
	<van-action-sheet v-model:show="show" class="reason-detect-sheet" :actions="actions" cancel-text="取消" close-on-click-action @cancel="onCancel" @select="onSelect" />
</template>
<style lang="scss" scoped>
@use '../scss/bureau-detection.scss';
</style>
