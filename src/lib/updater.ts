import * as fs from 'fs'
import * as path from 'path'
import { NetWorkType, SignalType } from '@shared/dataModelTypes/socket'
import { getNetworkInterfaceType, growExecuteBashScript, isProcessRunWithFg, isProcessRunWithWapi } from '@shared/functional/network'
import { compareVersion, retryWithExponentialBackoff, sleep } from '@util/index'
import { isDev, isLinux } from '@util/process'
import axios from 'axios'
import { load } from 'cheerio'
import { App, BrowserWindow } from 'electron'
import { downloadFile, downloadMultipleFiles, FileInfo, generateFullPathUsingRelativePath } from './file'
import { execSync } from 'child_process'

let CancelToken = axios.CancelToken
let sourceCancel = CancelToken.source()

const {
	MAIN_VITE_APP_UPGRADE_WAPI_PORT,
	MAIN_VITE_APP_UPGRADE_WAPI_HOST,
	MAIN_VITE_APP_UPGRADE_FG_PORT,
	MAIN_VITE_APP_UPGRADE_FG_HOST,
	MAIN_VITE_SOFT_DIR,
	MAIN_VITE_HARDWARE_UPDATER_PATH,
	MAIN_VITE_APP_UPDATER_PATH,
	MAIN_VITE_APP_START_FG_PATH,
	MAIN_VITE_APP_STOP_FG_PATH,
	MAIN_VITE_APP_START_WAPI_PATH,
	MAIN_VITE_APP_STOP_WAPI_PATH
} = import.meta.env

type ConfigData = {
	name: string
	version: string
	configFile: string
}

type HardwareConfig = {
	hardwareName: string
	fileUrl: string
	fileName: string
	fileSize: number
	targetPath: string
	reboot: string
	install_url: string
	start_url: string
	stop_url: string
	detectMethodCn: string
	detectMethod: number
}

const upgradeMessage = {
	describe: '',
	version: ''
}

export async function handlerUpgrade(app: App, window: BrowserWindow | undefined) {
	const netWorkType = await getNetworkInterfaceType()
	if (!netWorkType && !isDev) {
		return
	}

	CancelToken = axios.CancelToken
	sourceCancel = CancelToken.source()

	const host = netWorkType === NetWorkType.tun0 ? `${MAIN_VITE_APP_UPGRADE_FG_HOST}:${MAIN_VITE_APP_UPGRADE_FG_PORT}` : `${MAIN_VITE_APP_UPGRADE_WAPI_HOST}:${MAIN_VITE_APP_UPGRADE_WAPI_PORT}`

	logger.verbose('start updater')
	const { list, parses } = await getFilesToUpdate(host, app)
	logger.verbose('check need to upgrade app:', !!list.length)

	if (!list.length) return

	window?.webContents.send('upgrade:soft', {
		describe: list[0]?.destination,
		total: 0,
		loaded: 0,
		version: list[0]?.version
	})

	await downloadMultipleFiles(list, sourceCancel, (total: number, loaded: number, file) => {
		upgradeMessage.describe = file.destination || upgradeMessage.describe
		window?.webContents.send('upgrade:soft', {
			describe: file.destination || upgradeMessage.describe,
			total,
			loaded,
			version: file.version
		})
	})

	await restartApplicationIfNeeded(list, parses, app, netWorkType!)
	window?.webContents.send('upgrade:soft', undefined)
}

async function getFilesToUpdate(host: string, app: App): Promise<{ list: FileInfo[]; parses: HardwareConfig[] }> {
	const list: FileInfo[] = []
	const parses: HardwareConfig[] = []
	const hardwareConfigName = 'hardware.config'
	const resolvePath = path.join(`./hardware`, hardwareConfigName)
	const destination = generateFullPathUsingRelativePath(resolvePath)
	const versionDestination = generateFullPathUsingRelativePath('./hardware/version.config')
	let hardwareLocalConfig = ''
	if (fs.existsSync(destination)) {
		hardwareLocalConfig = fs.readFileSync(destination, 'utf-8')
	}
	const url = `http://${host}${MAIN_VITE_HARDWARE_UPDATER_PATH}${hardwareConfigName}`
	const hardwareConfig = (await downloadLastVersionFileConfig(url, destination)) || ''
	const parseLoaclData = parseData(hardwareLocalConfig)
	const parseLineData = parseData(hardwareConfig)

	const appUrl = `http://${host}${MAIN_VITE_APP_UPDATER_PATH}`
	const source = await fetchLatestVersion(appUrl, app)
	if (source) {
		let describe = ''
		try {
			const sourceFile = `${app.getName()}.conf`
			const resolvePath = path.join(`../${MAIN_VITE_SOFT_DIR}`, sourceFile)
			const destination = generateFullPathUsingRelativePath(resolvePath)
			await downloadFile(`${appUrl}${sourceFile}`, destination, sourceCancel)
			const size = (await getFileSizeWithRange(`${appUrl}${source.name}`)) || 0
			describe = fs.readFileSync(destination, 'utf-8')
			upgradeMessage.describe = describe
			list.push({
				isApp: true,
				url: `${appUrl}${source.name}`,
				destination: describe,
				size: size * 10 * 2,
				targetPath: `${generateFullPathUsingRelativePath(`../${MAIN_VITE_SOFT_DIR}`)}/${source.name}`,
				version: source.version
			})
		} catch (error) {
			logger.error(`not find version des!`)
		}
	}

	for (const iterator of parseLineData) {
		if (!iterator.name) continue
		const loaclData = parseLoaclData.find((item) => item.name === iterator.name && iterator.name)
		if (!loaclData || loaclData.version < iterator.version) {
			const versionConfig = (await downloadLastVersionFileConfig(`http://${host}${iterator.configFile}`, versionDestination)) || ''
			const { config, paths } = parseHardwareConfig(versionConfig)
			parses.push(config)
			for (const p of paths) {
				const dirName = path.basename(path.dirname(p + 'dummy'))
				const basePath = isDev ? `${generateFullPathUsingRelativePath(`../${dirName}`)}` : config.targetPath
				list.push({
					url: `http://${host}${p}`,
					destination: '',
					size: config.fileSize,
					targetPath: path.join(basePath, path.basename(p)),
					version: iterator.version
				})
			}
		}
	}

	return {
		list: list,
		parses: parses
	}
}

