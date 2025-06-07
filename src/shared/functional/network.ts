import os, { networkInterfaces } from 'os'
import * as fs from 'fs'
import { exec } from 'child_process'
import { NetWorkScript, NetWorkType, SignalType } from '@shared/dataModelTypes/socket'
import { isDev, isLinux } from '@util/process'
import { retryWithExponentialBackoff } from '@util/index'

export function getDefultNetwork(): 'wapi' | '5g' | undefined {
	if (!isLinux) return '5g'
	const directoryPath = '/etc/xdg/autostart/'
	try {
		const files = fs.readdirSync(directoryPath)
		return files.includes('wapi_startup.desktop') ? 'wapi' : '5g'
	} catch (error) {
		return '5g'
	}
}

export async function handlerDefultNetwork(defultNetwork: 'wapi' | '5g') {
	if (!isLinux) return
	const command = `sudo sh /home/firefly/switch_net/net_mode.sh ${defultNetwork}`
	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(`[获取pot试验设备连接网络]-[执行错误]: ${error.message}`)
			}
			if (stderr) {
				reject(`[获取pot试验设备连接网络]-[执行命令产生错误]: ${stderr}`)
			}
			resolve(stdout.split(':')[1])
		})
	})
}

export async function getNetworkInterfaceType(): Promise<NetWorkType | undefined> {
	const interfaces = networkInterfaces()
	const internames = Object.keys(interfaces)

	if (internames.includes(NetWorkType.usb0) || (await isProcessRunWithWapi())) {
		return NetWorkType.usb0
	}

	if (internames.includes(NetWorkType.tun0) || (await isProcessRunWithFg())) {
		return NetWorkType.tun0
	}

	return undefined
}

export async function switchNetwork(type: SignalType): Promise<string | undefined> {
	if (!isLinux) return
	logger.verbose(`start switch net to ${type}`)
	const { stopExec, startExec } = getStartAndStopExec(type)
	const isNeedStop = await stopActivatedProcess(type)
	logger.verbose(`do you need to execute the stop script: ${isNeedStop}`)
	if (isNeedStop) {
		try {
			await growExecuteBashScript(stopExec)
			logger.verbose(`execute the stop script over`)
			await retryWithExponentialBackoff(
				async () => {
					if (await stopActivatedProcess(type)) {
						throw new Error('retry stop exec')
					}
				},
				3,
				1024
			)
			logger.verbose(`check was the stop script executed successfully over`)
		} catch (error) {
			logger.error(error)
			const stoptype = type === SignalType.wapi ? SignalType.mobile : SignalType.wapi
			const [name] = stoptype.split(' ')
			return `关闭${name.toLocaleUpperCase()}失败`
		}
	}

	const isNeedStart = await startActivatingProcess(type)
	logger.verbose(`do you need to execute the start script: ${isNeedStart}`)
	if (isNeedStart) {
		try {
			await growExecuteBashScript(startExec)
			logger.verbose(`execute the start script over`)
			await retryWithExponentialBackoff(
				async () => {
					if (await startActivatingProcess(type)) {
						throw new Error('retry start exec')
					}
				},
				6,
				1024
			)
			logger.verbose(`check was the start script executed successfully over`)
		} catch (error) {
			logger.error(error)
			const [name] = type.split(' ')
			return `启动${name.toLocaleUpperCase()}超时`
		}
	}
	logger.verbose(`switch network over`)
	return undefined
}

export async function isProcessRunWithFg(): Promise<boolean> {
	try {
		if (isDev) return false

		const result5G = await new Promise<string>((resolve, reject) => {
			exec(`ps -ef | grep ${NetWorkScript.cmdialup}`, (error, stdout, _stderr) => {
				if (error) {
					return reject(error)
				}
				resolve(stdout.trim())
			})
		})

		const lines = result5G.split('\n')
		const ls = lines.filter((line) => line.includes(NetWorkScript.cmdialup) && !line.includes('grep'))

		return ls.length >= 2
	} catch (error) {
		logger.error(error)
		return false
	}
}

export async function isProcessRunWithWapi(): Promise<boolean> {
	try {
		if (isDev) return false

		const resultWapi = await new Promise<string>((resolve, reject) => {
			exec(`ps -ef | grep ${NetWorkScript.wapiweb}`, (error, stdout, _stderr) => {
				if (error) {
					return reject(error)
				}
				resolve(stdout.trim())
			})
		})

		const lines = resultWapi.split('\n')
		const ls = lines.filter((line) => line.includes(NetWorkScript.wapiweb) && !line.includes('grep'))

		return ls.length >= 2
	} catch (error) {
		logger.error(error)
		return false
	}
}

function getStartAndStopExec(type: SignalType) {
	const { MAIN_VITE_APP_START_FG_PATH, MAIN_VITE_APP_STOP_FG_PATH, MAIN_VITE_APP_START_WAPI_PATH, MAIN_VITE_APP_STOP_WAPI_PATH } = import.meta.env
	let stopExec = MAIN_VITE_APP_STOP_FG_PATH
	let startExec = MAIN_VITE_APP_START_WAPI_PATH
	if (type === SignalType.mobile) {
		stopExec = MAIN_VITE_APP_STOP_WAPI_PATH
		startExec = MAIN_VITE_APP_START_FG_PATH
	}
	return { stopExec, startExec }
}

async function stopActivatedProcess(type: SignalType): Promise<boolean> {
	return type === SignalType.wapi ? await isProcessRunWithFg() : await isProcessRunWithWapi()
}

async function startActivatingProcess(type: SignalType): Promise<boolean> {
	return !(type === SignalType.wapi ? await isProcessRunWithWapi() : await isProcessRunWithFg())
}

export function growExecuteBashScript(scriptPath: string) {
	return new Promise((resolve, reject) => {
		exec(`bash ${scriptPath}`, (_error, _stdout, _stderr) => {}).on('exit', (code) => {
			if (code === 0) {
				resolve(true)
			} else {
				reject(false)
			}
		})
	})
}

/**
 * Ping to check whether a target host is reachable.
 * @param host The target host to ping, e.g., '8.8.8.8'.
 * @returns A Promise that resolves to `true` if the host is reachable, otherwise `false`.
 */
export function pingHost(host: string): Promise<boolean> {
	return new Promise((resolve) => {
		const platform = os.platform()
		let cmd = ''

		if (platform === 'win32') {
			// Windows: Use -n for ping count and -w for timeout (milliseconds)
			cmd = `ping -n 1 -w 1000 ${host}`
		} else if (platform === 'darwin' || platform === 'linux') {
			// macOS/Linux: Use -c for ping count and -W for timeout (seconds or milliseconds depending on platform)
			cmd = `ping -c 1 -W 1 ${host}`
		} else {
			// Unsupported platform
			logger.warn(`Unsupported platform: ${platform}`)
			return resolve(false)
		}

		// Execute the ping command
		exec(cmd, (error, stdout, _stderr) => {
			if (error) {
				// Ping failed
				resolve(false)
			} else {
				// Check if the output contains TTL (Time To Live), which indicates a successful response
				resolve(stdout.includes('TTL') || stdout.includes('ttl'))
			}
		})
	})
}
