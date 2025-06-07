import HttpClient, { Method } from './client'

const defaultConfig = {}
const defaultMethod = {}

export const $http = (url: string, method: Method, params?: any, loadText?: string, options?: any, isFile: boolean = false) => {
	const defaultParams = Object.assign({}, defaultConfig, defaultMethod?.[method] ?? {})
	const data = params
		? {
				...defaultParams,
				...params
			}
		: undefined
	return new HttpClient(url, method, data, loadText, options, isFile).SendRequest()
}
