<script setup lang="ts" name="UpgradeVersion">
import { useStores } from '@stores'
import { process } from '@hooks/api'
import { sleep } from '@util/index'
const { login: netLoginStore } = useStores()
const { upgradConfig } = storeToRefs(netLoginStore)
const percentage = computed(() => {
	if (!upgradConfig.value?.total) return 0
	return Math.floor((upgradConfig.value!.loaded / upgradConfig.value!.total) * 100)
})
const tip = computed(() => (percentage.value < 100 ? '请保持网络连接，预计用时5分钟' : '正在升级中...'))
const describes = computed(() => {
	const [key, value] = upgradConfig.value!.describe?.split(':').map((s) => s.trim()) || ['', '']
	return {
		[key]: value ? value.split(';').map((item) => item.trim()) : []
	}
})

const cancel = ref(false)
const cancelUpgrade = async () => {
	cancel.value = true
	process.cancelUpgrade()
	await sleep(1000)
	netLoginStore.updatedUpgradConfig(undefined)
	cancel.value = false
}
</script>
<template>
	<div v-if="upgradConfig && upgradConfig.total" class="upgrade">
		<div class="upgrade-info">
			<i-ep-close class="close" color="#0d867f" @click="cancelUpgrade()" />
			<div class="loader"></div>
			<h2>{{ cancel ? '正在取消升级' : '发现新版本程序' }} V{{ upgradConfig?.version }}</h2>
			<ul v-for="(vals, k) in describes" :key="k">
				<h3 v-show="k">{{ k }}：</h3>
				<li v-for="d in vals" :key="d">{{ d }}</li>
			</ul>
			<el-progress class="progress-ug" :percentage="percentage" :stroke-width="15" striped striped-flow :duration="10" />
			<span>{{ tip }}</span>
		</div>
	</div>
</template>
<style lang="scss" scoped>
@use '../../themes/variables' as *;
.upgrade {
	position: fixed;
	top: 0;
	left: 0;
	display: flex;
	width: 100vw;
	height: 100vh;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.55);
	z-index: 2;
	&-info {
		position: relative;
		display: flex;
		min-width: 400px;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #fff;
		border-radius: 5px;
		gap: 24px;
		padding: 42px;
		font-size: $font-size-md;
		.close {
			position: absolute;
			right: 24px;
			top: 24px;
		}
		.progress-ug {
			width: 80%;
		}
		h1 {
			margin: 0;
		}
		ul {
			list-style: disc;
			li {
				max-width: 500px;
				margin-left: 24px;
			}
		}
	}
}

.loader {
	width: 60px;
	height: 60px;
	background: #4285f4;
	border-radius: 10%;
	animation: dice3 7s ease-in-out infinite;
	filter: drop-shadow(2px 3px 40px #444);
}

@keyframes dice3 {
	from,
	to {
		transform: translateX(-100px) rotateX(0deg);
	}

	25% {
		background: #db4437;
	}

	50% {
		background: #f4b400;
		transform: translateX(100px) rotate(360deg);
	}

	75% {
		background: #0f9d58;
	}
}
</style>
