<script setup lang="ts" name="ModeTask">
import type { FormInstance } from 'element-plus'
import { useStores } from '@stores'
import { regexIpPort } from '@utils/regex'
const { workOrder: workOrderStore, network } = useStores()
const { currentMode, currentModeIPMap } = storeToRefs(workOrderStore)
const { currentAvailableWifi } = storeToRefs(network)

const form = reactive({
	ssid: '',
	ip: ''
})

const rules = {
	ssid: [{ trigger: 'change', required: true, message: '未连接wifi' }],
	ip: [{ trigger: 'change', required: true, pattern: regexIpPort, message: 'ip格式错误' }]
}

watch(
	() => currentAvailableWifi.value,
	() => {
		form.ssid = currentAvailableWifi.value?.ssid || ''
	},
	{ immediate: true }
)

const formEl = useTemplateRef<FormInstance | undefined>('formRef')
const onSubmit = () => formEl.value?.validate()

watch(
	() => currentMode.value,
	(val) => {
		if (!val) return
		form.ip = currentModeIPMap.value[val] || ''
	},
	{ immediate: true }
)

defineExpose({ onSubmit, form })
</script>
<template>
	<aside :class="{ content: true, active: currentMode === 1 }">
		<h2>相机任务包模式</h2>
		<h3>终端下发任务包到相机，相机可独立工作，完成后回传检测结果</h3>
	</aside>
	<el-form v-show="currentMode === 1" ref="formRef" hide-required-asterisk :model="form" :label-width="currentMode === 1 ? 'auto' : 1" label-position="right" class="mode-form-box">
		<el-form-item :rules="rules.ssid" prop="ssid" label="WIFI连接" @click="network.toggleWifiNaviViewDisplay(true)">
			<span :class="{ cliented: !!form.ssid, wifiName: true }" @click="network.toggleWifiNaviViewDisplay(true)">{{ form.ssid || '前往连接' }}</span>
		</el-form-item>
		<el-form-item :rules="rules.ip" prop="ip" label="相机IP">
			<el-input v-model="form.ip" v-keyboard placeholder="ip+端口 示例：192.168.10.64:8080"></el-input>
		</el-form-item>
		<van-notice-bar color="#333" background="#e7f3f2" left-icon="volume-o"> 请确认相机支持任务包模式并开启热点 </van-notice-bar>
	</el-form>
</template>
<style lang="scss" scoped>
@use './mode.scss';
</style>
