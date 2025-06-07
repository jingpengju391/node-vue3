import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import axios, { AxiosResponse, CancelTokenSource } from 'axios'
import { sleep } from '@util/index'
import { spawn } from 'child_process'

let totalSize = 0

export type FileInfo = {
	isApp?: boolean
	url: string
	destination?: string
	size?: number
	targetPath: string
	version?: string
}

export function createDirectoryIfNotExistsSync(filePath: string): void {
	try {
		const dirPath: string = path.dirname(filePath)
		fs.mkdirSync(dirPath, { recursive: true })
	} catch (error) {
		logger.error(`create directory if not exists sync ${error}`)
	}
}

export function generateFullPathUsingRelativePath(filePath: string): string {
	try {
		const resolvedPath = import.meta.env[`MAIN_VITE_APP_TYAPP_PATH_${process.platform.toLocaleUpperCase()}`]
		const expandedPath = resolvedPath.replace(/^~/, os.homedir())
		const fullPath = path.resolve(expandedPath, filePath)
		createDirectoryIfNotExistsSync(fullPath)
		return fullPath
	} catch (error) {
		logger.error(`generate full path using relative path ${error}`)
		return ''
	}
}

export async function downloadFile(
	url: string,
	destination: string,
	source?: CancelTokenSource,
	progressCallback?: (total: number, loaded: number, url: string) => void,
	retries = 3,
	delay = 1000,
	timeout = 10000
): Promise<void> {
	const localSource = source ?? axios.CancelToken.source()

	try {
		const response = await axios({
			method: 'get',
			url,
			responseType: 'stream',
			cancelToken: localSource.token,
			timeout,
			onDownloadProgress: (progressEvent) => {
				const { total, loaded } = progressEvent
				if (total && progressCallback) {
					progressCallback(total, loaded, url)
				}
			}
		})

		createDirectoryIfNotExistsSync(destination)

		const downloadPromise = new Promise<void>((resolve, reject) => {
			const writer = fs.createWriteStream(destination)

			response.data.pipe(writer)

			writer.on('finish', () => resolve())
			writer.on('error', (err) => {
				logger.error('Error writing file:', err)
				reject(err)
			})

			localSource.token.promise.then(() => {
				writer.destroy()
				if (fs.existsSync(destination)) {
					fs.unlinkSync(destination)
				}
				reject(new Error('Download canceled.'))
			})
		})

		await Promise.race([downloadPromise, timeoutStringPromise(timeout, 'Request timed out.')])
	} catch (error) {
		logger.warn(`Download error, retry left ${retries}: ${error}`)

		localSource.cancel('Retry canceled previous attempt.')

		if (fs.existsSync(destination)) {
			fs.unlinkSync(destination)
		}

		if (retries <= 0) {
			throw new Error(`Max retries reached. Last error: ${error}`)
		}

		await sleep(delay)
		return await downloadFile(url, destination, undefined, progressCallback, retries - 1, delay, timeout + 10000)
	}
}

export async function downloadMultipleFiles<T extends FileInfo>(files: T[], source?: CancelTokenSource, progressCallback?: (total: number, loaded: number, file: T) => void) {
	const loadedUrls: { [propName: string]: number } = {}
	const totalSize = await getFilesSize(files.map((file) => file.url))

	const tempFiles = files.map((file) => ({
		...file,
		tempPath: file.targetPath + '.tmp'
	}))

	try {
		const downloadPromises = tempFiles.map((file) =>
			downloadFile(file.url, file.tempPath, source, (_total, loaded, url) => {
				loadedUrls[url] = loaded
				const loadeds = Object.values(loadedUrls).reduce((acc, curr) => acc + curr, 0)
				progressCallback?.(totalSize, loadeds, file)
			})
		)

		await Promise.all(downloadPromises)

		for (const file of tempFiles) {
			if (fs.existsSync(file.targetPath)) fs.unlinkSync(file.targetPath)
			fs.renameSync(file.tempPath, file.targetPath)
		}
	} catch (error) {
		for (const file of tempFiles) {
			if (fs.existsSync(file.tempPath)) {
				fs.unlinkSync(file.tempPath)
			}
		}
		throw new Error(`Download failed: ${error}`)
	}
}

