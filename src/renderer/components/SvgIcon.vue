<script setup lang="ts" name="SvgIcon">
import { computed } from 'vue'
const props = defineProps({
	prefix: {
		type: String,
		default: 'icon'
	},
	name: {
		type: String,
		required: true
	},
	color: {
		type: String,
		default: '#333'
	},
	size: {
		type: String,
		default: '40px'
	}
})

const symbolId = computed(() => `#${props.prefix}-${props.name}`)
</script>
<template>
	<svg :style="{ width: size, height: size }" aria-hidden="true">
		<use :href="symbolId" :fill="color" :width="size" :height="size" />
	</svg>
</template>
