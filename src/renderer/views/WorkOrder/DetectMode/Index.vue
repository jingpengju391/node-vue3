<script setup lang="ts" name="DetectMode">
import { useRouter } from 'vue-router'
import { useStores } from '@stores'
import { ModeCollaborative, ModeDMS, ModeT95, ModeTask } from '@components'
import { process } from '@hooks/api'
import { DetectMode } from '@shared/dataModelTypes/WorkOrder'
import { extractIpPort } from '@utils/regex'

interface ChildComponentExpose {
	onSubmit: () => void
	form: {
		ssid: string
		ip: string
	}
}

const router = useRouter()
const { root: rootStore, workOrder: workOrderStore } = useStores()
const { currentSubWorkOrder, currentMode } = storeToRefs(workOrderStore)
const components = {
	'0': ModeCollaborative,
	'1': ModeTask,
	'2': ModeT95,
	'3': ModeDMS
}

const modeRefMap = ref<Record<DetectMode, ChildComponentExpose | null>>({
	'0': null,
	'1': null,
	'2': null,
	'3': null
})

function isComponentInstance(el: Element | ComponentPublicInstance | null): el is ComponentPublicInstance {
	return !!el && '$el' in el
}

function setRef(el: Element | ComponentPublicInstance | null, key: DetectMode) {
	if (isComponentInstance(el)) {
		modeRefMap.value[key] = el as unknown as ChildComponentExpose // 'modeRefMap.value' is possibly 'undefined'.
	} else {
		modeRefMap.value[key] = null // 'modeRefMap.value' is possibly 'undefined'.
	}
}

const startTask = async () => {
	try {
		if (currentMode.value === 0) {
			workOrderStore.updatedCurrentModeIpMap('192.168.4.1')
			workOrderStore.updatedSocketIdConnectedStatus('192.168.4.1', false)
			process.pollInfraredFiles(currentMode.value)
			router.push({ name: 'WorkOrder-Groups' })
			return
		}

		if (currentMode.value === 2) {
			router.push({ name: 'WorkOrder-Groups' })
			return
		}

		await modeRefMap.value[currentMode.value!]?.onSubmit()
		const { ip, port } = extractIpPort(modeRefMap.value[currentMode.value!]!.form.ip)!
		if (currentMode.value === 1) {
			const mac = await process.fetchMacAddress(ip)
			rootStore.updatedSensorEid(mac, 1)
		}
		workOrderStore.updatedCurrentModeIpMap(`${ip}:${port}`)
		workOrderStore.updatedSocketIdConnectedStatus(`${ip}:${port}`, false)
		process.serverConnect(ip, port)
		router.push({ name: 'WorkOrder-Groups' })
	} catch (error) {
		ElMessage({
			type: 'error',
			message: (error as Error).message,
			grouping: true
		})
	}
}

onMounted(() => {
	const mode = currentSubWorkOrder.value ? currentSubWorkOrder.value.mode![0] : undefined
	workOrderStore.updatedCurrentMode(mode)
})
</script>
<template>
	<van-nav-bar title="检测模式选择" @click-left="router.push({ name: 'WorkOrder-DetectMethod' })">
		<template #left>
			<van-icon name="arrow-left" />
		</template>
	</van-nav-bar>
	<el-scrollbar class="content-mode">
		<div v-for="item in currentSubWorkOrder?.mode" :key="item" @click="workOrderStore.updatedCurrentMode(item)">
			<component :is="components[item]" :ref="(el) => setRef(el, item)" />
		</div>
	</el-scrollbar>
	<aside class="button-box">
		<span @click="router.push({ name: 'WorkOrder-DetectMethod' })">返回</span>
		<span @click="startTask">开始任务</span>
	</aside>
</template>
<style lang="scss" scoped>
@use '../../../themes/variables' as *;
.content-mode {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
.button-box {
	display: flex;
	width: 100%;
	font-size: $font-size-xxl;
	gap: 2px;
	span {
		flex: 1;
		text-align: center;
		color: #333;
		background: #fff;
		line-height: 100px;
	}
	span:last-child {
		color: $dominant-color;
	}
}
</style>
