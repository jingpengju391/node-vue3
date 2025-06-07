<script setup lang="ts" name="ImageView">
import { ref } from 'vue'
const props = withDefaults(
	defineProps<{
		src: string
		fit?: 'fill' | 'cover' | 'contain' | 'none' | 'scale-down'
		loading?: boolean
		errSrc?: string
		zoomRate?: number
		maxScale?: number
		initialIndex?: number
		previewSrcList?: string[]
	}>(),
	{
		src: '',
		fit: 'cover',
		loading: true,
		errSrc: '',
		zoomRate: 1.2,
		maxScale: 7,
		initialIndex: 0,
		previewSrcList: () => []
	}
)
const imageLoad = ref<boolean>(props.loading)
const closeLoad = () => (imageLoad.value = false)
</script>

<template>
	<el-image
		v-loading="imageLoad"
		class="container-image"
		:src="src"
		:fit="fit"
		:zoom-rate="zoomRate"
		:max-scale="maxScale"
		:initial-index="initialIndex"
		:preview-src-list="previewSrcList"
		@load="closeLoad"
		@error="closeLoad"
	>
		<template #error>
			<el-image v-if="errSrc" :src="errSrc" />
			<i-ep-picture v-else class="image-slot" />
		</template>
	</el-image>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
