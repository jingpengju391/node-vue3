import { ModelWindowKey } from '@shared/dataModelTypes/windows'
import { isDev } from '@util/process'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, CreateAxiosDefaults, CancelTokenSource } from 'axios'
import axiosRetryImport from 'axios-retry'
import { BrowserWindow } from 'electron'
import { SignalType } from '@shared/dataModelTypes/socket'
import jsonBig from 'json-bigint'
import { isEmptyObject } from '@util/index'

// @ts-ignore fix require default
const axiosRetry = axiosRetryImport.default || axiosRetryImport

// Define possible HTTP methods
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

// Base headers for content type
const BASEHEADER = { 'Content-Type': 'application/json;charset=utf-8' }
// Define headers for each HTTP method
const uniteHeader = {
	POST: BASEHEADER,
	DELETE: BASEHEADER,
	PUT: BASEHEADER,
	GET: BASEHEADER
}

// Environment variables from the build tool
const { VITE_APP_WAPI_PORT, VITE_APP_WAPI_HOST, VITE_APP_FG_PORT, VITE_APP_FG_HOST } = import.meta.env

// Response transformation function after the request is completed
const afterResponse = (window: BrowserWindow, loadText?: string | undefined, isFile?: boolean) => {
	return [
		function (res: string) {
			const result = isFile ? { code: res ? 200 : 500, data: res } : jsonBig({ storeAsString: true }).parse(res)
			const { code, msg } = result
			// Parse response and check for success or failure
			const message = msg || '操作成功！'

			// Show a message if the request failed
			if (code !== 200) {
				if (loadText) {
					window?.webContents.send('mqtt:loading', { val: false, loadText, result: 2 })
				}
				throw new Error(message) // Throw an error for failed response
			}
			if (loadText) {
				window?.webContents.send('mqtt:loading', { val: false, loadText, result: 1 })
			}
			return result
		}
	]
}

// Request transformation function before the request is sent
const beforeResponse = (window: BrowserWindow, cancelSource: CancelTokenSource, loadText?: string | undefined) => {
	return [
		function (data) {
			const loadInfo = { val: true, loadText, message: '' }
			// Check network status and cancel request if not connected
			const networkStore = global.network
			if (!isDev) {
				if (!networkStore || networkStore?.data?.csq?.toString() === '0') {
					cancelSource?.cancel('Request cancelled by transformRequest: no network')
					loadInfo.message = '网络未连接，点击状态栏选择要连接的网络。'
				}
			}

			if (loadText) {
				window?.webContents.send('mqtt:loading', loadInfo)
			}
			return data
		}
	]
}

// HttpClient class to manage HTTP requests
class HttpClient {
	private $http: AxiosInstance
	private url: string
	private method: string
	private data: unknown
	private request: any
	private response: any
	private resData: any
	private loadText: string | undefined
	private timeout: number
	private cancelSource: CancelTokenSource
	private window: BrowserWindow

	// Constructor to initialize the HTTP client with necessary settings
	constructor(url: string, method: Method, data?: unknown, loadText?: string, options?: CreateAxiosDefaults, isFile?: boolean) {
		this.window = global.modelWindow.get(ModelWindowKey.mainWindow)
		// Create a cancel token source for canceling requests
		this.cancelSource = axios.CancelToken.source()

		// Initialize instance properties
		this.url = url
		this.method = method
		this.data = data
		this.loadText = loadText
		this.timeout = options?.timeout || 3000

		// Create an Axios instance with default configurations
		this.$http = axios.create({
			cancelToken: this.cancelSource?.token, // Attach cancel token for canceling requests
			headers: options?.headers?.[method] ?? uniteHeader[method], // Use custom headers for the method
			timeout: this.timeout, // Default timeout is 20 seconds
			withCredentials: options?.withCredentials || false, // Set withCredentials if needed
			transformRequest: options?.transformRequest || beforeResponse(this.window, this.cancelSource, this.loadText), // Custom request transformation
			transformResponse: options?.transformResponse || afterResponse(this.window, this.loadText, isFile) // Custom response transformation
		})

		this.request = this.$http.interceptors.request
		this.response = this.$http.interceptors.response

		// Set up axiosRetry for automatic retries on failed requests
		axiosRetry(this.$http, {
			retries: 3, // Retry up to 3 times
			retryDelay: axiosRetry.exponentialDelay, // Use exponential backoff for retries
			shouldResetTimeout: true,
			retryCondition: (error) => (error.response?.status || 0) >= 500 || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED', // Retry on 5xx errors or network issues
			onRetry: () => {}
		})

		// Request interceptor to modify request configuration before sending
		this.request.use(
			(config: AxiosRequestConfig) => {
				// Get network status from store
				const networkStore = global.network
				const isWapi = networkStore?.cmd.toLocaleUpperCase() === SignalType.wapi.toLocaleUpperCase() || isDev

				// Set the base URL based on the environment and network status
				config.baseURL = `http://${VITE_APP_FG_HOST}:${VITE_APP_FG_PORT}${options?.baseURL ?? '/api'}`

				if (isWapi) {
					config.baseURL = `http://${VITE_APP_WAPI_HOST}:${VITE_APP_WAPI_PORT}${options?.baseURL ?? '/api'}`
				}
				//todo: Set the Authorization header if a token is available in session storage
				return config
			},
			(error: AxiosError) => Promise.reject(error)
		)

		// Response interceptor to process the response
		this.response.use(
			(response: AxiosResponse) => response?.request?.res?.data ?? response, // Parse the response if necessary
			(error: AxiosError) => Promise.reject(error) // Reject on error
		)
	}

	// Send the HTTP request and return the response or error
	SendRequest(): Promise<any> {
		// Validate the method to ensure it's a valid HTTP method
		const reg = /^(get|post|put|delete|patch|options|head)$/i
		const method = this.method.toUpperCase()
		if (!reg.test(method)) throw new Error(`Method: ${method} is not a valid HTTP method`)

		// Set the parameter name depending on the HTTP method
		const param = method === 'GET' || method === 'DELETE' ? 'params' : 'data'
		this.resData = {
			url: this.url,
			method: this.method
		}

		if (this.data && !isEmptyObject(this.data)) {
			this.resData[param] = JSON.stringify(this.data)
		}

		// Return a Promise for the request
		return new Promise((resolve, reject) => {
			const STARTTIME = new Date().getTime() // Track request start time
			const promise = this.$http(this.resData)
			promise
				.then((response) => {
					const ENDTIME = new Date().getTime() // Track request end time
					logger.log(`> ${this.url} ----------- Request Time -----------> ${(ENDTIME - STARTTIME) / 1000} seconds`)
					resolve(response.data)
				})
				.catch((error) => {
					this.cancelSource = axios.CancelToken.source() // Reset cancel token after failure
					const ENDTIME = new Date().getTime() // Track request end time
					logger.log(`> ${this.url} ----------- Request Failed -----------> ${(ENDTIME - STARTTIME) / 1000} seconds`, error)
					if (this.loadText) {
						this.window?.webContents.send('mqtt:loading', { val: false, loadText: '' })
					}
					reject(error) // Reject the promise with error
				})
		})
	}
}

export default HttpClient