async function downloadLastVersionFileConfig(url: string, destination: string): Promise<string | undefined> {
	await downloadFile(`${url}`, destination)
	await sleep(24)
	return fs.readFileSync(destination, 'utf-8')
}

function parseData(input: string): ConfigData[] {
	const lines = input.split('\n')
	const result: ConfigData[] = []

	lines.forEach((line) => {
		const items = line.split('|')
		const data: { [key: string]: string } = {}

		items.forEach((item) => {
			const [key, value] = item.split(':')
			if (key && value) {
				data[key.trim()] = value.trim()
			}
		})
		result.push({
			name: data.name || '',
			version: data.version || '',
			configFile: data.configFile || ''
		})
	})

	return result
}

function parseHardwareConfig(input: string): { config: HardwareConfig; paths: string[] } {
	const lines = input.split('\n')
	const config: { [key: string]: string | number } = {}

	lines.forEach((line) => {
		if (line.trim() === '') return

		const [key, value] = line.split(':').map((part) => part.trim())

		if (key && value) {
			if (key === 'fileSize') {
				config[key] = parseInt(value, 10)
			} else if (key === 'detectMethod') {
				config[key] = parseInt(value, 10)
			} else {
				config[key] = value
			}
		}
	})

	const paths = Object.entries(config)
		.filter(([key, value]) => {
			return typeof value === 'string' && key !== 'targetPath' && value.startsWith('/') && key !== 'fileUrl'
		})
		.map(([_key, value]) => value as string)

	return { config: config as HardwareConfig, paths }
}

async function fetchLatestVersion(url: string, app: App): Promise<{ name: string; version: string } | undefined> {
	const response = await axios.get(url)
	const $ = load(response.data)
	const resultLinks = $('a')

	const name = app.getName()
	const currnetVersion = app.getVersion()

	const versionRegex = new RegExp(`${name}-(\\d+\\.\\d+\\.\\d+)-`)
	const regex = new RegExp(`^${name}`)

	let latestFileName = ''
	let latestVersion = latestFileName.match(versionRegex)?.[1] || currnetVersion

	resultLinks.each((_index, element) => {
		const fileName = $(element).text().trim()
		if (!regex.test(fileName)) return

		const versionMatch = fileName.match(versionRegex)
		if (!versionMatch) return

		const version = versionMatch[1]
		if (compareVersion(version, latestVersion) === 1) {
			latestVersion = version
			latestFileName = fileName
		}
	})

	return latestFileName
		? {
				name: latestFileName,
				version: latestVersion
			}
		: undefined
}

async function getFileSizeWithRange(url: string): Promise<number | undefined> {
	const response = await axios.get(url, {
		headers: {
			Range: 'bytes=0-0'
		}
	})

	const contentRange = response.headers['content-range']

	if (contentRange) {
		const sizeMatch = contentRange.match(/\/(\d+)/)
		if (sizeMatch) {
			return parseInt(sizeMatch[1], 10)
		}
	}
	return 0
}

async function deletelocalVersionFile(list: FileInfo[], app: App) {
	const findIndex = list.findIndex((file) => file.isApp)
	if (findIndex === -1) return
	logger.verbose('start delete old soft')
	const arch = isDev ? 'arm64' : process.arch
	const ns = [app.getName(), app.getVersion(), arch]
	const oldSourceFiles = [`${app.getName()}.conf`, `${ns.join('-')}.AppImage`]

	for (const iterator of oldSourceFiles) {
		const resolvePath = path.join(`../${MAIN_VITE_SOFT_DIR}`, iterator)
		const destination = generateFullPathUsingRelativePath(resolvePath)
		fs.unlink(destination, (_err) => {})
	}
	logger.verbose('delete old soft over')
}

