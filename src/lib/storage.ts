export const storage = {
	set(key: string, value: string) {
		sessionStorage.setItem(key, JSON.stringify(value))
	},
	get(key: string) {
		const obj = sessionStorage.getItem(key)
		if (obj && obj !== 'undefined' && obj !== null) {
			return JSON.parse(obj)
		}
		return ''
	},
	remove(key: string) {
		key && sessionStorage.removeItem(key)
	},
	localSet(key: string, value: string) {
		localStorage.setItem(key, JSON.stringify(value))
	},
	localGet(key: string) {
		const obj = localStorage.getItem(key)
		if (obj && obj !== 'undefined' && obj !== null) {
			return JSON.parse(obj)
		}
		return ''
	},
	localRemove(key: string) {
		key && localStorage.removeItem(key)
	}
}
