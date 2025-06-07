<script setup lang="ts">
import { electronAPI } from '@hooks/api'
import { useStores } from '@stores'
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storage } from '@lib/storage'
import { http } from '@hooks/api'
import { loading } from '@/utils/loading'
import { potExecParam, PotDevice } from '@server/potAPIs'
import { Pedometer } from '@/components'
const { login: loginStore, root: rootStore } = useStores()
const { user } = storeToRefs(loginStore)
const { deviceInfo } = storeToRefs(rootStore)
const router = useRouter()
const route = useRoute()
const selectedIndex = ref(0)
const show2 = ref(false)
const show = ref(false)
const closeDialog = ref(false)
const userId = user.value?.userId
// 网络状态
const pdPotNetConnectFlag = ref(true)
const potDevice = ref<any>({})
const actionsDevice = ref<PotDevice[]>()
const result = ref([
	{
		name: '合格',
		value: 1,
		color: '#0D867F',
		background: '#E7F3F2'
	},
	{
		name: '不合格',
		value: 2,
		color: '#FF7E00',
		background: 'rgba(254,213,171,0.50)'
	},
	{
		name: '异常',
		value: 3,
		color: '#FF3141',
		background: ' rgba(255,49,65,0.20)'
	}
])
const orderInfo = reactive<any>({})

/**
 * 获取试验点列表
 * @param potDeviceId 设备id
 */
