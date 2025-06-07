<script setup lang="ts" name="ModeT95">
import { useStores } from '@stores'
const { workOrder: workOrderStore } = useStores()
const { currentMode } = storeToRefs(workOrderStore)
</script>
<template>
	<aside :class="{ content: true, active: currentMode === 2 }">
		<h2>T95</h2>
		<h3>对接华乘T95检测仪器</h3>
	</aside>
</template>
<style lang="scss" scoped>
@use './mode.scss';
</style>
