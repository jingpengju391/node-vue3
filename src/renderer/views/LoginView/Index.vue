<script setup lang="ts" name="login">
import { useRouter } from 'vue-router'
import { isDev, process } from '@hooks/api'
import { useStores } from '@stores'
import { clear } from '@/components/SimpleKeyboard/hook'
import Background from './Background.vue'
import { cleanIpcErrorMessage } from '@/utils/regex'

const remember = ref(true)
const username = ref('')
const password = ref('')
const { login: netLoginStore, network: networkStore, root: rootStore, workOrder: workOrderStore } = useStores()
const { user, remember: rb, upgradConfig } = storeToRefs(netLoginStore)

const router = useRouter()
const handleLogin = async () => {
	try {
		if ((!networkStore.communication || networkStore.communication?.data?.csq?.toString() === '0') && !isDev) {
			ElMessage({
				type: 'error',
				message: '网络未连接，点击状态栏选择要连接的网络。',
				grouping: true
			})
			return
		}
		if (!isDev) {
			await rootStore.syncClockWithTimezone()
			await process.upgrade()
		}
		if (upgradConfig.value) return
		await netLoginStore.login({ username: username.value, password: password.value, remember: remember.value })
		await workOrderStore.syncWorkOrderFromPlatform()
		await netLoginStore.syncDictionaryEncode(true)

		router.push({ name: user.value?.appMajor === 8 ? 'Powercut' : 'WorkOrder' })
	} catch (error) {
		ElMessage({
			type: 'error',
			message: cleanIpcErrorMessage((error as Error)),
			grouping: true
		})
	}
}

watch(
	() => [user.value, rb.value],
	() => {
		username.value = user.value?.userName || ''
		password.value = user.value?.password || ''
		remember.value = !!rb.value
	},
	{ immediate: true }
)
</script>

<template>
	<div class="container">
		<div class="container-input">
			<span class="welcome-txt">您好，<br />欢迎使用智能监测移动终端</span>
			<el-input v-model="username" v-keyboard placeholder="用户名" clearable @clear="clear"></el-input>
			<el-input v-model="password" v-keyboard placeholder="密码" show-password clearable @clear="clear"></el-input>
			<van-checkbox v-model="remember" checked-color="#0D867F">记住密码</van-checkbox>
		</div>
		<van-button v-click.disabled.loading="{ loadText: '正在登录中...', handleClick: handleLogin }" :disabled="!username || !password" round size="large" type="primary">登录</van-button>
	</div>
	<background />
</template>
<style lang="scss" scoped>
@use './index.scss';
</style>