const getPotExecList = async (potDeviceId) => {
	const params: potExecParam = {
		potWorkItemId: route.query.potWorkItemId as string,
		potDeviceId: potDeviceId || potDevice.value.potDeviceId
	}
	try {
		loading.value = {
			uuid: 'getPot_exec_list',
			val: true,
			loadText: '加载中...'
		}
		const result = await http.getPotExecListHandler(params)
		handleData(result)
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

/**
 * 处理数据
 * @param result
 */
const handleData = (result) => {
	const arr = result.data.map((item, index) => {
		return {
			...item,
			potDataDetailList: item.potDataDetailList.map((it) => ({
				...it,
				checked: true,
				dataValue: it.dataValue ? it.dataValue : ''
			}))
		}
	})
	orderInfo.deviceType = result.deviceType
	orderInfo.oilTemp = Number(result.oilTemp) || 20.0
	orderInfo.potResult = result.potResult || 1
	orderInfo.data = arr
	if (route.query.potDeviceId) {
		potDevice.value.potDeviceName = result?.potDeviceName
		potDevice.value.potDeviceCode = result?.potDeviceCode
		potDevice.value.potDeviceId = result?.potDeviceId
	}
}

/**
 * 勾选设备
 * @param data
 */
const clickDevice = async (data) => {
	await getPotExecList(data.potDeviceId)
	potDevice.value = { ...data }
	show2.value = false
}

/**
 * 发送获取试验设备返回值接口（给硬件）
 */
const sendPotDeviceQuery = async (index) => {
	selectedIndex.value = index
	closeDialog.value = true
	const potPositionId = orderInfo.data[selectedIndex.value].positionInfoDO.potPositionId
	await http.sendPotDeviceQueryHandler({ potPositionId: potPositionId })
}

/**
 * 接收Socket消息
 * @param res
 */
const getSocketData = (res) => {
	const jsonData = res
	console.log('推送的消息', jsonData)
	if (!jsonData) return
	if (jsonData.method === 'pot_val') {
		if (jsonData.type === 'disconnect') {
			closeDialog.value = false
			ElMessage({
				type: 'warning',
				message: '仪器未连接，请检查！',
				grouping: true
			})
		} else if (jsonData.type === 'unmeasured') {
			closeDialog.value = false
			ElMessage({
				type: 'warning',
				message: '请在仪器已显示结果后点击获取！',
				grouping: true
			})
		} else if (jsonData.type === 'measuring') {
			closeDialog.value = true
		} else if (jsonData.type === 'complete') {
			closeDialog.value = false
			ElMessage({
				type: 'warning',
				message: '数据获取成功！',
				grouping: true
			})
			const arr = orderInfo.data[selectedIndex.value]
			const index = arr.potDataDetailList.findIndex((item) => item.attributeName === '电容值')
			if (index >= 0) {
				orderInfo.data[selectedIndex.value].potDataDetailList[index].dataValue = jsonData.cap.toString()
			}
			const index1 = arr.potDataDetailList.findIndex((item) => item.attributeName === '介损tgδ')
			if (index1 >= 0) {
				orderInfo.data[selectedIndex.value].potDataDetailList[index1].dataValue = jsonData.dl.toString()
			}
		}
	}
}

/**
 * 勾选介损和电容勾选框
 * @param item
 * @param index
 * @param it
 * @param idx
 */
const clickChecked = (item, index, it, idx) => {
	for (let i = 0; i < orderInfo.data.length; i++) {
		const element = orderInfo.data[i]
		for (let j = 0; j < element.potDataDetailList.length; j++) {
			const inner = element.potDataDetailList[j]
			if (inner.attributeId === it.attributeId && element.positionInfoDO.potPositionId === item.positionInfoDO.potPositionId) {
				inner.checked = false
			}
		}
	}
	orderInfo.data[index].potDataDetailList[idx].checked = !it.checked
}

/**
 * 新增一项点位
 * @param index
 */
const addDiv = (index) => {
	const newItem = JSON.parse(
		JSON.stringify({
			...orderInfo.data[index],
			potDataDetailList: orderInfo.data[index].potDataDetailList.map((item) => ({
				...item,
				dataValue: '',
				checked: false
			}))
		})
	)
	orderInfo.data.splice(index + 1, 0, newItem)
	selectedIndex.value = index + 1
}

/**
 * 转化数据
 */
const mergeObjectsWithSameName = (arr) => {
	const obj = {}
	const res: any = []
	arr.forEach((item) => {
		// 如果obj中已经存在'A相'或‘B相’的属性
		if (obj[item.positionInfoDO.potPositionName]) {
			// 把当前项的Listpush到''A相'的List里
			obj[item.positionInfoDO.potPositionName].potDataDetailList = obj[item.positionInfoDO.potPositionName].potDataDetailList.concat(item.potDataDetailList)
		} else {
			obj[item.positionInfoDO.potPositionName] = JSON.parse(JSON.stringify(item))
		}
	})
	for (const key in obj) {
		const item = obj[key]
		const listValue = item.potDataDetailList
			.filter((_item) => _item.checked)
			.map((it) => {
				return {
					attributeId: it.attributeId,
					dataValue: it.dataValue,
					potDeviceId: it.potDeviceId
				}
			})
		res.push({
			potWorkItemId: item.positionInfoDO.potWorkItemId,
			potPositionId: item.positionInfoDO.potPositionId,
			potWorkDetailId: item.positionInfoDO.potWorkDetailId,
			potDataDetailList: listValue
		})
	}
	return res
}

/**
 * 校验格式
 * @param arr
 */
const validateData = (arr) => {
	let isValid = true
	arr.some((item) => {
		return item.potDataDetailList.some((detail) => {
			const parts = detail.dataValue.split('.')
			if (parts.length > 2) {
				isValid = false
				return true // 提前退出内层 some
			}
			return false
		})
	})
	return isValid
}

/**
 * 提交
 */
const submit = async () => {
	const arr = mergeObjectsWithSameName(orderInfo.data)
	if (!validateData(arr)) {
		ElMessage({
			type: 'error',
			message: `请检查数据格式`,
			grouping: true
		})
	} else {
		const params: any = {
			userId: userId,
			mtCode: deviceInfo.value?.deviceCode || '',
			workId: route.query.workId,
			potWorkItemId: route.query.potWorkItemId,
			potDeviceId: potDevice.value.potDeviceId,
			potResult: orderInfo.potResult,
			potWorkDetailList: arr,
			submitTime: getDateTime()
		}
		if (orderInfo.oilTemp && orderInfo.deviceType === '0301') {
			params.oilTemp = orderInfo.oilTemp
		}
		try {
			loading.value = {
				uuid: 'submit_pot_item',
				val: true,
				loadText: '提交中...'
			}
			await http.submitPotItemHandler(params)
			ElMessage({
				type: 'success',
				message: `${potDevice.value.potDeviceName}检测提交成功`,
				grouping: true
			})
			// 从任务页跳转至详情页面清空缓存数据
			toOrderDeatil()
			setStorage(false)
		} catch (error) {
			ElMessage({
				type: 'error',
				message: '提交失败',
				grouping: true
			})
		}
		loading.value = {
			uuid: 'submit_pot_item',
			val: false
		}
	}
}

const onCancel = () => {
	if (!potDevice.value.potDeviceCode) {
		setStorage(false)
		toOrderDeatil()
	}
}

/**
 * 获取仪器设备列表
 */
const getPotDevice = async () => {
	actionsDevice.value = await http.getPotDeviceHandler()
}

/**
 * 点击实验仪器
 */
const onClickRight = async () => {
	getPotDevice()
	show2.value = true
}

/**
 * 获取网络状态
 */
const pdPotNetConnect = () => {
	pdPotNetConnectFlag.value = true
	return pdPotNetConnectFlag.value
}

/**
 * 直接离开任务页面
 */
const goback = () => {
	setStorage(false)
	toOrderDeatil()
}

/**
 * 查看历史(需要判断有无网络)
 * @param data
 */
const goHistory = (data) => {
	setStorage(true)
	if (pdPotNetConnect()) {
		router.push({
			name: 'Powercut-History',
			query: {
				potPositionId: data.positionInfoDO.potPositionId,
				workId: route.query.workId,
				potWorkItemId: route.query.potWorkItemId,
				potDeviceId: route.query.potDeviceId
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

/**
 * 存储数据便于回显
 * @param flag
 */
const setStorage = (flag) => {
	storage.localSet(
		'dataInfo',
		flag
			? {
					...orderInfo,
					potDeviceName: potDevice?.value.potDeviceName,
					potDeviceCode: potDevice?.value.potDeviceCode,
					potDeviceId: potDevice?.value.potDeviceId
				}
			: ''
	)
}

const getDateTime = () => {
	const now = new Date()
	const year = now.getFullYear()
	const month = now.getMonth() + 1 // 月份是从0开始的
	const day = now.getDate()
	const hours = now.getHours()
	const minutes = now.getMinutes()
	const seconds = now.getSeconds()
	// 格式化月份和日期，保持两位数
	const formattedMonth = month < 10 ? '0' + month : month
	const formattedDay = day < 10 ? '0' + day : day
	const formattedHours = hours < 10 ? '0' + hours : hours
	const formattedMinutes = minutes < 10 ? '0' + minutes : minutes
	const formattedSeconds = seconds < 10 ? '0' + seconds : seconds
	return `${year}-${formattedMonth}-${formattedDay} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`
}

const imgUrl = computed(() => (url) => new URL(`../../../assets/images/${url ? 'check' : 'uncheck'}.png`, import.meta.url).href)
const imgStatusUrl = computed(() => (idx) => new URL(`../../../assets/images/result${idx}.png`, import.meta.url).href)

if (storage.localGet('dataInfo')) {
	Object.assign(orderInfo, storage.localGet('dataInfo'))
} else {
	if (!route.query.potDeviceId) {
		show2.value = true
	} else {
		getPotExecList(route.query.potDeviceId)
	}
}

const toOrderDeatil = () => {
	router.push({
		name: 'Powercut-OrderDetail',
		query: {
			...route.query,
			workId: route.query.workId,
			status: route.query.status,
			workName: route.query.workName
		}
	})
}

getPotDevice()
electronAPI.receive('pot_val', (message) => {
	getSocketData(message)
})
</script>
<template>
	<div class="container">
		<van-nav-bar :title="`${route.query.potItemCn}`" left-arrow right-text="试验仪器" @click-left="show = true" @click-right="onClickRight"> </van-nav-bar>
		<div class="content">
			<ul class="methods-ul">
				<li v-for="(item, index) in orderInfo.data" :key="index" :class="{ selected: selectedIndex === index }" @click.stop="selectedIndex = index">
					<div class="title">
						<div class="left">
							<span>{{ item?.positionInfoDO.potPositionName }}</span>
							<van-icon name="arrow" />
						</div>
						<div class="right">
							<div @click.stop="sendPotDeviceQuery(index)">获取数据</div>
						</div>
					</div>
					<div v-for="(it, idx) in item.potDataDetailList" :key="idx" class="item">
						<div>
							<img :src="imgUrl(it.checked)" alt="" @click="clickChecked(item, index, it, idx)" />
							<span>{{ it.attributeName }}({{ it.attributeDataUnit }})</span>
						</div>
						<el-input v-model="it.dataValue" v-numkeyboard class="input-with-select"> </el-input>
					</div>
					<div class="footer">
						<div @click="goHistory(item)">查看历史</div>
						<div @click.stop="addDiv(index)">增测一组</div>
					</div>
				</li>
			</ul>
			<ul class="others">
				<li @click="show2 = true">
					<span class="label" style="width: 210px">试验仪器</span>
					<div class="device">
						<span>{{ potDevice?.potDeviceName }}//{{ potDevice?.potDeviceCode }}</span>
						<img style="margin-left: 30px" src="@/assets/images/outlined.png" alt="" />
					</div>
				</li>
				<li v-show="orderInfo.deviceType == '0301'">
					<span class="label">油温（<sup>o</sup>C）</span>
					<Pedometer v-model="orderInfo.oilTemp" :min="-30" :max="200" :precision="1" />
				</li>
				<li>
					<span class="label">试验结论</span>
					<div class="value">
						<div
							v-for="(item, index) in result"
							:key="index"
							class="result-item"
							:style="{
								color: item.color,
								background: orderInfo.potResult == item.value ? item.background : '#F7F7FA'
							}"
							@click="orderInfo.potResult = item.value"
						>
							{{ item.name }}
							<img v-show="orderInfo.potResult == item.value" :src="imgStatusUrl(index)" alt="" />
						</div>
					</div>
				</li>
			</ul>
		</div>
		<div class="submit">
			<van-button class="link" round size="large" type="primary" @click="submit()">提交结果</van-button>
		</div>

		<van-dialog v-if="show" v-model:show="show" class="back-dialog" :show-confirm-button="false" title="直接离开会丢失页面记录内容！" :show-cancel-button="true" @cancel="show = false">
			<ul>
				<li @click="goback()">直接离开</li>
				<li @click="submit()">提交数据</li>
			</ul>
		</van-dialog>

		<van-overlay v-model:show="closeDialog" class-name="measuring" @click="closeDialog = false">
			<div class="wrapper">数据获取中，请稍等...</div>
		</van-overlay>

		<van-action-sheet v-model:show="show2" description="请选择介损仪器(会清空当前页面数据)" class="submit-action min-sheet" :close-on-click-overlay="false" cancel-text="取消" @cancel="onCancel">
			<div class="content">
				<ul v-if="show2">
					<li v-for="(item, index) in actionsDevice" :key="index" @click="clickDevice(item)">{{ item.potDeviceName }}//{{ item.potDeviceCode }}</li>
				</ul>
			</div>
		</van-action-sheet>
	</div>
</template>
<style lang="scss" scoped>
@use './index.scss';
@use '../scss/common.scss';
</style>
