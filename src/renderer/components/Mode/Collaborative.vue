<script setup lang="ts" name="ModeCollaborative">
import { useStores } from '@stores'
const { workOrder: workOrderStore } = useStores()
const { currentMode } = storeToRefs(workOrderStore)
</script>
<template>
	<aside :class="{ content: true, active: currentMode === 0 }">
		<h2>终端协同模式</h2>
		<h3>在终端选择检测点位、相机拍照并实时回传结果</h3>
	</aside>
</template>
<style lang="scss" scoped>
@use './mode.scss';
</style>
