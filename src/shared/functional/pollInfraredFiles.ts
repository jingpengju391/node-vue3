import { load } from 'cheerio'
import { readInfraredFileCofing, fetchDirectoryContents, queryDirectoryFiles } from '@server/request'
import { sleep, isImageFile, quickSort, formatDateTime } from '@util/index'
import { deleteFileIfExistsSync, downloadMultipleFiles, generateFullPathUsingRelativePath, getFileSize } from '@lib'
import { DetectMode } from '@shared/dataModelTypes/WorkOrder'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'
import handleGroupedFileUpload from './task'
import { singScheduler } from '@util/scheduler'
import { pingHost } from './network'
import { ipcMain } from 'electron'

const { MAIN_VITE_TEMP_FILE, MAIN_VITE_TEMP_FILE_URL, MAIN_VITE_TEMP_FILE_DIR } = import.meta.env

// Runtime cache for configuration values and scanning state
const cacheConfig = new Map<string, number | string>()

/**
 * Starts polling for new VI/IR images based on the specified detection mode.
 * - Scans configured directories.
 * - Downloads the latest images.
 * - Sends the file paths to the renderer process.
 *
 * @param mode Detection mode (e.g., 'manual' or 'auto')
 */
export default async function (mode: DetectMode) {
	// Lock polling loop using a runtime flag
	cacheConfig.set('lock', 1)
	logger.log('Start polling for infrared files')

	const window = global?.modelWindow.get(ModelWindowKey.mainWindow)
	const ensureNetworkConnected = createNetworkChecker(window, pingHost)

	// Holds the image files to be downloaded and processed
	const files: {
		url: string
		targetPath: string
		size: number
	}[] = []

	// eslint-disable-next-line no-constant-condition
	while (true) {
		// Exit if polling has been stopped externally
		if (!cacheConfig.get('lock')) return

		if (!(await ensureNetworkConnected())) {
			logger.warn(`[${mode}] Network down, retrying after short delay.`)
			await sleep(3000)
			continue
		}

		logger.log(`[${mode}] Starting new image fetch cycle.`)

		try {
			// Step 1: Ensure configuration is loaded and scan the directory
			await initializeInfraredImagePathAndScan()

			// Step 2: Fetch the latest two available image files
			const pointfiles = await getLatestTwoFilesFromDir(mode)
			files.push(...pointfiles)

			if (files.length === 0) {
				logger.log(`[${mode}] No new images found. Retrying after delay.`)
				await sleep()
				continue
			}

			// Step 3: Download the image files to the target paths
			logger.log(`[${mode}] Downloading images: ${files.map((f) => f.url).join(', ')}`)
			await downloadMultipleFiles(files)

			// Step 4: Sort files by size (used to differentiate VI and IR)
			const [vi, ir] = quickSort(files, 'size')

			// Step 5: Notify renderer with the downloaded file paths
			if (window) {
				logger.log(`[${mode}] Sending files to renderer: VI=${vi.targetPath}, IR=${ir.targetPath}`)
				window.webContents.send(`file:sensorEid`, cacheConfig.get('deviceNum'))
				window.webContents.send(`file:${mode}`, {
					vi: vi.targetPath,
					ir: ir.targetPath
				})
				ipcMain.once(`file:${mode}:done`, () => {
					files.length = 0 // Clear file list after successful transmission
					logger.log(`[${mode}] Sent VI=${vi.targetPath}, IR=${ir.targetPath} to renderer.`)
					singScheduler.add(async () => await handleGroupedFileUpload())
				})
			} else {
				logger.warn(`[${mode}] Main window not available.`)
			}
		} catch (error) {
			// Step 6: Handle errors and clean up partial files
			files[0] && deleteFileIfExistsSync(files[0].targetPath)
			logger.error(error)
		}

		// Step 7: Wait for a short period before the next cycle
		await sleep()
	}
}

/**
 * Stops the image polling loop by clearing the runtime lock.
 */
