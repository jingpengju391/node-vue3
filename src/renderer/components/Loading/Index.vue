<script setup lang="ts">
import { loading, loadingText } from '@/utils/loading'
</script>

<template>
	<van-loading v-show="loading" class="loading-box" size="64px" vertical>{{ loadingText }}</van-loading>
</template>

<style lang="scss" scoped>
@use '../../themes/variables' as *;
.loading-box {
	position: absolute;
	top: $head-height;
	width: 100vw;
	height: calc(100vh - $head-height);
	align-items: center;
	justify-content: center;
	color: $dominant-color;
	background: #00000024;
	z-index: 999;
	:deep(.van-loading__text) {
		font-size: $font-size-lg;
		color: $dominant-bg-color;
	}
}
</style>
