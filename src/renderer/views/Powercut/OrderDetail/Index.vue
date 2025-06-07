<script setup lang="ts">
import { useStores } from '@stores'
import { useRouter, useRoute } from 'vue-router'
import { potDetailWorkReq, potDetailWorkResultVO } from '@server/potAPIs'
import { http } from '@hooks/api'
import { loading } from '@/utils/loading'
const { login: loginStore, root: rootStore } = useStores()
const { user } = storeToRefs(loginStore)
const { deviceInfo } = storeToRefs(rootStore)
const userId = user.value?.userId || ''

const route = useRoute()
const router = useRouter()
// 登录用户信息
const username = user.value?.userName || ''
const isExpand = ref(false)
// 网络状态
const pdPotNetConnectFlag = ref(true)
// 状态Map
const statusPicMap = reactive({
	1: {
		name: '合格',
		color: '#0D867F',
		borderColor: 'rgba(159,207,204,1)'
	},
	2: {
		name: '不合格',
		color: '#FDAA56',
		borderColor: 'rgba(253,170,86,0.50)'
	},
	3: {
		name: '异常',
		color: '#FF3141',
		borderColor: 'rgba(255,49,65,0.50)'
	},
	4: {
		name: '未检测',
		color: '#1890FF',
		borderColor: 'rgba(24,144,255,0.5)'
	},
	null: {
		name: '未检测',
		color: '#1890FF',
		borderColor: 'rgba(24,144,255,0.5)'
	}
})
const orderInfo = ref<potDetailWorkResultVO>()

/**
 * 获取工单详情
 */
const getPotWorkDetail = async () => {
	const params: potDetailWorkReq = {
		workId: route.query.workId as string,
		userId: userId,
		mtCode: deviceInfo.value?.deviceCode ?? ''
	}
	try {
		loading.value = {
			uuid: 'getPot_work_detail_list',
			val: true,
			loadText: '加载中...'
		}
		const result = await http.getPotWorkDetailListHandler(params)
		orderInfo.value = result
	} catch (error) {
		ElMessage({
			type: 'error',
			message: '加载失败',
			grouping: true
		})
	}
	loading.value = {
		uuid: 'getPot_work_detail_list',
		val: false
	}
}
getPotWorkDetail()

/**
 * 跳转至任务页面
 * @param item
 * @param it
 */
const goPowercut = (item, it) => {
	// 已完成的任务跳转到查看页面
	router.push({
		name: route.query.status === '2' ? 'Powercut-TaskView' : 'Powercut-Task',
		query: {
			workId: route.query.workId,
			status: route.query.status,
			potWorkDeviceId: item.potWorkDeviceId,
			potDeviceId: it.potDeviceId,
			potWorkItemId: it.potWorkItemId,
			potItemCn: it.potItemCn,
			workName: route.query.workName
		}
	})
}

/**
 * 获取网络状态
 */
const pdPotNetConnect = () => {
	pdPotNetConnectFlag.value = true
	return pdPotNetConnectFlag.value
}

/**
 * 跳转至提交页面(需要判断有无网络)
 */
const goOrderEdit = () => {
	if (pdPotNetConnect()) {
		router.push({
			name: 'Powercut-OrderSubmit',
			query: {
				workName: route.query.workName,
				status: route.query.status,
				workId: route.query.workId
			}
		})
	} else {
		ElMessage({
			type: 'error',
			message: `无网络`,
			grouping: true
		})
	}
}

const onClickLeft = () => {
	router.push({
		name: 'Powercut'
	})
}

onMounted(() => {})
</script>

<template>
	<van-nav-bar :title="`${route.query.workName}`" left-arrow @click-left="onClickLeft"> </van-nav-bar>
	<el-scrollbar class="wapper">
		<van-cell-group>
			<van-cell size="large">
				<template #title>
					<div class="time">
						<span class="custom-title">{{ orderInfo?.potDetailWorkDO.potBeginTime }}</span>
						<span class="line"></span>
						<span>{{ orderInfo?.potDetailWorkDO.potEndTime }}</span>
					</div>
				</template>
			</van-cell>
			<div v-show="isExpand">
				<van-cell size="large" title="试验站点" :value="orderInfo?.potDetailWorkDO.substationName || '-'" />
				<van-cell size="large" title="工单发起人" :value="username || '-'" />
				<van-cell size="large" title="试验性质" :value="orderInfo?.potDetailWorkDO.potNatureCn || '-'" />
				<van-cell size="large" title="检修公司" :value="orderInfo?.potDetailWorkDO.sysDeptName || '-'" />
				<van-cell size="large" title="检修中心" :value="orderInfo?.potDetailWorkDO.sysCenterName || '-'" />
				<van-cell size="large" title="班组/运维队" :value="orderInfo?.potDetailWorkDO.sysTeamName || '-'" />
				<van-cell size="large" title="备注信息" value="" :label="orderInfo?.potDetailWorkDO.workRemark" />
                <van-cell size="large" title="" class="remark" :label="orderInfo?.potDetailWorkDO.workRemark" />
			</div>
			<van-cell size="large" @click="isExpand = !isExpand">
				<template #title>
					<div class="more">
						<span class="custom-title">{{ isExpand ? '收起信息' : '更多信息' }}</span>
						<van-icon :name="isExpand ? 'arrow-up' : 'arrow-down'" color="#0D867F" />
					</div>
				</template>
			</van-cell>
		</van-cell-group>
		<ul class="methods-ul">
			<li v-for="(item, index) in orderInfo?.potDetailWorkVOList" :key="index">
				<div class="title">
					<span>{{ item.deviceInfoDO.deviceName }}</span
					><span>调度号：{{ item.deviceInfoDO.dispatchNumber }}</span>
				</div>
				<div v-for="(it, idx) in item.itemInfoList" :key="idx" class="item" @click="goPowercut(item, it)">
					<div>
						<img src="@/assets/images/tg.png" alt="" />
						<span>{{ it.potItemCn }}</span>
					</div>
					<div>
						<span
							class="status"
							:style="{
								color: statusPicMap[it.potResult].color,
								borderColor: statusPicMap[it.potResult].borderColor
							}"
							>{{ statusPicMap[it.potResult].name }}</span
						>
						<van-icon style="font-size: 36px" name="arrow" color="#727477" />
					</div>
				</div>
			</li>
		</ul>
		<div v-if="route.query.status != '2'" class="submit">
			<van-button class="link" round size="large" type="primary" @click="goOrderEdit">去提交</van-button>
		</div>
	</el-scrollbar>
</template>
<style lang="scss" scoped>
@use './index.scss';
</style>
