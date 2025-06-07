<script setup lang="ts" name="layout">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Header, Tabbar } from '@/components'

const route = useRoute()
const cachedComponents = computed(() => {
	const componentName = !route.meta.uncached ? (route.name as string) : null
	return componentName ? [componentName] : []
})
const routePath = ref<string>('')
watch(
	() => route.path,
	(newPath, oldPath) => {
		routePath.value = newPath
	}
)
const isLoginView = computed(() => route.name === 'LoginView')
</script>

<template>
	<div :class="{ layoutContainer: !isLoginView }">
		<Header />
		<router-view v-slot="{ Component }">
			<keep-alive :include="cachedComponents">
				<div class="layoutContainer-flexible">
					<component :is="Component" />
				</div>
			</keep-alive>
		</router-view>
		<Tabbar v-show="!isLoginView && !route.meta.isHideTabbar" />
	</div>
</template>

<style lang="scss" scoped>
.layoutContainer {
	display: flex;
	width: 100vw;
	height: 100vh;
	flex-direction: column;
	background: #f5f7fa;
	&-flexible {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}
}
</style>
