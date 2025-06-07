import { BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { insertFilesOfPoint } from '../../server'
import { assignWorkOrderFile } from '@server/request'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'
import { PartialFileKey, PointFile, SensorUploadRequest, UploadFileDataItem } from '@shared/dataModelTypes/WorkOrder'
import { readBinaryAsHexString, readFileAsBase64WithSudo } from '@lib'
import MqttClient from '@service/mqtt'
import { formatDateTime } from '@util/index'
import { getMqttHostDeviceCode, groupByWithKeyExtractor } from '.'

/**
 * Main entry function to upload grouped files.
 */
export default async function handleGroupedFileUpload() {
	logger.info('Starting file upload process...')
	const { platform_port, platform_host, deviceCode: mtCode } = getMqttHostDeviceCode()
	if (!mtCode) {
		logger.error('Missing device code, aborting upload')
		return
	}

	const window = global?.modelWindow.get(ModelWindowKey.mainWindow)
	if (!window) {
		logger.error('Main window not found')
		return
	}

	const files = await requestRendererUploadFiles(window)
	if (!files.length) return
	logger.info(`Received ${files.length} files from renderer`, files)

	const groups = groupByWithKeyExtractor(files, (file) => file.fileGroup)
	logger.info(`Grouped into ${Object.keys(groups).length} file group(s)`, groups)

	for (const [_groupKey, groupFiles] of Object.entries(groups)) {
		await processFileGroup(groupFiles, mtCode, platform_host, platform_port, window)
	}
}

/**
 * Processes a group of related files and uploads them accordingly.
 */
async function processFileGroup(groupFiles: PointFile[], mtCode: string, platform_host: string, platform_port: number, window: BrowserWindow) {
	return new Promise((resolve) => {
		;(async () => {
			const idMap = new Map<number, number>()
			const data: UploadFileDataItem[] = []
			const fileObject: PartialFileKey = {}

			const meta = extractCommonMetadata(groupFiles[0])
			if (!meta) {
				logger.error('Invalid metadata in group, skipping', meta)
				return
			}

			const { idCode, workDetailId, userId, workDetailType, workDetailIndex } = meta

			for (const file of groupFiles) {
				if (!validateFile(file, meta)) continue

				if (file.id) {
					const newId = await insertFilesOfPoint([file])
					idMap.set(file.id, newId[0])
					logger.info(`Updated file id mapping: ${file.id} -> ${newId}`)
				}

				if (file.type === '6-1-1' || file.type === '6-2-1' || file.type === '1-*-3' || file.type === '2-*-3' || file.type === '6-1-0' || file.type === '6-2-0') {
					if (file.fileValue && file.flieKey) {
						const { fileName, fileType } = parseFileNameAndExt(file.fileValue)
						const fileData = await readFileAsBase64WithSudo(file.fileValue)
						data.push({ fileName, fileType, fileData })
						fileObject[file.flieKey] = fileName
					}
				} else {
					if (file.flieKey && file.fileValue) {
						fileObject[file.flieKey] = readBinaryAsHexString(file.fileValue)!
					}
				}
			}

			logger.info(`Assigning ${data.length} file(s) to work order`)

			try {
				if (data.length) {
					await assignWorkOrderFile({ mtCode, idCode, data })
				}
				const mqttPayload: SensorUploadRequest = {
					mid: uuid(),
					deviceId: mtCode,
					timestamp: Date.now(),
					type: 'DETECT_DATA',
					workDetailId,
					userId,
					workDetailType,
					workDetailIndex,
					param: {
						data: {
							sensorCode: idCode,
							timestamp: formatDateTime(),
							...fileObject
						}
					}
				}

				logger.info(platform_host, platform_port, 'Publishing MQTT payload...')
				MqttClient.publish(platform_host, platform_port, `/v1/${mtCode}/mt/data`, mqttPayload)

				logger.info('Notifying renderer of upload completion')
				window.webContents.send('file:save:upload:end', idMap)
				ipcMain.once('file:save:upload:end:over', () => {
					resolve(true)
				})
			} catch (error) {
				window.webContents.send('file:save:upload:error', idMap)
				ipcMain.once('file:save:upload:error:over', () => {
					resolve(true)
				})
			}
		})()
	})
}

/**
 * Extracts common metadata from a file object.
 */
function extractCommonMetadata(file: PointFile) {
	if (file.idCode && file.workDetailId && file.userId && file.workDetailType !== undefined && file.workDetailIndex !== undefined) {
		return {
			idCode: file.idCode,
			workDetailId: file.workDetailId,
			userId: file.userId,
			workDetailType: file.workDetailType,
			workDetailIndex: file.workDetailIndex
		}
	}
	return undefined
}

/**
 * Validates required fields for a file before processing.
 */
function validateFile(file: PointFile, meta: ReturnType<typeof extractCommonMetadata>): boolean {
	const required = [file.fileValue, file.flieKey, meta?.idCode, meta?.workDetailId, meta?.userId, meta?.workDetailType, meta?.workDetailIndex]
	const isValid = required.every((v) => v !== undefined && v !== null)

	if (!isValid) {
		logger.error('Skipping invalid file: missing required fields', file)
	}

	return isValid
}

/**
 * Parses file name and extension from a path.
 */
function parseFileNameAndExt(fullPath: string): { fileName: string; fileType: string } {
	const fileName = path.basename(fullPath)
	const extWithDot = path.extname(fullPath)
	const fileType = extWithDot.startsWith('.') ? extWithDot.slice(1) : extWithDot
	return { fileName, fileType }
}

/**
 * Requests file list from renderer process.
 */
function requestRendererUploadFiles(win: BrowserWindow): Promise<PointFile[]> {
	return new Promise((resolve) => {
		ipcMain.once('renderer-files-response', (_event, data) => {
			resolve(data)
		})
		win.webContents.send('renderer-files-request')
	})
}
