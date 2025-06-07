<script setup lang="ts">
import { useStores } from '@stores'
const { root: rootStore, network: networkStore } = useStores()
const { deviceInfo, cpu, memory, disk, version, blueToothName } = storeToRefs(rootStore)
const { communication } = storeToRefs(networkStore)
</script>

<template>
	<van-nav-bar title="终端信息"> </van-nav-bar>
	<el-scrollbar>
		<van-cell-group title="硬件参数">
			<van-cell title="设备名称" :value="deviceInfo?.deviceName || '智能监测移动终端'" />
			<van-cell title="设备编码" :value="deviceInfo?.deviceCode || '-'" />
			<van-cell title="蓝牙名称" :value="blueToothName || 'sssss'" />
			<van-cell title="CPU使用" :value="cpu ? `${cpu}%` : '-'" />
			<van-cell title="内存大小" :value="memory ? `${Math.round(memory.totalMemory / Math.pow(1024, 3))}GB` : '-'" />
			<van-cell title="内存使用" :value="memory ? `${memory.memoryUsagePercentage}%` : '-'" />
			<van-cell title="硬盘空间" :value="disk ? `${Math.round((disk.available + disk.used) / Math.pow(1024, 3))}GB` : '-'" />
			<van-cell title="硬盘使用占比" :value="disk ? `${(disk.used / (disk.available + disk.used) * 100).toFixed(2)}%` : '-'" />
			<van-cell title="SIM编号" :value="communication?.data.simCardNum || '-'" />
			<van-cell title="WAPI-MAC1" :value="communication?.data.WAPI1MAC || '-'" />
			<van-cell title="WAPI-MAC2" :value="communication?.data.WAPI2MAC || '-'" />
		</van-cell-group>
		<van-cell-group title="程序版本">
			<van-cell title="软件程序版本" :value="version || '-'" />
		</van-cell-group>
	</el-scrollbar>
</template>
<style lang="scss" scoped>
@use './index.scss';
</style>
