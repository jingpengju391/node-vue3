<script setup lang="ts">
import { useStores } from '@stores'
import { useRouter, useRoute } from 'vue-router'
import { http } from '@hooks/api'
import { loading } from '@/utils/loading'
import { potPositionHisParam, potPositionHisMoreParam } from '@server/potAPIs'

const router = useRouter()
const route = useRoute()
const { login: loginStore, root: rootStore } = useStores()
const { user } = storeToRefs(loginStore)
const { deviceInfo } = storeToRefs(rootStore)
const userId = user.value?.userId || ''
const list = ref<any>([])

/**
 * 获取历史列表
 */
const getPotPositionHisList = async () => {
	const params: potPositionHisParam = {
		potPositionId: route.query.potPositionId as string,
		userId: userId,
		mtCode: deviceInfo.value?.deviceCode || ''
	}
	try {
		loading.value = {
			uuid: 'getPot_position_list',
			val: true,
			loadText: '加载中...'
		}
		const result: any = await http.getPotPositionHisListHandler(params)
		list.value = result && result.data
	} catch (error) {
		ElMessage({
			type: 'error',
			message: '加载失败',
			grouping: true
		})
	}
	loading.value = {
		uuid: 'getPot_position_list',
		val: false
	}
}

/**
 * 展开更多
 * @param item
 * @param index
 */
const showMore = async (item, index) => {
	const params: potPositionHisMoreParam = {
		userId: userId,
		mtCode: deviceInfo.value?.deviceCode || '',
		workId: item.workId,
		potWorkItemId: item.potWorkItemId
	}
	try {
		loading.value = {
			uuid: 'getPot_position_list_more',
			val: true,
			loadText: '加载中...'
		}
		const result: any = await http.getPotPositionHisMoreHandler(params)
		list.value[index] = {
			...item,
			oilTemp: result.data.oilTemp,
			weatherCn: result.data.weatherCn,
			temperature: result.data.temperature,
			humidity: result.data.humidity,
			adoptUserName: result.data.adoptUserName,
			isExpand: !item.isExpand,
			deviceType: result.data.deviceType
		}
	} catch (error) {
		ElMessage({
			type: 'error',
			message: '加载失败',
			grouping: true
		})
	}
	loading.value = {
		uuid: 'getPot_position_list_more',
		val: false
	}
}

getPotPositionHisList()

const onClickLeft = () => {
	router.go(-1)
}
</script>

<template>
	<div class="container">
		<van-nav-bar title="历史记录查看" left-arrow @click-left="onClickLeft"> </van-nav-bar>
		<div class="content">
			<ul v-if="list?.length > 0" class="methods-ul">
				<li v-for="(item, index) in list" :key="index">
					<div class="title">
						<div class="left">
							<span>{{ item.potPositionName }}</span>
							<van-icon name="arrow" />
						</div>
						<div class="right">{{ item.samplingTime }}</div>
					</div>
					<div v-for="(it, idx) in item.potDataDetailList" :key="idx" class="item">
						<span>{{ it.attributeName }}({{ it.attributeDataUnit }})</span>
						<div class="value">{{ it.dataValue }}</div>
					</div>
					<div v-if="item.isExpand">
						<div v-show="item.deviceType === '0301'" class="item">
							<span>油温（<sup>o</sup>C）</span>
							<div class="">{{ item.oilTemp }}</div>
						</div>
						<div class="item">
							<span>天气</span>
							<div class="">{{ item.weatherCn }}</div>
						</div>
						<div class="item">
							<span>环境温度（<sup>o</sup>C）</span>
							<div class="">{{ item.temperature }}</div>
						</div>
						<div class="item">
							<span>环境湿度（%rh）</span>
							<div class="">{{ item.humidity }}</div>
						</div>
						<div class="item">
							<span>工单负责人</span>
							<div class="">{{ item.adoptUserName }}</div>
						</div>
					</div>
					<div class="more" @click="showMore(item, index)">
						<span>{{ item.isExpand ? '收起信息' : '更多信息' }}</span>
						<van-icon v-if="item.isExpand" name="arrow-up" />
						<van-icon v-else name="arrow-down" />
					</div>
				</li>
			</ul>
			<van-empty v-else class="empty" image="../../../assets/images/nodata.png" description="暂无历史数据" />
		</div>
	</div>
</template>
<style lang="scss" scoped>
@use './index.scss';
</style>