export function stopPollInfraredFiles() {
	if (!cacheConfig.get('lock')) return
	logger.log('Stop polling for infrared files')
	cacheConfig.delete('lock')
}

/**
 * Initializes the scan by reading config and scanning directory structure once.
 */
export async function initializeInfraredImagePathAndScan(): Promise<void> {
	// Skip if already initialized
	if (cacheConfig.has('currentFilePathUrl') && cacheConfig.has('deviceNum') && cacheConfig.has('rootDir')) {
		logger.log('Configuration already present. Skipping initialization.')
		return
	}

	// Read config file from remote
	logger.log('Reading infrared config file...')
	const { data } = await readInfraredFileCofing()
	const config = parseTextToObject(data)

	const deviceNum = config['仪器序列号']
	const rootDir = config['图片根目录']

	// Validate and cache values
	if (!isNotEmptyStr(rootDir)) {
		logger.warn('Root directory is missing or invalid in config.')
		return
	}

	cacheConfig.set('deviceNum', deviceNum)
	cacheConfig.set('rootDir', rootDir)
	logger.log(`Parsed config - DeviceNum: ${deviceNum}, RootDir: ${rootDir}`)

	// Initial scan to populate current file path
	await scanInfraredImageUpdates()
}

/**
 * Retrieves the last two image files in the current monitored directory.
 */
async function getLatestTwoFilesFromDir(mode: DetectMode): Promise<
	{
		url: string
		targetPath: string
		size: number
	}[]
> {
	const currentFilePathUrl = cacheConfig.get('currentFilePathUrl') as string
	logger.log(`[${mode}] Fetching directory listing from: ${currentFilePathUrl}`)

	const response = await queryDirectoryFiles(currentFilePathUrl)
	const $ = load(response.data)

	// Parse file links from HTML
	const imageLinks = $('pre a')
		.toArray()
		.map((el) => {
			const name = $(el).text().trim()
			const href = $(el).attr('href')?.trim() || ''
			return { name, href }
		})
		.filter(({ name }) => name !== '.' && name !== '..')

	// Check if there are enough images
	if (imageLinks.length < 2) {
		logger.warn(`[${mode}] Less than 2 image files in directory.`)
		return []
	}

	// Select the last two files
	const last = imageLinks[imageLinks.length - 1]
	const secondLast = imageLinks[imageLinks.length - 2]

	const cachedHref = cacheConfig.get('last_href')
	if (cachedHref === last.href || cachedHref === secondLast.href) {
		logger.log(`[${mode}] Duplicate images detected. Skipping.`)
		return []
	}

	// Cache new href for next run
	cacheConfig.set('last_href', last.href)

	// Fetch sizes for sorting
	const lastSize = await getFileSize(last.href)
	const secondLastSize = await getFileSize(secondLast.href)

	logger.log(`[${mode}] Fetched sizes - ${secondLast.name}: ${secondLastSize}, ${last.name}: ${lastSize}`)

	// Return both files with target save paths
	return [
		{
			url: last.href,
			...buildImageInfo(last.name, mode),
			size: lastSize
		},
		{
			url: secondLast.href,
			...buildImageInfo(secondLast.name, mode),
			size: secondLastSize
		}
	]
}

/**
 * Recursively scans the directory tree and detects the folder
 * where new infrared images are uploaded.
 */
