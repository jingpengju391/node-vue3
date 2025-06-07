<script setup lang="ts" name="UndetectedPoints">
import { useRouter } from 'vue-router'
import { useStores } from '@stores'
import { VirtualList } from '@components'
import loginDataSource from '@stores/modules/loginDataSource'
const { workOrder: workOrderStore, login: loginStore } = useStores()
const { subWorkOrders, pointBasics } = storeToRefs(workOrderStore)
const { dicts } = storeToRefs(loginStore)
const router = useRouter()

const deviceMethod = ref('检测方法')
const reasonNotDetect = ref('标记状态')
const reasonDetectType = ref<{ type: 0 | 1; workDetailId: string } | undefined>(undefined)

const options = computed(() => {
	return {
		deviceMethod: [
			{
				text: '全部',
				value: '检测方法'
			},
			...subWorkOrders.value.map((subwork) => {
				return {
					text: subwork.detectMethodCn,
					value: subwork.detectMethodCn
				}
			})
		],
		deviceStatus: [
			{
				text: '全部',
				value: '标记状态'
			},
			{
				text: '已标记',
				value: '已标记'
			},
			{
				text: '待标记',
				value: '待标记'
			}
		]
	}
})

const list = computed(() =>
	pointBasics.value.filter((item) => {
		const isDeviceMethod = deviceMethod.value === '检测方法' || item.detectMethodCn === deviceMethod.value
		const isReasonNotDetect = reasonNotDetect.value === '标记状态' || (reasonNotDetect.value === '已标记' ? !!item.reasonNotDetect : !item.reasonNotDetect)
		return isDeviceMethod && isReasonNotDetect
	})
)

const checks = ref<string[]>([])

const toggleAllCheckboxEvent = () => {
	if (checks.value.length === list.value.length) {
		checks.value.length = 0
	} else {
		checks.value.length = 0
		checks.value.push(...list.value.map((l) => l.workDetailId))
	}
}

const toggleCheckboxEvent = (workDetailId: string) => {
	const index = checks.value.indexOf(workDetailId)
	if (index !== -1) {
		checks.value.splice(index, 1)
	} else {
		checks.value.push(workDetailId)
	}
}

const show = ref(false)
const actions = computed(() => dicts.value.filter((d) => d.dictCode !== '554784874923978752').map((dict) => ({ name: dict.dictLabel, value: dict.dictValue })))

const onShow = (action: { type: 0 | 1; workDetailId: string }) => {
	if(!checks.value.length) return
	show.value = !show.value
	reasonDetectType.value = action
}
const onCancel = () => {}
const onSelect = (action: { name: string; value: string }) => {
	if (!reasonDetectType.value) {
		return
	}
	if (!reasonDetectType.value!.type) {
		for (const l of list.value) {
			if (checks.value.includes(l.workDetailId)) {
				l.reasonNotDetect = action.value
			}
		}
	} else {
		const findResult = list.value.find((l) => l.workDetailId === reasonDetectType.value?.workDetailId)
		findResult && (findResult.reasonNotDetect = action.value)
	}
}

const onSubmit = () => {
	const reasonNotDetectPoints = pointBasics.value.filter((point) => !point.reasonNotDetect)
	if (reasonNotDetectPoints.length) {
		showToast(`有${reasonNotDetectPoints.length}个点位尚未标记末检测原因`)
		return
	}
	ElMessageBox.confirm('是否确认提交？', '提示', {
		distinguishCancelAndClose: true,
		confirmButtonText: '确定',
		cancelButtonText: '取消',
		showClose: false
	})
		.then(async () => {
			try {
				await workOrderStore.submitWorkOrderWidthPointReasonToPlatform()
				router.push({ name: 'WorkOrder' })
			} catch (error) {
				ElMessage({
					type: 'error',
					message: (error as Error).message,
					grouping: true
				})
			}
		})
		.catch(() => {})
}

onMounted(() => {
	toggleAllCheckboxEvent()
})
</script>
<template>
	<van-nav-bar title="未检测点位说明" @click-left="router.go(-1)">
		<template #left>
			<van-icon name="arrow-left" />
		</template>
	</van-nav-bar>
	<van-dropdown-menu class="dropdown-menu">
		<van-dropdown-item v-model="deviceMethod" :title-class="deviceMethod !== '检测方法' ? 'active' : ''" :title="deviceMethod" :options="options?.deviceMethod || []" />
		<van-dropdown-item v-model="reasonNotDetect" :title-class="reasonNotDetect !== '标记状态' ? 'active' : ''" :title="reasonNotDetect" :options="options?.deviceStatus || []" />
	</van-dropdown-menu>
	<aside class="select-all">
		<em :class="{ ['select-icon']: true, ['is-select']: checks.length === list.length }" @click="toggleAllCheckboxEvent()"></em>
		<h3>全选</h3>
		<span @click="onShow({ type: 0, workDetailId: '' })">批量标记</span>
	</aside>
	<virtual-list :list="list" class="container-order">
		<template #default="{ item }">
			<aside class="point-item">
				<em :class="{ ['select-icon']: true, ['is-select']: checks.indexOf(item.workDetailId) !== -1 }" @click="toggleCheckboxEvent(item.workDetailId)"></em>
				<div class="device-card">
					<p class="device-reason">
						<span class="device-name">{{ item.deviceName }}</span>
						<span class="device-method">{{ item.detectMethodCn }}</span>
						<span class="device-position">{{ item.detectPositionName }}</span>
					</p>
					<p class="device-value" @click="onShow({ type: 1, workDetailId: item.workDetailId })">
						<span :class="{reasonNotDetect: !!loginDataSource.getDictionaryEncodesByCode(item.reasonNotDetect)?.dictLabel}">{{ loginDataSource.getDictionaryEncodesByCode(item.reasonNotDetect)?.dictLabel || '请选择未检测原因' }}</span>
						<van-icon name="arrow-down" />
					</p>
				</div>
			</aside>
		</template>
	</virtual-list>
	<div class="submit-work-order">
		<van-button class="submit-work-order-button" size="large" type="primary" @click="onSubmit()">提交</van-button>
	</div>
	<van-action-sheet v-model:show="show" class="reason-detect-sheet" :actions="actions" cancel-text="取消" close-on-click-action @cancel="onCancel" @select="onSelect" />
</template>
<style lang="scss" scoped>
@use '../scss/undetected-points.scss';
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
</style>
