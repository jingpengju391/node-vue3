const DEFAULT_LOADING_TXT = '加载中...' // Default loading text
const _loadingCount = ref(0) // Tracks the number of active loading requests
export const loadingText = ref(DEFAULT_LOADING_TXT) // Reactive reference for loading text
const loadingUuid = ref<string | null>(null) // Stores the current loading request UUID
const timeoutMap = new Map<string, NodeJS.Timeout>() // Stores timeout references for each request

export const loading = computed({
	get() {
		// Returns true if there are active loading requests
		return _loadingCount.value > 0
	},
	set(param: { val: boolean; loadText?: string; uuid: string; timer?: number }) {
		if (param.val) {
			// If there is an existing loading UUID and it's different from the new one, reset the count
			if (loadingUuid.value && loadingUuid.value !== param.uuid) {
				_loadingCount.value = 0
			}
			loadingUuid.value = param.uuid
			_loadingCount.value++ // Increment loading count
			loadingText.value = param.loadText || DEFAULT_LOADING_TXT // Update loading text

			// Clear the existing timeout if it exists for the given UUID
			if (timeoutMap.has(param.uuid)) {
				clearTimeout(timeoutMap.get(param.uuid)!)
			}

			// Set a timeout to automatically close loading after 10 seconds
			const timeoutId = setTimeout(() => {
				_loadingCount.value = Math.max(0, _loadingCount.value - 1) // Decrement loading count
				if (_loadingCount.value === 0) {
					loadingUuid.value = null // Reset UUID when all requests are cleared
				}
				timeoutMap.delete(param.uuid) // Remove the timeout reference

				// Display a warning message when the request times out
				// ElMessage({
				// 	type: 'warning',
				// 	message: '请求超时', // "Request Timeout"
				// 	grouping: true
				// })
			}, param.timer || 20000) // timer or 20-second timeout

			// Store the timeout reference
			timeoutMap.set(param.uuid, timeoutId)
		} else {
			// Decrease the loading count when a request is completed
			_loadingCount.value = Math.max(0, _loadingCount.value - 1)
			if (_loadingCount.value === 0) {
				loadingUuid.value = null // Reset UUID when no requests remain
			}

			// Clear the timeout if it exists
			if (timeoutMap.has(param.uuid)) {
				clearTimeout(timeoutMap.get(param.uuid)!)
				timeoutMap.delete(param.uuid) // Remove timeout reference
			}
		}
	}
})
