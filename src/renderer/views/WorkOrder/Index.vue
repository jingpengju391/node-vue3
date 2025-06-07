<script setup lang="ts">
import { VirtualList } from '@components'
import { useStores } from '@stores'
import WorkOrderItem from './WorkOrderItem.vue'

const { workOrder: workOrdersStore } = useStores()

const { workOrders, currentWorkOrder } = storeToRefs(workOrdersStore)

const searchOrder = ref<string>('')
const active = ref(-1)

const currentIndex = computed(() => workOrders.value.findIndex((item) => item.workId === workOrdersStore.currentWorkOrder?.workId))
const ws = computed(() =>
	workOrders.value.filter((order) => {
		const isActive = active.value === -1 || order.status === active.value
		const isSearch = order.workName.toLowerCase().includes(searchOrder.value.toLowerCase())
		return isActive && isSearch
	})
)

onMounted(() => workOrdersStore.syncWorkOrderFromPlatform(true))
</script>

<template>
	<div class="filter-order">
		<el-input v-model="searchOrder" v-keyboard clearable placeholder="请输入工单名称查询" class="input-with-select">
			<template #prefix>
				<i-ep-search></i-ep-search>
			</template>
		</el-input>
		<van-tabs
			v-model:active="active"
			title-active-color="#0d867f"
			class="filter-order-tabs"
			:sticky="true"
			:swipe-threshold="0"
			:animated="false"
			:border="false"
			@click="workOrdersStore.syncWorkOrderFromPlatform(true)"
		>
			<van-tab title="全部" :name="-1"></van-tab>
			<van-tab title="执行中" :name="1"></van-tab>
			<van-tab title="待执行" :name="0"></van-tab>
			<van-tab title="已完成" :name="2"></van-tab>
		</van-tabs>
	</div>
	<virtual-list :list="ws" :current-index="currentIndex" class="container-order">
		<template #default="{ item, index }">
			<work-order-item :item="item" :current-data="currentWorkOrder" :is-last="index === ws.length - 1" />
		</template>
	</virtual-list>
</template>
<style lang="scss" scoped>
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
	padding: 24px;
}
</style>
