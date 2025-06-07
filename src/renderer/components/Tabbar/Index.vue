<script setup lang="ts" name="Tabbar">
import { useStores } from '@stores'
import { SvgIcon } from '@/components'
import { http } from '@hooks/api'

const active = ref(0)
const { login: loginStore } = useStores()
const { user } = storeToRefs(loginStore)
</script>
<template>
	<van-tabbar v-model="active" class="tabbar-container" active-color="#0d867f" route>
		<van-tabbar-item v-if="user?.appMajor === 8" to="/Powercut">
			<span>停电试验</span>
			<template #icon="props">
				<svg-icon :color="props.active ? '#0d867f' : '#333'" name="tingdianjiance" />
			</template>
		</van-tabbar-item>
		<van-tabbar-item v-else to="/WorkOrder">
			<span>带电检测</span>
			<template #icon="props">
				<svg-icon :color="props.active ? '#0d867f' : '#333'" name="dianzhanguanli" />
			</template>
		</van-tabbar-item>
		<van-tabbar-item to="/Device">
			<span>终端信息</span>
			<template #icon="props">
				<svg-icon :color="props.active ? '#0d867f' : '#333'" name="zhongduanxinxiweihu" />
			</template>
		</van-tabbar-item>
		<van-tabbar-item to="/User">
			<span>我的</span>
			<template #icon="props">
				<svg-icon :color="props.active ? '#0d867f' : '#333'" name="wode" />
			</template>
		</van-tabbar-item>
	</van-tabbar>
</template>
<style lang="scss" scoped>
@use '../../themes/variables' as *;
.tabbar-container {
	position: static;
	height: auto;
	padding: 20px 0;
	:deep(.van-tabbar-item__text) {
		span {
			font-size: $font-size-xl;
		}
	}
}
</style>
