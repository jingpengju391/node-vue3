<script setup lang="ts" name="GroupItem">
import { useRouter } from 'vue-router'
import { useStores } from '@stores'
import workOrderDataSource from '@stores/modules/workOrderDataSource'
import { SimplifiedGroup, CompleteGroup } from '@shared/dataModelTypes/WorkOrder'
import { ImageView, SvgIcon } from '@components'
const props = withDefaults(defineProps<{ item: SimplifiedGroup | undefined; currentData: CompleteGroup | undefined; isLast: boolean }>(), {
	item: undefined,
	currentData: undefined,
	isLast: true
})
const getAssetsFile = (name: string | undefined): string => new URL(`../../../assets/svg/${name}.svg`, import.meta.url).href

const router = useRouter()
const { workOrder: workOrderStore } = useStores()
const handlerCurrentWorkOrderGroup = () => {
	if (!props.item) return
	workOrderStore.updatedCurrentGroup(props.item.workId, props.item.subWorkId, props.item.groupId)
	router.push({ name: 'WorkOrder-DetectPoint' })
}
</script>
<template>
	<aside :class="{ paddingBottom: !isLast, container: true, active: item?.groupId === currentData?.groupId }" @click="handlerCurrentWorkOrderGroup">
		<image-view class="container-image" :src="getAssetsFile(item!.deviceType)" :err-src="getAssetsFile('default_pic')" />
		<div class="device-name">
			<span>{{ item?.deviceName }}</span>
			<span>{{ item?.detectPositionName }}</span>
		</div>
		<div class="device-status">
			<span class="upload-status">
				<template v-for="[key, value] in Object.entries(item!.status)" :key="key">
					<em v-if="value > 0">
						<svg-icon :name="`upload-${key}`" size="28px" />
						<i :class="{ ['upload-count']: true, [`count-${key}`]: true }">{{ item?.detectMethod === 6 ? Math.max(value / 2, 1) : value }}</i>
					</em>
				</template>
			</span>
			<span v-if="item?.detectMethod === 6" class="right-t point-number">点位：{{workOrderDataSource.clacPointCount(item.workId, item.subWorkId, item.groupId)}}</span>
			<van-icon v-else class="right-t" name="arrow" />
		</div>
	</aside>
</template>
<style scoped lang="scss">
@use '../scss/group-item.scss';
</style>