export async function scanInfraredImageUpdates(): Promise<void> {
	const rootUrl = `${MAIN_VITE_TEMP_FILE_URL}${MAIN_VITE_TEMP_FILE_DIR}${cacheConfig.get('rootDir')}`
	const queue: string[] = [rootUrl]

	logger.log(`Starting directory scan from root: ${rootUrl}`)

	while (queue.length > 0) {
		const currentUrl = queue.shift()
		if (!currentUrl) continue

		const { data } = await fetchDirectoryContents(currentUrl)
		const contents = parseDirHtml(data)

		let imageCount = 0

		for (const item of contents) {
			if (isImageFile(item)) {
				imageCount++
			} else {
				const subUrl = `${currentUrl}${MAIN_VITE_TEMP_FILE_DIR}${item}`
				queue.push(subUrl)
				logger.log(`Found subdirectory: ${subUrl}`)
			}
		}

		const previousCount = cacheConfig.get(currentUrl) as number

		if (previousCount === undefined) {
			// First-time visit to this directory
			cacheConfig.set(currentUrl, imageCount)
			logger.log(`Scanned ${currentUrl}: ${imageCount} image(s) found.`)
		} else if (imageCount > previousCount) {
			// New images have arrived in this directory
			cacheConfig.set('currentFilePathUrl', currentUrl)
			logger.log(`New images detected in ${currentUrl}. Updating currentFilePathUrl.`)
			break
		} else {
			logger.log(`No new images found in ${currentUrl}. Count remains ${imageCount}.`)
		}
	}
}

/**
 * Converts a text block with key:value pairs into an object.
 */
function parseTextToObject(text: string): Record<string, string> {
	return Object.fromEntries(
		text
			.split('\n')
			.map((line) => line.trim().split(':'))
			.filter(([key, ...rest]) => key && rest.length > 0)
			.map(([key, ...rest]) => [key, rest.join(':').trim()])
	)
}

/**
 * Checks if the provided value is a valid non-empty string.
 */
function isNotEmptyStr(s: any): boolean {
	return typeof s === 'string' && s.length > 0
}

/**
 * Parses HTML directory listing and returns file or folder names.
 */
function parseDirHtml(html: string): string[] {
	const $ = load(html)
	const result: string[] = []

	$('pre a').each((_, el) => {
		const name = $(el).text().trim()
		if (name !== '.' && name !== '..') {
			result.push(name)
		}
	})

	return result
}

/**
 * Builds image information including the target file path
 * based on the image name and detection mode.
 *
 * @param name - The name of the image file.
 * @param mode - The detection mode (e.g., IR or VI).
 * @returns An object containing the target file path where the image should be saved.
 */
function buildImageInfo(name: string, mode: DetectMode): { targetPath: string } {
	return {
		targetPath: `${generateFullPathUsingRelativePath(`./${MAIN_VITE_TEMP_FILE}`)}/${formatDateTime('YYYY-MM-DD')}/${mode}/${name}`
	}
}

/**
 * Creates a network checker function that periodically pings a host to determine network connectivity.
 * The interval between checks adjusts based on whether the host was reachable in the previous check.
 *
 * @param window The Electron BrowserWindow object used to send status messages to the renderer.
 * @param pingHost A function that pings a given host and returns a Promise resolving to `true` if reachable.
 * @param host The IP address or hostname to ping (default is '192.168.4.1').
 * @returns An asynchronous function that returns the current online status when called.
 */
function createNetworkChecker(window, pingHost: (host: string) => Promise<boolean>, host = '192.168.4.1') {
	let isOnline = true // Tracks the current network status
	let lastCheckTime = 0 // Timestamp of the last network check

	/**
	 * Checks if the network is currently connected.
	 * Adjusts checking interval based on previous connectivity status.
	 * Sends a message to the renderer process if the connection status changes.
	 *
	 * @returns A Promise that resolves to `true` if the network is online, otherwise `false`.
	 */
	return async function ensureNetworkConnected(): Promise<boolean> {
		const now = Date.now()
		const interval = isOnline ? 15000 : 3000 // 15s if online, 3s if offline

		logger.log(`Network check interval: ${interval}ms`)

		if (now - lastCheckTime > interval) {
			lastCheckTime = now
			isOnline = await pingHost(host)

			if (isOnline) {
				// Notify renderer process of reconnection
				window.webContents.send('socket:connected', host)
			} else {
				// Notify renderer process of disconnection
				window.webContents.send('socket:disconnect', host)
			}
		}

		return isOnline
	}
}
