<script setup lang="ts">
import { VirtualList } from '@components'
import { debounce } from '@util/index'
import { useStores } from '@stores'
import { electronAPI } from '@hooks/api'
import { http } from '@hooks/api'
import { potWork, potWorkReq } from '@server/potAPIs'
import { loading } from '@/utils/loading'
import WorkOrderItem from './WorkOrderItem.vue'

const { login: loginStore, root: rootStore } = useStores()
const { user } = storeToRefs(loginStore)
const { deviceInfo } = storeToRefs(rootStore)
const userId = user.value?.userId || ''
const searchOrder = ref<string>('')
const active = ref(-1)
const workOrders = ref<potWork[]>([])
if (user.value?.appMajor === 8) {
	http.sendDeviceConnectHandler({})
}
const getPotWorkList = async () => {
	const params: potWorkReq = {
		status: undefined,
		name: undefined,
		userId: userId,
		deviceCode: deviceInfo.value?.deviceCode || ''
	}
	try {
		loading.value = {
			uuid: 'getPot_workList',
			val: true,
			loadText: '加载中...'
		}
		const result = await http.getPotWorkListHandler(params)
		workOrders.value = result
	} catch (error) {
		ElMessage({
			type: 'error',
			message: '加载失败',
			grouping: true
		})
	}
	loading.value = {
		uuid: 'getPot_workList',
		val: false
	}
}
getPotWorkList()
const ws = computed(() =>
	workOrders.value.filter((order) => {
		const isActive = active.value === -1 || order.status === active.value
		const isSearch = order.workName.toLowerCase().includes(searchOrder.value.toLowerCase())
		return isActive && isSearch
	})
)
const containerOrderNode = useTemplateRef<HTMLDivElement | null>('containerOrder')
const height = ref<number>(0)
const setHeight = debounce(() => {
	height.value = containerOrderNode.value?.offsetHeight || 0
}, 500)

electronAPI.receive('window-change-resize', setHeight)
onMounted(() => setHeight())
</script>

<template>
	<div class="filter-order">
		<el-input v-model="searchOrder" v-keyboard clearable placeholder="工单名称/站点名称" class="input-with-select">
			<template #prefix>
				<i-ep-search></i-ep-search>
			</template>
		</el-input>
		<van-tabs v-model:active="active" title-active-color="#0d867f" class="filter-order-tabs" :sticky="true" :swipe-threshold="0" :animated="false" :border="false" @click-tab="getPotWorkList()">
			<van-tab title="全部" :name="-1"></van-tab>
			<van-tab title="执行中" :name="1"></van-tab>
			<van-tab title="待执行" :name="0"></van-tab>
			<van-tab title="已完成" :name="2"></van-tab>
		</van-tabs>
	</div>
	<div ref="containerOrder" class="container-order">
		<virtual-list :list="ws" :height="height" item-key="workId">
			<template #default="{ item, index }">
				<work-order-item :item="item" :index="index" :is-last="index === ws.length - 1" />
			</template>
		</virtual-list>
	</div>
</template>
<style lang="scss" scoped>
@use './scss/common.scss';
@use '../../themes/variables' as *;
.filter-order {
	display: flex;
	flex-direction: column;
	width: 100%;
	padding: 0 40px;
	background: #fff;
	.input-with-select {
		display: flex;
		:deep(.el-input__wrapper) {
			border: 2px solid #fff;
			box-shadow: none;
			background: #f7f7fa;
			border-radius: 8px;
			height: 64px;
			font-size: $font-size-xl;
			color: rgba(136, 142, 158, 0.8);
			font-weight: 400;
			flex: 1;
			&.is-focus {
				border: 2px solid rgba(13, 134, 127, 1);
			}
		}
		:deep(.el-input-group__append) {
			margin-left: 24px;
			box-shadow: none;
			font-size: $font-size-xxxl;
			color: #888e9e;
			text-align: right;
			font-weight: 400;
			padding: 0;
		}
		:deep(.el-input__prefix) {
			font-size: $font-size-xxl;
		}
		:deep(.el-input__clear) {
			font-size: $font-size-xxxl;
		}
	}
	&-tabs {
		height: 64px;
		:deep(.van-tabs__wrap) {
			height: 64px;
		}
		:deep(.van-tab) {
			font-size: $font-size-xl;
			color: rgba(136, 142, 158, 0.8);
			font-weight: 400;
			&.van-tab--active {
				color: rgba(13, 134, 127, 1);
				font-weight: 600;
			}
		}
		:deep(.van-tabs__line) {
			width: 80px;
		}
	}
}
.container-order {
	display: flex;
	width: 100%;
	flex: 1;
	min-height: 0;
	padding-top: 24px;
	:deep(.el-scrollbar) {
		height: auto !important;
	}
}
</style>