export async function getFilesSize(urls: string[]): Promise<number> {
	totalSize = 0
	await Promise.all(urls.map((url) => calcFileSize(url)))
	return totalSize
}

async function calcFileSize(url: string): Promise<void> {
	try {
		const response: AxiosResponse = await axios.head(url)
		const fileSize: number = parseInt(response.headers['content-length'] as string, 10)
		if (fileSize) {
			totalSize += fileSize
		} else {
			logger.log(`No content-length found for ${url}`)
		}
	} catch (error) {
		logger.error(`Error getting size for file ${url}:`, error)
	}
}

export async function getFileSize(url: string): Promise<number> {
	try {
		const response: AxiosResponse = await axios.head(url)
		const fileSize: number = parseInt(response.headers['content-length'] as string, 10)
		if (fileSize) {
			return fileSize
		} else {
			logger.log(`No content-length found for ${url}`)
			return 0
		}
	} catch (error) {
		logger.error(`Error getting size for file ${url}:`, error)
		return 0
	}
}

function timeoutStringPromise(ms: number, reason: string): Promise<string> {
	return new Promise((_, reject) => {
		setTimeout(() => reject(new Error(reason)), ms)
	})
}

export function deleteFileIfExistsSync(filePath: string) {
	if (!fs.existsSync(filePath)) return
	try {
		fs.unlinkSync(filePath)
	} catch (error) {
		logger.log('deleteFileIfExistsSync:', error)
	}
}

export const readFileAsBase64WithSudo: (fullPath: string) => Promise<string> = (function () {
	if (process.env.NODE_ENV === 'development') {
		return (fullPath: string): Promise<string> => {
			return new Promise((resolve, reject) => {
				try {
					const data = fs.readFileSync(fullPath)
					resolve(Buffer.from(data).toString('base64'))
				} catch (error) {
					reject(error)
				}
			})
		}
	} else {
		return (fullPath: string): Promise<string> => {
			return new Promise((resolve, reject) => {
				try {
					const sanitizedPath = path.resolve(fullPath)
					const readStream = fs.createReadStream(sanitizedPath)
					const catProcess = spawn('sudo', ['cat', '-'], {
						stdio: ['pipe', 'pipe', process.stderr]
					})

					readStream.pipe(catProcess.stdin)

					let fileBuffer = Buffer.alloc(0)

					catProcess.stdout.on('data', (data: Buffer) => {
						fileBuffer = Buffer.concat([fileBuffer, data])
					})

					catProcess.on('close', () => {
						const base64Data = fileBuffer.toString('base64')
						resolve(base64Data)
					})

					catProcess.on('error', (error) => {
						reject(error)
					})
				} catch (error) {
					reject(error)
				}
			})
		}
	}
})()

export function copyFileSync(sourcePath: string, destinationPath: string): void {
	try {
		fs.copyFileSync(sourcePath, destinationPath)
	} catch (error) {
		logger.error('copy file error:', error)
	}
}

/**
 * Reads a binary file and returns its contents as a space-separated hexadecimal string.
 * @param dataUrl - The file path to read.
 * @returns A space-separated hexadecimal string, or null if reading fails.
 */
export function readBinaryAsHexString(dataUrl: string): string | null {
	try {
		const buffer: Buffer = fs.readFileSync(dataUrl)

		// Convert each byte to a two-character hex string and join with spaces
		return Array.from(buffer)
			.map((b: number) => b.toString(16).padStart(2, '0'))
			.join(' ')
	} catch (error) {
		logger.error(error)
		return null
	}
}
