<script setup lang="ts">
import { useStores } from '@stores'
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { clear } from '@/components/SimpleKeyboard/hook'
import { http } from '@hooks/api'
import { potDetailWorkReq, itemInfoDO, deviceInfoDO } from '@server/potAPIs'
import { Pedometer } from '@/components'
import { loading } from '@/utils/loading'
const { login: loginStore, root: rootStore } = useStores()
const { user } = storeToRefs(loginStore)
const { deviceInfo } = storeToRefs(rootStore)
const router = useRouter()
const route = useRoute()
const temperature = ref(20)
const humidity = ref(40)
const weatherList = ref<any>([])
const testUserList = ref<any>([])
const sheetShow = ref(false)
const submitShow = ref(false)
const title = ref('请选择介损仪器')
const type = ref('1')
const adoptUserId = ref('')
const potCount = ref(0)
const weatherId = ref(0)
const weather = ref(0)
const adoptName = ref('')
const userId = user.value?.userId

interface MyObject {
	potResult: number
	deviceInfoDO: deviceInfoDO
	itemInfoList: itemInfoDO[]
}
const potWorkDeviceList = ref<MyObject[]>([])

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
const result = ref([
	{
		name: '合格',
		color: '#0D867F',
		background: '#E7F3F2',
		type: 1
	},
	{
		name: '不合格',
		color: '#FF7E00',
		background: 'rgba(254,213,171,0.50)',
		type: 2
	},
	{
		name: '异常',
		color: '#FF3141',
		background: ' rgba(255,49,65,0.20)',
		type: 3
	}
])
/**
 * 格式化试验结论
 */
const formatResult = (arr) => {
	if (arr.length > 0) {
		let flag
		for (let i = 0; i < arr.length; i++) {
			if (arr[i].potResult == 3) {
				flag = 3
			} else if (arr[i].potResult == 2) {
				flag = 2
			} else {
				flag = 1
			}
		}
		return flag
	} else {
		return 1
	}
}
const getPotWorkDetail = async () => {
	const params: potDetailWorkReq = {
		workId: route.query.workId as string,
		userId: userId as string,
		mtCode: deviceInfo.value?.deviceCode || ''
	}
	const result = await http.getPotWorkDetailListHandler(params)    
	potWorkDeviceList.value = result.potDetailWorkVOList.map((item) => {
		const potResult = formatResult(item.itemInfoList)
		return {
			...item,
			potResult: potResult
		}
	})    
}
getPotWorkDetail()

const testUser = computed<any>(() => {
	return testUserList.value
		.map((item: any) => {
			return item?.userNick
		})
		.join(',')
})
const testUserId = computed<any>(() => {
	return testUserList.value.map((item: any) => {
		return {
			userId: item?.userId
		}
	})
})

const actionsDevice = ref<any>([])
const testUserData = ref<any>([])

/**
 * 获取试验人数据
 */
const getTestUserList = async () => {
	const result = await http.getTestUserListHandler()
	testUserData.value = result.map((item) => {
		return {
			...item,
			name: item.userNick,
			checked: false
		}
	})
	if (testUserData.value.length > 0) {
		adoptUserId.value = user.value?.userId || ''
		adoptName.value = user.value?.userNick || ''
		testUserList.value = [user.value]
		actionsDevice.value = testUserData.value.map((item) => {
			return {
				...item,
				checked: user.value?.userId === item.userId ? true : false
			}
		})
	}
}
getTestUserList()

/**
 * 选择试验结论
 */
const clickResult = (idx, index) => {
	potWorkDeviceList.value[index].potResult = result.value[idx].type
}

/**
 * 获取天气数据
 */
const getWeatherInfo = async () => {
	const result = await http.getWeatherInfoHandler()
	weatherList.value = result.map((item) => {
		return {
			...item,
			name: item.dictLabel,
			checked: false
		}
	})
	if (weatherList.value.length > 0) {
		const obj = weatherList.value.find((item) => 
            item.dictLabel == '晴'
        )
        if(obj) {
            weatherId.value = obj.dictValue
		    weather.value = obj.dictLabel
        }
	}
}

/**
 * 选择负责人、试验人、天气
 */
