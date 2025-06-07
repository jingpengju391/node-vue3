<script setup lang="ts">
import { useStores } from '@stores'
import { useRouter } from 'vue-router'
import { SvgIcon } from '@/components'
import { storage } from '@lib/storage'
import { process } from '@hooks/api'
import { clear } from '@/components/SimpleKeyboard/hook'

const { login: loginStore, root: rootStore } = useStores()
const active = ref<'wapi' | '5g' | undefined>(undefined)

const { user } = storeToRefs(loginStore)

const router = useRouter()
const handlerLoginOut = async () => {
	ElMessageBox.confirm('确定注销并退出系统吗？', '提示', {
		distinguishCancelAndClose: true,
		confirmButtonText: '确定',
		cancelButtonText: '取消',
		showClose: false
	})
		.then(() => {
			storage.remove('loginTime')
			storage.remove('lastVisitedPath')
			router.push({ name: 'LoginView' })
		})
		.catch(() => {})
}

const selectDefultNetwork = (networkType: 'wapi' | '5g') => {
	try {
		process.handlerDefultNetwork(networkType)
	} catch (error) {
		ElMessage({
			type: 'error',
			message: (error as Error).message,
			grouping: true
		})
	}
}

const dialogFormVisible = ref(false)
const code = ref('')

const activation = () => {
	dialogFormVisible.value = false

	if (code.value === 'maintenance') {
		rootStore.updatedMaintenanceCode(code.value)
		ElMessage.success('运维模式激活成功')
	} else {
		ElMessage.error('运维码错误')
	}
}

onMounted(async () => {
	active.value = await process.getDefultNetwork()
})
</script>

<template>
	<div class="user-container">
		<svg-icon size="100px" class="head-img" color="#0d867f" :name="user?.sex === '1' ? 'touxiang-nv' : 'morentouxiang'" />
		<div class="user-container-info">
			<h1>{{ user?.userName }}</h1>
			<div class="user-container-info-up">
				<span>
					<svg-icon size="44px" color="#0d867f" name="wode" />
					<em>{{ user?.userNick }}</em>
				</span>
				<span>
					<svg-icon size="44px" color="#0d867f" name="dianhua1" />
					<em>{{ user?.phonenumber || '--' }}</em>
				</span>
			</div>
		</div>
	</div>

	<div class="set-container">
		<div class="set-container-item">
			<h2>默认网络</h2>
			<van-tabs v-model:active="active" type="card" @change="selectDefultNetwork">
				<van-tab title="WAPI" name="wapi"></van-tab>
				<van-tab title="5G" name="5g"></van-tab>
			</van-tabs>
		</div>
		<div class="set-container-item" @click="dialogFormVisible = true">
			<h2>运维模式</h2>
		</div>
	</div>

	<van-button v-click.disabled="{ handleClick: handlerLoginOut }" class="login-out" type="primary">退出登录</van-button>

	<el-dialog v-model="dialogFormVisible" title="激活运维模式请输入运维码">
		<el-input v-model="code" v-keyboard placeholder="用户名" clearable @clear="clear"></el-input>
		<template #footer>
			<div class="dialog-footer">
				<el-button @click="dialogFormVisible = false">取消</el-button>
				<el-button type="primary" @click="activation"> 激活 </el-button>
			</div>
		</template>
	</el-dialog>
</template>
<style lang="scss" scoped>
@use './index.scss';
</style>
