<script setup lang="ts" name="DetectMethod">
import { useRouter } from 'vue-router'
import { useStores } from '@stores'
import { SubWork, WorkOrderStatusMap } from '@shared/dataModelTypes/WorkOrder'
import { ImageView } from '@components'
import { getAdoptStatusBySubWorkBasics } from '@/stores/modules/workOrderDataSource'
import { loading } from '@utils/loading'
import { v4 as uuid } from 'uuid'
const router = useRouter()
const { workOrder: workOrderStore, login: loginStore } = useStores()
const { currentWorkOrder, subWorkOrders, getPercentWithSubWorkOrders } = storeToRefs(workOrderStore)
const { user } = storeToRefs(loginStore)

const isCollapse = ref(false)

onMounted(async () => {
	try{
		await workOrderStore.syncSubWorkOrderFromPlatform()
	}catch(_err){}
	workOrderStore.updatedSubWorkOrdersByCurrentWork()
})

const getAssetsFile = (name: string | undefined): string => new URL(`../../../assets/svg/${name}.svg`, import.meta.url).href

const getPercentageBySubWork = (subWork: SubWork): number => {
	if (!subWork.detectPositionTotal) return 0
	return Math.min(Math.round((subWork.detectPositionComplete / subWork.detectPositionTotal) * 100), 100)
}

const handlerDetectMethod = async (detectMethod: SubWork) => {
	if (!detectMethod?.mode || !detectMethod?.mode.length) {
		ElMessageBox.confirm('该检测方法待开发！', '提示', {
			distinguishCancelAndClose: true,
			showCancelButton: false,
			confirmButtonText: '知道了'
		})
			.then(() => {})
			.catch(() => {})
		return
	}

	workOrderStore.updatedCurrentSubWorkOrder(detectMethod)
	const adoptStatus = getAdoptStatusBySubWorkBasics(user.value, detectMethod)
	if ((adoptStatus === 1 || adoptStatus === 2) && currentWorkOrder.value?.status === 1) {
		let adoptUser = `当前登录人：${user.value?.userName || '暂无'}`
		let text = '是否认领该检测任务？'
		if (adoptStatus === 2) {
			adoptUser = ''
			text = '该子任务已经被认领'
		}

		const result = await showElMessageBox(adoptStatus, adoptUser, text)
		if (!result || adoptStatus === 2) return
	}

	const uid = uuid()
	loading.value = {
		val: true,
		loadText: '正在从平台同步检测任务明细，预计用时20s，请稍等...',
		uuid: uid,
		timer: 100000
	}
	await workOrderStore.syncSubOrderPointsAndGroupsFromPlatform()
	loading.value = {
		val: false,
		uuid: uid
	}

	let name = 'WorkOrder-DetectMode'
	if (detectMethod.mode.length === 1 || currentWorkOrder.value?.status !== 1) {
		workOrderStore.updatedCurrentMode(detectMethod.mode[0])
		name = 'WorkOrder-Groups'
	}

	router.push({ name })
}

function showElMessageBox(adoptStatus: 0 | 1 | 2, adoptUser: string, text: string): Promise<boolean> {
	return new Promise((resolve) => {
		const els = [h('span', null, text)]
		if (adoptUser) {
			els.push(h('span', { style: 'color: #333' }, adoptUser))
		}
		ElMessageBox({
			title: '提示',
			message: h('p', null, els),
			showCancelButton: adoptStatus === 1,
			confirmButtonText: adoptStatus === 1 ? '确定' : '知道了',
			cancelButtonText: '取消',
			showClose: false
		})
			.then(async () => {
				await workOrderStore.assignSubWorkOrderToPlatform()
				resolve(true)
			})
			.catch(() => {
				resolve(false)
			})
	})
}

const preSubmit = () => {
	router.push({ name: 'WorkOrder-DetectClimate' })
}
</script>
<template>
	<van-nav-bar :title="currentWorkOrder?.workName" @click-left="router.push({ name: 'WorkOrder' })">
		<template #left>
			<van-icon name="arrow-left" />
		</template>
	</van-nav-bar>
	<el-scrollbar class="content-scrollbar">
		<aside :class="`work-status-progress status-${currentWorkOrder?.status}`">
			<span>工单状态：{{ currentWorkOrder?.status ? WorkOrderStatusMap[currentWorkOrder!.status] : '暂无' }}</span>
			<span>进度：{{ getPercentWithSubWorkOrders }}%</span>
		</aside>
		<aside class="work-details">
			<ul v-show="isCollapse" class="work-details-content">
				<li>
					<span>工作发起人</span>
					<span>{{ currentWorkOrder?.createUserName || '暂无' }}</span>
				</li>
				<li>
					<span>{{ currentWorkOrder?.detectBeginTime || '暂无' }}</span>
					<span>{{ currentWorkOrder?.detectEndTime || '暂无' }}</span>
				</li>
				<li>
					<span>检测站点</span>
					<span>{{ currentWorkOrder?.substationName || '暂无' }}</span>
				</li>
				<li>
					<span>检修公司</span>
					<span>{{ currentWorkOrder?.sysDeptName || '暂无' }}</span>
				</li>
				<li>
					<span>检修中心</span>
					<span>{{ currentWorkOrder?.sysCenterName || '暂无' }}</span>
				</li>
				<li>
					<span>班组/运维队</span>
					<span>{{ currentWorkOrder?.sysTeamName || '暂无' }}</span>
				</li>
				<li>
					<span>工作负责人</span>
					<span>{{ currentWorkOrder?.adoptUserName || '暂无' }}</span>
				</li>
			</ul>
			<div class="collapse-button" @click="isCollapse = !isCollapse">
				<span>{{ isCollapse ? '收起' : '工单' }}明细</span>
				<i-ep-caretBottom v-show="!isCollapse" />
				<i-ep-caretTop v-show="isCollapse" />
			</div>
		</aside>
		<aside class="detect-method-title">检测方法</aside>
		<aside class="detect-method-list">
			<div v-for="item in subWorkOrders" :key="item.subWorkId" class="detect-method-item">
				<image-view class="container-image" :src="getAssetsFile(item!.detectMethod.toString())" :err-src="getAssetsFile('default_pic')" />
				<div class="detect-method-item-progress">
					<span>{{ item.detectMethodCn }}</span>
					<el-progress :stroke-width="15" :percentage="getPercentageBySubWork(item)" />
				</div>
				<van-button v-show="[1, 2].includes(currentWorkOrder!.status)" :plain="getAdoptStatusBySubWorkBasics(user, item) === 2" type="primary" @click="handlerDetectMethod(item)">{{
					currentWorkOrder!.status === 1 ? '进入检测' : '查看'
				}}</van-button>
			</div>
		</aside>
	</el-scrollbar>
	<div v-if="currentWorkOrder?.status !== 2 && currentWorkOrder?.adoptUserId === user?.userId" class="submit-work-order">
		<van-button class="submit-work-order-button" size="large" type="primary" @click="preSubmit()">去提交</van-button>
	</div>
</template>
<style lang="scss" scoped>
@use '../scss/detect-method.scss';
</style>
