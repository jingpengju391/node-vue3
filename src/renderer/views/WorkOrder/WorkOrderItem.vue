<script setup lang="ts" name="WorkOrderItem">
import { WorkOrder, WorkOrderStatusMap, WorkOrderRangeMap } from '@shared/dataModelTypes/WorkOrder'
import { useStores } from '@stores'
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{ item: WorkOrder | undefined; currentData: WorkOrder | undefined; isLast: boolean }>(), {
	item: undefined,
	currentData: undefined,
	isLast: false
})

const { workOrder: orderStore, login: netLoginStore } = useStores()
const { user } = storeToRefs(netLoginStore)
const router = useRouter()

const handlerCurrentWorkOrder = () => {
	if (!props.item) return
	orderStore.updatedCurrentWorkOrder(props.item)
	if (props.item.status === 0) {
		ElMessageBox({
			title: '提示',
			message: h('p', null, [h('span', null, '是否认领该工单并成为负责人？'), h('span', { style: 'color: #333' }, `当前登录人：${user.value?.userName || '暂无'}`)]),
			showCancelButton: true,
			confirmButtonText: '确定',
			cancelButtonText: '取消',
			showClose: false
		})
			.then(async () => {
				await orderStore.assignWorkOrderToPlatform()
				router.push({ name: 'WorkOrder-DetectMethod' })
			})
			.catch(() => {})
		return
	}
	router.push({ name: 'WorkOrder-DetectMethod' })
}
</script>
<template>
	<aside :class="{ paddingBottom: !isLast, container: true, [`active-${item?.status}`]: item?.workId === currentData?.workId }" @click="handlerCurrentWorkOrder">
		<div>
			<span class="work-name">{{ item?.workName || '暂无' }}</span>
			<span :class="`work-order-status status-${item!.status}`">{{ WorkOrderStatusMap[item!.status] || '暂无' }}</span>
			<van-icon class="right-t" name="arrow" />
		</div>
		<div class="work-order-time">
			<span>{{ item?.detectBeginTime || '暂无' }} - {{ item?.detectEndTime || '暂无' }}</span>
		</div>
		<div>
			<span class="detect-title">检测站点</span>
			<span>{{ item?.substationName || '暂无' }}</span>
		</div>
		<div>
			<span class="detect-title">检测范围</span>
			<span>{{ WorkOrderRangeMap[item!.detectRange] || '暂无' }}</span>
		</div>
		<div>
			<span class="detect-title">检测方法</span>
			<span>{{ item?.detectMethodsCn || '暂无' }}</span>
		</div>
	</aside>
</template>
<style scoped lang="scss">
@use './scss/order-item.scss';
</style>
