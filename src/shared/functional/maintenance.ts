import { v4 as uuid } from 'uuid'
import path from 'path'
import fs from 'fs'
import { DetectMode, UploadFileInfo, PointFileType, DetectMethod, WorkDetailType, IOpenDialogWithBuffersReturnValue, MaintenanceEnum, FileType } from '@shared/dataModelTypes/WorkOrder'
import { formatDateTime } from '@util/index'
import { generateFullPathUsingRelativePath } from '@lib'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'
import handleGroupedFileUpload from './task'
import { KeyIdDelimiter } from '@shared/dataModelTypes/helpers'

export async function handMaintenanceMode(
	workId: string,
	subWorkId: string,
	pointId: string,
	detectMethod: DetectMethod,
	mode: DetectMode,
	workDetailType: WorkDetailType,
	workDetailIndex: number,
	_sensorEid: string,
	value: IOpenDialogWithBuffersReturnValue
) {
	const baseFilePaths = value.filePaths.map((v) => buildFilePath(getFileNameWithoutExtension(v), mode))
	const files: UploadFileInfo[] = []
	if (mode === 1 || mode === 0) {
		if (baseFilePaths.length !== 2) {
			throw Error('file err')
		}
		files.push(...calcInfraredFile(workId, subWorkId, pointId, undefined, detectMethod, mode, workDetailType, workDetailIndex, baseFilePaths[0], baseFilePaths[1]))
	} else if (mode === 3) {
		if (baseFilePaths.length !== 1) {
			throw Error('file err')
		}
		files.push(...calcDMSFile(workId, subWorkId, pointId, baseFilePaths[0], detectMethod, mode, workDetailType, workDetailIndex))
	} else {
		if (baseFilePaths.length > 1) {
			throw Error('file err')
		}
		files.push(...calcDatFile(workId, subWorkId, pointId, baseFilePaths[0], detectMethod, mode, workDetailType, workDetailIndex, 1))
	}

	await Promise.all(files.map((file, index) => fs.writeFileSync(file.filePath, value.fileBuffers[index])))

	const window = global?.modelWindow.get(ModelWindowKey.mainWindow)

	if (!window) {
		throw Error('Main window not found')
	}

	window.webContents.send('files:updated:upload', files)
	await handleGroupedFileUpload()
}

/**
 * Builds image information including the target file path
 * based on the image name and detection mode.
 *
 * @param name - The name of the image file.
 * @param mode - The detection mode (e.g., IR or VI).
 * @returns An object containing the target file path where the image should be saved.
 */
function buildFilePath(name: string, mode: DetectMode | string): string {
	return generateFullPathUsingRelativePath(`./${import.meta.env.MAIN_VITE_TEMP_FILE}/${formatDateTime('YYYY-MM-DD')}/${mode}/${name}`)
}

function calcInfraredFile(
	workId: string,
	subWorkId: string,
	pointCode: string,
	baseFilePath: string | undefined,
	detectMethod: DetectMethod,
	mode: DetectMode,
	workDetailType?: WorkDetailType,
	workDetailIndex?: number,
	vi?: string,
	ir?: string
): UploadFileInfo[] {
	const fileGroup = uuid()
	return [
		{
			workId,
			subWorkId,
			workDetailId: pointCode,
			filePath: baseFilePath ? `${baseFilePath}.${FileType.VI}.jpg` : `${vi}.${FileType.VI}.jpg`,
			fileGroup,
			mode,
			detectMethod,
			type: `${detectMethod}${KeyIdDelimiter}${1}${KeyIdDelimiter}${mode}` as PointFileType,
			workDetailType,
			workDetailIndex,
			idCode: MaintenanceEnum[detectMethod]
		},
		{
			workId,
			subWorkId,
			workDetailId: pointCode,
			filePath: baseFilePath ? `${baseFilePath}.${FileType.IR}.jpg` : `${ir}.${FileType.IR}.jpg`,
			fileGroup,
			mode,
			detectMethod,
			type: `${detectMethod}${KeyIdDelimiter}${2}${KeyIdDelimiter}${mode}` as PointFileType,
			workDetailType,
			workDetailIndex,
			idCode: MaintenanceEnum[detectMethod]
		}
	]
}

function calcDMSFile(
	workId: string,
	subWorkId: string,
	pointCode: string,
	baseFilePath: string,
	detectMethod: DetectMethod,
	mode: DetectMode,
	workDetailType: WorkDetailType,
	workDetailIndex: number
): UploadFileInfo[] {
	const fileGroup = uuid()
	return [
		{
			workId,
			subWorkId,
			workDetailId: pointCode,
			filePath: `${baseFilePath}.${FileType.DMS}.jpg`,
			fileGroup,
			mode,
			detectMethod,
			type: `${detectMethod}${KeyIdDelimiter}*${KeyIdDelimiter}${mode}` as PointFileType,
			workDetailType,
			workDetailIndex,
			idCode: MaintenanceEnum[detectMethod]
		}
	]
}

function calcDatFile(
	workId: string,
	subWorkId: string,
	pointCode: string,
	baseFilePath: string,
	detectMethod: DetectMethod,
	mode: DetectMode,
	workDetailType: WorkDetailType,
	workDetailIndex: number,
	nature?: number
): UploadFileInfo[] {
	const fileGroup = uuid()
	return [
		{
			workId,
			subWorkId,
			workDetailId: pointCode,
			filePath: `${baseFilePath}.dat`,
			fileGroup,
			mode,
			detectMethod,
			type: `${detectMethod}${KeyIdDelimiter}${nature || 1}${KeyIdDelimiter}${mode}` as PointFileType,
			workDetailType,
			workDetailIndex,
			idCode: MaintenanceEnum[detectMethod]
		}
	]
}

function getFileNameWithoutExtension(filePath: string): string {
	const fileName = path.basename(filePath)
	const ext = path.extname(filePath)
	return fileName.replace(ext, '')
}
