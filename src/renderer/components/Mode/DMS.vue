<script setup lang="ts" name="ModeDMS">
import type { FormInstance } from 'element-plus'
import { useStores } from '@stores'
import { extractIpPort, regexIp } from '@utils/regex'
const { workOrder: workOrderStore, network } = useStores()
const { currentMode, currentModeIPMap } = storeToRefs(workOrderStore)
const { currentAvailableWifi } = storeToRefs(network)

const form = reactive({
	ssid: '',
	ip: ''
})

const rules = {
	ssid: [{ trigger: 'change', required: true, message: '未连接wifi' }],
	ip: [{ trigger: 'change', required: true, pattern: regexIp, message: 'ip格式错误' }]
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
		const { ip } = extractIpPort(currentModeIPMap.value[val] || '')
		form.ip = ip
	},
	{ immediate: true }
)

defineExpose({ onSubmit, form })
</script>
<template>
	<aside :class="{ content: true, active: currentMode === 3 }">
		<h2>DMS/特因谱</h2>
		<h3>对接笔记本电脑</h3>
	</aside>
	<el-form v-show="currentMode === 3" ref="formRef" hide-required-asterisk :model="form" :label-width="currentMode === 3 ? 'auto' : 1" label-position="right" class="mode-form-box">
		<el-form-item :rules="rules.ssid" prop="ssid" label="WIFI连接" @click="network.toggleWifiNaviViewDisplay(true)">
			<span :class="{ cliented: !!form.ssid, wifiName: true }" @click="network.toggleWifiNaviViewDisplay(true)">{{ form.ssid || '前往连接' }}</span>
		</el-form-item>
		<el-form-item :rules="rules.ip" prop="ip" label="笔记本IP">
			<el-input v-model="form.ip" v-keyboard placeholder="示例：192.168.10.64"></el-input>
		</el-form-item>
		<van-notice-bar color="#333" background="#e7f3f2" left-icon="volume-o"> 请将终端和笔记本链接到同一网络，并填写笔记本无线网络的ip。 </van-notice-bar>
	</el-form>
</template>
<style lang="scss" scoped>
@use './mode.scss';
</style>