const showSheet = (str) => {
	type.value = str
	title.value = str === '1' ? '请选择负责人' : str === '2' ? '请选择试验人' : '请选择试天气状况'
	if (str === '1') {
		actionsDevice.value = testUserData.value.map((item) => {
			return {
				...item,
				checked: adoptUserId.value === item.userId ? true : false
			}
		})
	} else if (str === '2') {
		for (let i = 0; i < testUserData.value.length; i++) {
			const element = testUserData.value[i]
			for (let j = 0; j < testUserList.value.length; j++) {
				const inner = testUserList.value[j]
				if (element.userId === inner.userId) {
					testUserData.value[i].checked = true
				}
			}
		}
		actionsDevice.value = testUserData.value
	} else if (str === '3') {
		actionsDevice.value = weatherList.value.map((item) => {
			return {
				...item,
				checked: weatherId.value == item.dictValue ? true : false
			}
		})
	}
	sheetShow.value = true
}

/**
 * 获取记录等待同步条数
 */
const getPotSyncCount = async () => {
	const result = await http.getPotSyncCountHandler()
	potCount.value = result && result[0]['count(*)']
}

/**
 * 提交
 */
const submit = async () => {
	if (!adoptUserId.value) {
		ElMessage({
			type: 'warning',
			message: '请选择负责人',
			grouping: true
		})
		return
	}
	if (testUserId.value.length == 0) {
		ElMessage({
			type: 'warning',
			message: '请选择试验人',
			grouping: true
		})
		return
	}
	if (!temperature.value && temperature.value !== 0) {
		ElMessage({
			type: 'warning',
			message: '环境温度不能为空',
			grouping: true
		})
		return
	}
	if (!humidity.value && humidity.value !== 0) {
		ElMessage({
			type: 'warning',
			message: '环境湿度不能为空',
			grouping: true
		})
		return
	}
	// 获取数量
	await getPotSyncCount()
	submitShow.value = true
}

/**
 * 确定选择试验人
 */
const selectPeople = () => {
	sheetShow.value = false
	const arr: any = actionsDevice.value.filter((item) => item.checked)
	testUserList.value = arr
}

/**
 * 勾选试验人
 */
const clickChecked = (item, index) => {
	if (type.value === '2') {
		actionsDevice.value[index].checked = !item.checked
	} else {
		actionsDevice.value = actionsDevice.value.map((item) => {
			return {
				...item,
				checked: false
			}
		})
		actionsDevice.value[index].checked = true
		if (type.value === '1') {
			adoptUserId.value = item.userId
			adoptName.value = item.userNick
			sheetShow.value = false
		} else if (type.value === '3') {
			weatherId.value = item.dictValue
			weather.value = item.dictLabel
			sheetShow.value = false
		}
	}
}

/**
 * 提交接口
 */
const submitwork = async () => {
	const potWorkDeviceLists: any = potWorkDeviceList.value.map((item: any) => {
		return {
			potWorkDeviceId: item.deviceInfoDO.potWorkDeviceId,
			potResult: item.potResult,
			potDeviceRemark: item.deviceInfoDO.potDeviceRemark
		}
	})
	const params: any = {
		userId: userId,
		workId: route.query.workId,
		potWorkDeviceList: potWorkDeviceLists,
		testUserList: testUserId.value,
		adoptUserId: adoptUserId.value,
		temperature: temperature.value,
		humidity: humidity.value,
		weather: weatherId.value,
		mtCode: deviceInfo.value?.deviceCode || ''
	}
	try {
		loading.value = {
			uuid: 'submit_potWork',
			val: true,
			loadText: '提交中...'
		}
		await http.submitPotWorkHandler(params)
		router.push({
			name: 'Powercut',
			query: {}
		})
	} catch (error) {
		ElMessage({
			type: 'error',
			message: '提交失败',
			grouping: true
		})
	}
	loading.value = {
		uuid: 'submit_potWork',
		val: false
	}
}

const onClickLeft = () => {
	router.go(-1)
}

const imgUrl = computed(() => (idx) => new URL(`../../../assets/images/result${idx}.png`, import.meta.url).href)
const imgCheckedUrl = computed(() => (flag) => new URL(`../../../assets/images/${flag ? 'check' : 'uncheck'}.png`, import.meta.url).href)
onMounted(() => {
	getWeatherInfo()
})
</script>

