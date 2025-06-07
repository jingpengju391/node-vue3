<script setup lang="ts" name="DetectClimate">
import { useRouter } from 'vue-router'
import { useStores } from '@stores'
import { DetectConclusion, SubWork } from '@shared/dataModelTypes/WorkOrder'
import { ImageView } from '@components'
const { workOrder: workOrderStore } = useStores()
const { subWorkOrders, currentDetectClimate, currentWorkOrder } = storeToRefs(workOrderStore)
const router = useRouter()

const getAssetsFile = (name: string | undefined): string => new URL(`../../../assets/svg/${name}.svg`, import.meta.url).href

const getPercentageBySubWork = (subWork: SubWork): number => {
	if (!subWork.detectPositionTotal) return 0
	return Math.min(Math.round((subWork.detectPositionComplete / subWork.detectPositionTotal) * 100), 100)
}

const isActive = (subWork: SubWork, text: string): boolean => {
	const findResult = currentDetectClimate.value.subWorkList?.find((r) => r.subWorkId === subWork.subWorkId)
	if (findResult && findResult.detectConclusion === text) {
		return true
	}
	return false
}

const toggleDetectConclusion = (subWorkId: string, detectConclusion: string) => {
	const sl = currentDetectClimate.value.subWorkList?.find((s) => s.subWorkId === subWorkId)
	if (sl) {
		sl.detectConclusion = detectConclusion
	}
}

onMounted(async () => {
	await workOrderStore.syncSubOrderPointReasonFromPlatform()
})
</script>
<template>
	<van-nav-bar :title="currentWorkOrder?.workName" @click-left="router.push({ name: 'WorkOrder-DetectMethod' })">
		<template #left>
			<van-icon name="arrow-left" />
		</template>
	</van-nav-bar>
	<van-notice-bar left-icon="volume-o" mode="closeable" color="#0D867F " background="#E7F3F2" text="请确定各终端数据均上传完成后再进行提交！提交完成后平台将不再接收数据。" />
	<h3>请填写环境数据</h3>
	<el-scrollbar>
		<aside class="detect-method-climate">
			<span>环境温度（<sup>o</sup>C）</span>
			<van-stepper v-model="currentDetectClimate!.temperature" v-keyboard disable-input :min="-40" :max="80" />
		</aside>
		<aside class="detect-method-climate">
			<span>环境湿度（%rh）</span>
			<van-stepper v-model="currentDetectClimate!.humidity" v-keyboard disable-input :min="0" :max="100" />
		</aside>
		<aside v-for="item in subWorkOrders" :key="item.subWorkId" class="detect-method-item">
			<div>
				<image-view class="container-image" :src="getAssetsFile(item!.detectMethod.toString())" :err-src="getAssetsFile('default_pic')" />
				<h4 class="center-r">{{ item.detectMethodCn }}</h4>
				<h4>进度：{{ getPercentageBySubWork(item) }}%</h4>
			</div>
			<div>
				<h4>检查结论：</h4>
				<p
					:class="{ ['select-item']: true, ['center-l']: true, active: isActive(item, DetectConclusion.NoAbnormality) }"
					@click="toggleDetectConclusion(item.subWorkId, DetectConclusion.NoAbnormality)"
				>
					{{ DetectConclusion.NoAbnormality }}
				</p>
				<p :class="{ ['select-item']: true, active: isActive(item, DetectConclusion.AbnormalFound) }" @click="toggleDetectConclusion(item.subWorkId, DetectConclusion.AbnormalFound)">
					{{ DetectConclusion.AbnormalFound }}
				</p>
			</div>
		</aside>
	</el-scrollbar>
	<aside class="button-box">
		<span @click="router.push({ name: 'WorkOrder-DetectMethod' })">取消</span>
		<span @click="router.push({ name: 'WorkOrder-UndetectedPoints' })">下一步</span>
	</aside>
</template>
<style lang="scss" scoped>
@use '../scss/detect-climate.scss';
</style>
