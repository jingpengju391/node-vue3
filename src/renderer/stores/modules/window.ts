import { defineStore } from 'pinia'
import { ModuleOption } from '../definition'
import { isDev } from '@/hooks/api'

export interface State {
	minimize: boolean
	loading: boolean
}

export type Getters = Record<string, never>

export interface Actions {
	updatedMinimize: () => void
	closeLoading: () => void
}

type ModelsModule = ModuleOption<State, Getters, Actions>

const windowStoreOptions: ModelsModule = {
	persist: isDev
		? {
				storage: sessionStorage
			}
		: false,
	state: () => ({
		minimize: true,
		loading: true
	}),
	actions: {
		updatedMinimize() {
			this.minimize = !this.minimize
		},
		closeLoading() {
			this.loading = !this.loading
		}
	}
}

export default defineStore('window', windowStoreOptions)