<template>
	<div class="container">
		<van-nav-bar :title="`${route.query.workName}`" left-arrow @click-left="onClickLeft"> </van-nav-bar>
		<div class="content">
			<div class="title1">基本信息</div>
			<div class="base-info">
				<ul>
					<li>
						<div class="label"><span class="required">*</span>负责人</div>
						<div class="value" @click="showSheet('1')">
							<span v-if="adoptName" class="text">{{ adoptName }}</span
							><span v-else>请选择负责人</span>
							<img src="../../../assets/images/outlined.png" alt="" />
						</div>
					</li>
					<li>
						<div class="label"><span class="required">*</span>试验人</div>
						<div class="value" @click="showSheet('2')">
							<span v-if="testUser" class="text">{{ testUser }}</span
							><span v-else>请选择试验人</span>
							<img src="../../../assets/images/outlined.png" alt="" />
						</div>
					</li>
					<li>
						<div class="label">天气状况</div>
						<div class="value" @click="showSheet('3')">
							<span v-if="weather" class="text">{{ weather }}</span
							><span v-else>请选择天气状况</span>
							<img src="../../../assets/images/outlined.png" alt="" />
						</div>
					</li>
					<li style="padding-top: 20px">
						<div class="label">环境温度<sup>o</sup>C</div>
						<Pedometer v-model="temperature" :min="-40" :max="80" :precision="1" />
					</li>
					<li style="padding: 20px 24px 20px">
						<div class="label">环境湿度%rh</div>
						<Pedometer v-model="humidity" :min="0" :max="100" :precision="1" />
					</li>
				</ul>
			</div>
			<ul class="methods-ul">
				<li v-for="(item, index) in potWorkDeviceList" :key="index">
					<div class="title">
						<span>{{ item.deviceInfoDO.deviceName }}</span
						><span>调度号：{{ item.deviceInfoDO.dispatchNumber }}</span>
					</div>
					<div v-for="(it, idx) in item.itemInfoList" :key="idx" class="item">
						<div>
							<img src="../../../assets/images/tg.png" alt="" />
							<span style="font-size: 28px">{{ it.potItemCn }}</span>
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
						</div>
					</div>
					<div class="item">
						<span class="label">试验结论</span>
						<div class="value">
							<div
								v-for="(it, idx) in result"
								:key="idx"
								class="result-item"
								:style="{
									color: it.color,
									background: item.potResult === it.type ? it.background : '#F7F7FA'
								}"
								@click="clickResult(idx, index)"
							>
								{{ it.name }}
								<img v-if="item.potResult === it.type" :src="imgUrl(idx)" alt="" />
							</div>
						</div>
					</div>
					<div class="remark">
						<div class="title-remark">备注</div>
						<div style="padding: 0 24px">
							<el-input
								v-model="item.deviceInfoDO.potDeviceRemark"
								v-keyboard
								type="textarea"
								maxlength="100"
								show-word-limit
								clearable
								placeholder="您可在此处输入备注"
								class="input-with-select"
								@clear="clear"
							>
							</el-input>
						</div>
					</div>
				</li>
			</ul>
		</div>
		<div class="btns">
			<van-button class="btn" color="#fff" type="primary" text="取消" @click="$router.go(-1)" />
			<van-button class="btn" type="primary" text="提交" @click="submit" />
		</div>

		<!-- 负责人，试验人,天气弹框 -->
		<van-action-sheet v-model:show="sheetShow" :description="title" class="submit-action min-sheet">
			<div class="contents">
				<ul>
					<li v-for="(item, index) in actionsDevice" :key="index" @click="clickChecked(item, index)">
						<img v-if="type === '2'" :src="imgCheckedUrl(item.checked)" alt="" />
						<span
							:style="{
								color: item.checked ? '#0D867F' : '#333333',
								'font-weight': item.checked ? 600 : 400
							}"
							>{{ item.name }}</span
						>
					</li>
				</ul>
			</div>
            <div class="bottom">
                <div class="line"></div>
                <div class="btn">
                    <div v-if="type === '2'" class="sure" @click="selectPeople()">确定</div>
                    <div @click="sheetShow = false">取消</div>
                </div>
            </div>
		</van-action-sheet>

		<!-- 提交确认弹框 -->
		<van-dialog v-model:show="submitShow" title="提示" class="submit-dialog" show-cancel-button confirm-button-text="确定提交" @confirm="submitwork()">
			<div class="content" style="white-space: normal">
				<div style="">
					1.本机尚有<span class="num">{{ potCount }}条</span>记录等待同步，请耐心等待！
				</div>
				<div style="">2.工单提交完成后将不能添加、修改、上传检测结果。</div>
			</div>
		</van-dialog>
	</div>
</template>
<style lang="scss" scoped>
@use './index.scss';
@use '../scss/common.scss';
</style>
