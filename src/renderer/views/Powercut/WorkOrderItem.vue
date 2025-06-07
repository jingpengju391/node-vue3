<script setup lang="ts" name="WorkOrderItem">
import { WorkOrderStatusMap } from '@shared/dataModelTypes/WorkOrder'
import { potWork } from '@server/potAPIs'
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{ item: potWork | undefined; isLast: boolean }>(), {
	item: undefined,
	currentData: undefined,
	index: 0,
	isLast: true
})

const router = useRouter()

const handlerCurrentWorkOrder = (data) => {
	router.push({
		name: 'Powercut-OrderDetail',
		query: {
			workName: data.workName,
			status: data.status,
			workId: data.workId
		}
	})
}
</script>
<template>
	<aside :class="{ paddingBottom: !isLast, container: true }" @click="handlerCurrentWorkOrder(item)">
		<div>
			<span class="work-name">{{ item?.workName || '暂无' }}</span>
			<span :class="`work-order-status status-${item!.status}`">{{ WorkOrderStatusMap[item!.status] || '暂无' }}</span>
			<van-icon class="right-t" name="arrow" />
		</div>
		<div class="work-order-time">
			<span>{{ item?.potBeginTime || '暂无' }} - {{ item?.potEndTime || '暂无' }}</span>
		</div>
		<div>
			<span>试验站点</span>
			<span class="value">{{ item?.substationName || '暂无' }}</span>
		</div>
		<div>
			<span>试验范围</span>
			<span class="value">{{ item?.potDeviceNames || '暂无' }}</span>
		</div>
		<div>
			<span>检测方法</span>
			<span class="value">{{ item?.potItemCns || '暂无' }}</span>
		</div>
	</aside>
</template>
<style scoped lang="scss">
@use './scss/order-item.scss';
</style>
<style lang="scss">
.custom-message-box {
	.el-message-box__message {
		width: 100%;
		text-align: center;
		p {
			display: flex;
			flex-direction: column;
		}
	}
}
</style>
