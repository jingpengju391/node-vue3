<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { http } from '@hooks/api'
import { loading } from '@/utils/loading'
import { potExecParam } from '@server/potAPIs'
const router = useRouter()
const route = useRoute()

const potResultMap = reactive({
	1: '合格',
	2: '不合格',
	3: '异常'
})
// 网络状态
const pdPotNetConnectFlag = ref(true)
const orderInfo = ref<any>({})

/**
 * 获取试验点列表
 * @param potDeviceId 设备id
 */
const getPotExecList = async () => {
	const params: potExecParam = {
		potWorkItemId: route.query.potWorkItemId as string,
		potDeviceId: route.query.potDeviceId as string
	}
	try {
		loading.value = {
			uuid: 'getPot_exec_list',
			val: true,
			loadText: '加载中...'
		}
		const result = await http.getPotExecListHandler(params)
		orderInfo.value = result
	} catch (error) {
		ElMessage({
			type: 'error',
			message: '加载失败',
			grouping: true
		})
	}
	loading.value = {
		uuid: 'getPot_exec_list',
		val: false
	}
}

getPotExecList()
/**
 * 获取网络状态
 */
const pdPotNetConnect = () => {
	pdPotNetConnectFlag.value = true //pdPotNetConnect
	return pdPotNetConnectFlag.value
}

/**
 * 跳转至历史页面(需要判断有无网络)
 * @param data
 */
const goHistory = (data) => {
	if (pdPotNetConnect()) {
		router.push({
			name: 'Powercut-History',
			query: {
				...route.query,
				potPositionId: data.positionInfoDO.potPositionId
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
	router.go(-1)
}
</script>

<template>
	<div class="container">
		<van-nav-bar :title="`${route.query.potItemCn}`" left-arrow @click-left="onClickLeft"> </van-nav-bar>
		<div class="content">
			<ul class="methods-ul">
				<li v-for="(item, index) in orderInfo.data" :key="index">
					<div class="title">
						<div class="left">
							<span>{{ item.positionInfoDO.potPositionName }}</span>
							<van-icon style="font-size: 36px" name="arrow" color="#727477" />
						</div>
						<div class="right"><div @click="goHistory(item)">历史</div></div>
					</div>
					<div v-for="(it, idx) in item.potDataDetailList" :key="idx" class="item">
						<span>{{ it.attributeName }}({{ it.attributeDataUnit }})</span>
						<div class="value">{{ it.dataValue }}</div>
					</div>
				</li>
			</ul>
			<ul class="others-ul">
				<li>
					<span class="label">试验仪器</span>
					<span class="value">{{ orderInfo.potDeviceName }}//{{ orderInfo.potDeviceId }}</span>
				</li>
				<li v-show="orderInfo.deviceType === '0301'">
					<span class="label">油温（<sup>o</sup>C）</span>
					<span class="value">{{ orderInfo.oilTemp }}</span>
				</li>
				<li>
					<span class="label">试验结论</span>
					<span class="value">{{ potResultMap[orderInfo.potResult] }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>
<style lang="scss" scoped>
@use './index.scss';
</style>