async function restartApplicationIfNeeded(files: FileInfo[], parses: HardwareConfig[], app: App, netWorkType: NetWorkType) {
	if (!files.length) {
		return
	}

	const typeMap = {
		tun0: '5G',
		usb0: 'WAPI'
	}

	const findResult = parses.find((parse) => parse.hardwareName === typeMap[netWorkType])
	const findIndex = files.findIndex((file) => file.isApp)

	if (files.filter((file) => !file.isApp).length) {
		for (const iterator of parses) {
			const installSplit = iterator.install_url.split('/')
			execScript(iterator.targetPath, installSplit.at(-1))
		}
		let command = ''
		if (findIndex !== -1) {
			const arch = isDev ? 'arm64' : process.arch
			const ns = [app.getName(), app.getVersion(), arch]
			const oldSourceFiles = [`${app.getName()}.conf`, `${ns.join('-')}.AppImage`]

			const destinations: string[] = []
			for (const iterator of oldSourceFiles) {
				const resolvePath = path.join(`../${MAIN_VITE_SOFT_DIR}`, iterator)
				const destination = generateFullPathUsingRelativePath(resolvePath)
				destinations.push(destination)
			}

			// await deletelocalVersionFile(files, app)
			command = `rm -f ${destinations.join(' ')} && sudo reboot`
			authorizeAndRestartForLinux(files[findIndex].targetPath, false)
		}

		command = command || 'sudo reboot'
		execSync(command, { stdio: 'inherit' })
	}

	logger.verbose('need: restart network', findResult)

	if (findResult && !isDev) {
		logger.verbose('restart network')
		await stopExecuteBashScript(netWorkType)
		await startExecuteBashScript(netWorkType)
		logger.verbose('restart network over')
	}

	logger.verbose(`check need to restart app:`, findIndex !== -1)
	if (findIndex !== -1) {
		app.quit()
		await deletelocalVersionFile(files, app)
		authorizeAndRestartForLinux(files[findIndex].targetPath)
		return
	}
}

async function stopExecuteBashScript(netWorkType: NetWorkType, retries: number = 3) {
	const type = netWorkType === NetWorkType.tun0 ? SignalType.mobile : SignalType.wapi
	const stopExec = netWorkType === NetWorkType.tun0 ? MAIN_VITE_APP_STOP_FG_PATH : MAIN_VITE_APP_STOP_WAPI_PATH

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

	if (await stopActivatedProcess(type)) {
		if (retries <= 0) {
			logger.error(`check was the stop script executed fail!`)
			return
		} else {
			logger.warn('start retry ablout stop bash after 1s')
			await sleep(1000)
			await stopExecuteBashScript(netWorkType, retries--)
		}
	} else {
		logger.verbose(`check was the stop script executed successfully over`)
		return
	}
}

async function startExecuteBashScript(netWorkType: NetWorkType, retries: number = 3) {
	const type = netWorkType === NetWorkType.tun0 ? SignalType.mobile : SignalType.wapi
	const startExec = netWorkType === NetWorkType.tun0 ? MAIN_VITE_APP_START_FG_PATH : MAIN_VITE_APP_START_WAPI_PATH
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

	if (await startActivatingProcess(type)) {
		if (retries <= 0) {
			logger.error(`check was the start script executed fail!`)
			return
		} else {
			logger.warn('start retry ablout start bash after 1s')
			await sleep(1000)
			await startExecuteBashScript(netWorkType, retries--)
		}
	} else {
		logger.verbose(`check was the start script executed successfully over`)
		return
	}
}

function authorizeAndRestartForLinux(path: string, restart: boolean = true) {
	if (!isLinux) return
	const authorizeCommand = `chmod -R 777 ${path}`
	execSync(authorizeCommand, { stdio: 'inherit' })
	logger.verbose(`authorization completed, to restart`)
	restart && execSync(path, { stdio: 'inherit' })
}

function execScript(targetPath, shellName) {
	if (isDev) return
	const cmd = `chmod +x ${targetPath}${shellName}`
	const command = `sudo sh ${targetPath}${shellName}`
	execSync(cmd, { stdio: 'inherit' })
	execSync(command, { stdio: 'inherit' })
}

export function cancelUpdater() {
	sourceCancel.cancel('已取消请求')
}

async function stopActivatedProcess(type: SignalType): Promise<boolean> {
	return type === SignalType.wapi ? await isProcessRunWithFg() : await isProcessRunWithWapi()
}

async function startActivatingProcess(type: SignalType): Promise<boolean> {
	return !(type === SignalType.wapi ? await isProcessRunWithWapi() : await isProcessRunWithFg())
}
