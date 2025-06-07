import AdmZip from 'adm-zip'
import { v4 as uuid } from 'uuid'
import xmlParser from '@lib/XmlParser'
import BuilderBusiness from '@shared/commParser/businessBuilder_133'
import PacketCodec from '@shared/commParser/formulaParser_133'
import {
	WorkOrder,
	SubWork,
	SubWorkOrderPoint,
	DetectMode,
	ParserAcceptDetect,
	IDescriptionXML,
	ParserAcceptDetectPoint,
	MainTaskTypeCodeToDetectMethod,
	UploadFileInfo,
	PointFileType,
	DetectMethod,
	WorkDetailType,
	FileType,
	WorkOrderStatus
} from '@shared/dataModelTypes/WorkOrder'
import TCPClient from '@service/socket'
import BluetoothService from '@shared/functional/bluetooth'
import { convertNumberString, formatDateTime, splitNumber, singleton } from '@util/index'
import { businessDataAck, businessDataERR, MessageType, PacketData } from '@shared/commParser/crc32Lexer'
import { singScheduler } from '@util/scheduler'
import { generateFullPathUsingRelativePath } from '@lib'
import { IRDatHeader, IRDatParser } from '@shared/commParser/IRDatParser_133'
import { BrowserWindow, ipcMain } from 'electron'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'
import handleGroupedFileUpload from './task'
import { KeyIdDelimiter } from '@shared/dataModelTypes/helpers'

/**
 * Communication protocol types
 */
type Communication = 'socket' | 'bluetooth'

/**
 * WorkOrderManagerWithProtocol manages work order processing with communication protocols
 * Handles task dispatching, protocol responses, and data processing
 */
class WorkOrderManagerWithProtocol {
	private mainWindow: BrowserWindow | undefined
	// Map to store pending responses with timeouts
	private pendingResponses = new Map<
		number,
		{
			resolve: (value: any) => void
			reject: (reason?: any) => void
			timeoutId: NodeJS.Timeout
			points: SubWorkOrderPoint[]
		}
	>()
	// Communication protocol enum mapping
	private CommunicationEnum: Record<Communication, Communication> = {
		socket: 'socket',
		bluetooth: 'bluetooth'
	}

	/**
	 * Initialize the main window reference
	 */
	handlerMainWindow() {
		this.mainWindow = global?.modelWindow?.get(ModelWindowKey.mainWindow)
	}

	/**
	 * Dispatch a task to the appropriate communication channel
	 * @param work - The main work order
	 * @param subwork - The subwork order
	 * @param points - The list of work order points
	 */
	async taskDispatcher(work: WorkOrder, subwork: SubWork, points: SubWorkOrderPoint[]) {
		// Request upload files from renderer and get communication parameters
		const { host, port, mode } = await this.requestRendererUploadFiles(work.workId, subwork.subWorkId)
		// Build task description XML
		const businessData = BuilderBusiness.buildTaskDescription(work, subwork, points, mode)
		// Convert business data to XML
		const businessXML = xmlParser.objectToXml(businessData, { attrkey: '$' })
		// Encode XML into packet buffer
		const bufferData = PacketCodec.build(businessXML, MessageType.TaskIssued, 0x01)
		// Get message sequence number
		const messageSequence = PacketCodec.getMessageSequence()
		// Determine communication type
		const com = this.resolveCommunicationType(mode)
		// Send task data
		this.sendTaskDataVia(host, port, bufferData, com)
		// Wait for response with timeout
		await this.waitForResponse(messageSequence, 20000, points)
	}

	/**
	 * Handle protocol responses from devices
	 * @param message - The received message buffer
	 * @param mac - Optional MAC address for Bluetooth communication
	 */
	async handleProtocolResponse(message: Buffer, mac?: string) {
		// Parse the received packet
		const parserPacketData = PacketCodec.parse(message)
		// Get message type and sequence
		const messageType = parserPacketData.messageType.toString()
		const messageSequence = parserPacketData.messageSequence

		// Handle different message types
		if (messageType === MessageType.TaskReceiveAck.toString()) {
			logger.verbose('receive resquest ack data :', parserPacketData)
			// Resolve pending response
			this.resolveResponse(messageSequence)
		} else if (messageType === MessageType.FileUpload.toString()) {
			logger.verbose('receive resquest detect data :', parserPacketData)
			// Validate detection data
			const ck = await this.checkDetectData(parserPacketData, mac, messageSequence)
			if (!ck) return
			const { workId, subWorkId, natureMap, workDetailFileNameMap, detectMethod } = ck
			// Schedule detection data processing
			singScheduler.add(async () => await this.receiveDetectData(workId, subWorkId, natureMap, workDetailFileNameMap, detectMethod, mac))
		} else {
			throw Error('Unexpected message type')
		}
	}

	/**
	 * Send task data via specified communication protocol
	 * @param host - Target host address
	 * @param port - Target port number
	 * @param bufferData - Data buffer to send
	 * @param com - Communication protocol type
	 */
	private sendTaskDataVia(host: string, port: number, bufferData: Buffer, com: Communication) {
		if (com === this.CommunicationEnum.bluetooth) {
			BluetoothService.sendData(bufferData)
		} else if (com === this.CommunicationEnum.socket) {
			TCPClient.send(host, port, bufferData)
		} else {
			throw Error('Unsupported communication method')
		}
	}

	/**
	 * Request renderer process to upload files and return communication parameters
	 * @param workId - Work order ID
	 * @param subWorkId - Subwork order ID
	 * @returns Promise resolving to communication parameters
	 */
	private requestRendererUploadFiles(
		workId?: string,
		subWorkId?: string
	): Promise<{ host: string; port: number; mode: DetectMode; workStatus: WorkOrderStatus | undefined; workDetailFileNameMap?: Record<string, string[]> }> {
		return new Promise((resolve) => {
			// Listen for renderer response
			ipcMain.once('renderer-client-response', (_event, data) => {
				resolve(data)
			})
			// Send request to renderer
			this.mainWindow?.webContents.send('renderer-client-request', workId, subWorkId)
		})
	}

	/**
	 * Determine communication protocol based on detection mode
	 * @param mode - Detection mode
	 * @returns Communication protocol type
	 */
	private resolveCommunicationType(mode: DetectMode): Communication {
		return mode === 2 ? this.CommunicationEnum.bluetooth : this.CommunicationEnum.socket
	}

	/**
	 * Wait for a response with timeout
	 * @param messageSequence - Message sequence number
	 * @param timeout - Timeout in milliseconds
	 * @param points - Work order points
	 * @returns Promise resolving when response is received or rejecting on timeout
	 */
	private waitForResponse<T = boolean>(messageSequence: number, timeout = 3000, points: SubWorkOrderPoint[]): Promise<T> {
		return new Promise((resolve, reject) => {
			// Set timeout
			const timeoutId = setTimeout(() => {
				this.pendingResponses.delete(messageSequence)
				logger.verbose('send task fail data: ', points)
				reject(new Error(`Timeout: No response for sequence ${messageSequence} in ${timeout}ms`))
			}, timeout)

			// Store pending response
			this.pendingResponses.set(messageSequence, { resolve, reject, timeoutId, points })
		})
	}

	/**
	 * Resolve a pending response
	 * @param messageSequence - Message sequence number
	 */
	private resolveResponse(messageSequence: number) {
		const pending = this.pendingResponses.get(messageSequence)
		if (pending) {
			clearTimeout(pending.timeoutId)
			pending.resolve(true)
			const points = this.pendingResponses.get(messageSequence)?.points || []
			// Notify renderer about updated files
			this.mainWindow?.webContents.send('send:points:success', points)
			this.pendingResponses.delete(messageSequence)
		}
	}

	/**
	 * Process received detection data
	 * @param mac - Optional MAC address
	 */
	private async receiveDetectData(
		workId: string,
		subWorkId: string,
		natureMap: { [propsName: string]: Buffer[] },
		workDetailFileNameMap: Record<string, string[]> | undefined,
		detectMethod: DetectMethod,
		mac?: string
	) {
		await new Promise((resolve) => {
			;(async () => {
				const files: UploadFileInfo[] = []
				let detectBG: IRDatHeader | undefined = undefined

				// Process background data if available
				if (natureMap?.['2']?.[0]) {
					const parser = new IRDatParser(natureMap?.['2']?.[0])
					detectBG = parser.getHeader()

					// Extract background data file
					const mode = 2 as DetectMode
					const name = parser.getHeader().timestamp
					const baseFilePath = WorkOrderManagerWithProtocol.buildFilePath(name, mode)
					await Promise.all([parser.extractDatFile(`${baseFilePath}.bkg.dat`)])
				}

				// Process all detection data points
				await Promise.all(
					natureMap['1']?.map(async (data) => {
						const parser = new IRDatParser(data)
						// Split point code into components
						const [pointCode, mode, workDetailType, workDetailIndex] = splitNumber(parser.getHeader().pointCode, [18, 1, 1, 0])
						const fileName = parser.getHeader().timestamp
						// Check if file needs processing
						if (!workDetailFileNameMap?.[pointCode]?.includes(fileName)) {
							// Process data based on mode
							const fls = await this.modeHandlerMap.get(mode)!.call(this, parser, workId, subWorkId, pointCode, detectMethod, workDetailType, workDetailIndex, mac, detectBG)
							files.push(...fls)
						}
					})
				)

				// Notify renderer about updated files
				this.mainWindow?.webContents.send('files:updated:upload', files)
				ipcMain.once('files:updated:upload:over', async () => {
					await handleGroupedFileUpload()
					resolve(true)
				})
				// Handle grouped file upload
			})()
		})
	}

	// A map that associates detection modes with their corresponding clearance building functions
	private readonly modeHandlerMap: Map<
		number,
		(
			parser: IRDatParser,
			workId: string,
			subWorkId: string,
			workDetailId: string,
			detectMethod: DetectMethod,
			workDetailType: WorkDetailType,
			workDetailIndex: number,
			mac?: string,
			bg?: IRDatHeader | undefined
		) => Promise<UploadFileInfo[]>
	> = new Map([
		[1, WorkOrderManagerWithProtocol.handlerDetectData_1],
		[2, WorkOrderManagerWithProtocol.handlerDetectData_2],
		[3, WorkOrderManagerWithProtocol.handlerDetectData_3]
	])

	/**
	 * Handle detection data for mode 1 (visible and infrared images)
	 * @param parser - IR data parser
	 * @param workId - Work order ID
	 * @param subWorkId - Subwork order ID
	 * @param workDetailId - Work detail ID
	 * @param detectMethod - Detection method
	 * @param workDetailType - Work detail type
	 * @param workDetailIndex - Work detail index
	 * @returns Array of upload file information
	 */
	static async handlerDetectData_1(
		parser: IRDatParser,
		workId: string,
		subWorkId: string,
		workDetailId: string,
		detectMethod: DetectMethod,
		workDetailType: WorkDetailType,
		workDetailIndex: number
	) {
		const mode = 1 as DetectMode
		const fileGroup = uuid()
		const name = parser.getHeader().timestamp
		const baseFilePath = WorkOrderManagerWithProtocol.buildFilePath(name, mode)
		// Extract visible and infrared images
		await Promise.all([parser.extractVisibleImage(`${baseFilePath}.${FileType.VI}.jpg`), parser.extractInfraredImage(`${baseFilePath}.${FileType.IR}.jpg`)])

		return [1, 2].map((tt) => ({
			workId,
			subWorkId,
			workDetailId,
			filePath: `${baseFilePath}.${tt === 1 ? FileType.VI : FileType.IR}.jpg`,
			fileGroup,
			mode,
			detectMethod,
			type: `${detectMethod}${KeyIdDelimiter}${tt}${KeyIdDelimiter}${mode}` as PointFileType,
			workDetailType,
			workDetailIndex
		}))
	}

	/**
	 * Handle detection data for mode 2 (spectral data with background)
	 * @param parser - IR data parser
	 * @param workId - Work order ID
	 * @param subWorkId - Subwork order ID
	 * @param workDetailId - Work detail ID
	 * @param detectMethod - Detection method
	 * @param workDetailType - Work detail type
	 * @param workDetailIndex - Work detail index
	 * @param mac - Optional MAC address
	 * @param bg - Optional background data
	 * @returns Array of upload file information
	 */
	static async handlerDetectData_2(
		parser: IRDatParser,
		workId: string,
		subWorkId: string,
		workDetailId: string,
		detectMethod: DetectMethod,
		workDetailType: WorkDetailType,
		workDetailIndex: number,
		mac?: string,
		bg?: IRDatHeader | undefined
	) {
		const mode = 2 as DetectMode
		const name = parser.getHeader().timestamp
		const baseFilePath = WorkOrderManagerWithProtocol.buildFilePath(name, mode)
		const bgFilePath = WorkOrderManagerWithProtocol.buildFilePath(bg?.timestamp, mode)
		// Extract standard data file
		await Promise.all([parser.extractDatFile(`${baseFilePath}.${FileType.STD}.dat`)])
		// Determine file nature (standard and background)
		const natures = [1]
		const fileGroup = uuid()
		bg && natures.push(2)

		return natures.map((nature) => {
			return {
				workId,
				subWorkId,
				workDetailId,
				filePath: `${nature === 1 ? baseFilePath : bgFilePath}.${nature === 1 ? FileType.STD : FileType.BKG}.dat`,
				fileGroup,
				mode,
				detectMethod,
				type: `${detectMethod}${KeyIdDelimiter}${nature || 1}${KeyIdDelimiter}${mode}` as PointFileType,
				workDetailType,
				workDetailIndex,
				idCode: mac
			}
		})
	}

	/**
	 * Handle detection data for mode 3 (DMS images)
	 * @param parser - IR data parser
	 * @param workId - Work order ID
	 * @param subWorkId - Subwork order ID
	 * @param workDetailId - Work detail ID
	 * @param detectMethod - Detection method
	 * @param workDetailType - Work detail type
	 * @param workDetailIndex - Work detail index
	 * @returns Array of upload file information
	 */
	static async handlerDetectData_3(
		parser: IRDatParser,
		workId: string,
		subWorkId: string,
		workDetailId: string,
		detectMethod: DetectMethod,
		workDetailType: WorkDetailType,
		workDetailIndex: number
	) {
		const mode = 3 as DetectMode
		const fileGroup = uuid()
		const { timestamp, deviceCode } = parser.getHeader()
		const baseFilePath = WorkOrderManagerWithProtocol.buildFilePath(timestamp, mode)
		// Extract DMS image
		await Promise.all([parser.extractVisibleImage(`${baseFilePath}.${FileType.DMS}.jpg`)])
		return [
			{
				workId,
				subWorkId,
				workDetailId,
				filePath: `${baseFilePath}.${FileType.DMS}.jpg`,
				fileGroup,
				mode,
				detectMethod,
				type: `${detectMethod}${KeyIdDelimiter}*${KeyIdDelimiter}${mode}` as PointFileType,
				workDetailType,
				workDetailIndex,
				idCode: deviceCode
			}
		]
	}

	/**
	 * Validate and process detection data
	 * @param parserPacketData - Parsed packet data
	 * @param mac - Optional MAC address
	 * @param messageSequence - Message sequence number
	 * @returns Processed detection data or undefined on error
	 */
	private async checkDetectData(parserPacketData: PacketData, mac?: string, messageSequence?: number) {
		// Parse business data from packet
		const parserdetectData = (await xmlParser.parseXmlToObject(parserPacketData.businessData)) as IDescriptionXML
		// Extract work order information
		const { workId, subWorkId, fileGroupMap, detectMethod } = this.parseAcceptDetect(parserdetectData)
		// Request upload parameters from renderer
		const { host, port, workDetailFileNameMap, workStatus } = await this.requestRendererUploadFiles(workId, subWorkId)

		try {
			if (!workStatus || workStatus === 2) {
				throw Error('receive detect data is error about work status!')
			}

			logger.log('file name point map:', workDetailFileNameMap)
			// Get detection data (handles both zipped and unzipped data)
			const detectDatas = await this.getDetectDatas(parserPacketData, parserdetectData)
			// Build acknowledgment packet
			const bufferData = PacketCodec.build(businessDataAck, MessageType.FileUploadAck, undefined, messageSequence)

			// Group detection data by nature
			const natureMap: { [propsName: string]: Buffer[] } = {}

			for (const data of detectDatas) {
				const parser = new IRDatParser(data)
				const index = parser.getHeader().nature!.toString() === '2' ? '2' : '1'
				natureMap[index] = natureMap[index] || []
				natureMap[index].push(data)
			}

			// Validate background data count
			if (natureMap?.['2'] && natureMap['2'].length > 1) {
				throw Error('receive detect bg data count error')
			}

			// Send acknowledgment
			if (mac) {
				BluetoothService.sendData(bufferData)
			} else {
				TCPClient.send(host, port, bufferData)
			}

			let fileGroupId = uuid()

			// Use background point code as file group if available
			if (natureMap?.['2']?.[0]) {
				const parser = new IRDatParser(natureMap['2'][0])
				fileGroupId = parser.getHeader().pointCode
			}

			return { workId, subWorkId, natureMap, fileGroupId, fileGroupMap, workDetailFileNameMap, detectMethod }
		} catch (error) {
			logger.error('accept detect result parse error', parserPacketData, error)
			// Send error acknowledgment
			const bufferData = PacketCodec.build(businessDataERR, MessageType.FileUploadAck, undefined, messageSequence)
			if (mac) BluetoothService.sendData(bufferData)
			else TCPClient.send(host, port, bufferData)
			return undefined
		}
	}

	/**
	 * Parse acceptance detection XML data
	 * @param desc - XML description data
	 * @returns Parsed detection information
	 */
	private parseAcceptDetect(desc: IDescriptionXML): ParserAcceptDetect & { fileGroupMap: Record<string, string> } {
		// Convert ID from hex to decimal
		const convertId = (id: string): string => convertNumberString(id, 'dec')

		// Extract main and sub tasks
		const mainTask = desc.IDescription.main_task
		const subTask = mainTask.sub_task

		// Determine detection method
		const detectMethod = MainTaskTypeCodeToDetectMethod[mainTask.$.type] || 6
		// Convert IDs
		const workId = convertId(mainTask.$.id)
		const subWorkId = convertId(subTask.$.id)

		// Flag to determine if DAT files need expansion
		const needExpandDat = detectMethod === 6

		// Ensure value is an array
		const ensureArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])

		// Map to store file groups
		const fileGroupMap: Record<string, string> = {}

		// Expand DAT files into VI and IR images
		const expandDatFiles = (id: string, fileName: string): ParserAcceptDetectPoint[] => {
			const fileGroup = uuid()
			if (fileName.endsWith('.dat')) {
				const baseName = fileName.slice(0, -4)
				fileGroupMap[id] = fileGroup
				return [
					{ id, fileName: `${baseName}.${FileType.VI}.jpg` },
					{ id, fileName: `${baseName}.${FileType.IR}.jpg` }
				]
			}
			fileGroupMap[id] = fileGroup
			return [{ id, fileName }]
		}

		// Extract and process all files from XML
		const files: ParserAcceptDetectPoint[] = ensureArray(subTask.clearance).flatMap((clearance) =>
			ensureArray(clearance.test_point).flatMap((testPoint) => {
				// Split point ID into components
				const [id] = splitNumber(convertId(testPoint.$.id), [18, 1, 1, 0])
				const fileName = testPoint.$.filename
				if (needExpandDat) {
					return expandDatFiles(id, fileName)
				} else {
					fileGroupMap[id] = uuid()
					return [{ id, fileName }]
				}
			})
		)
		return { workId, subWorkId, files, detectMethod, fileGroupMap }
	}

	/**
	 * Get detection data from packet, handling both compressed and uncompressed formats
	 * @param parserPacketData - Parsed packet data
	 * @param parserdetectData - Parsed detection data
	 * @returns Array of detection data buffers
	 */
	private async getDetectDatas(parserPacketData: PacketData, parserdetectData: IDescriptionXML) {
		// Handle uncompressed data
		if (parserPacketData.compressionFlag === 0 && parserdetectData.IDescription.main_task.file_type === '0') {
			return [Buffer.from(parserPacketData.detectData)]
		} else {
			// Handle compressed (zipped) data
			return await this.extractDatFilesFromZip(Buffer.from(parserPacketData.detectData))
		}
	}

	/**
	 * Extract DAT files from a zip buffer
	 * @param zipBuffer - Zip file buffer
	 * @returns Array of extracted DAT file buffers
	 */
	private extractDatFilesFromZip(zipBuffer: Buffer): Buffer[] {
		const zip = new AdmZip(zipBuffer)
		const datBuffers: Buffer[] = []

		// Extract all DAT files from zip
		for (const entry of zip.getEntries()) {
			if (!entry.isDirectory && entry.entryName.endsWith('.dat')) {
				datBuffers.push(entry.getData())
			}
		}

		return datBuffers
	}

	/**
	 * Build file path using timestamp and detection mode
	 * @param name - File name/timestamp
	 * @param mode - Detection mode
	 * @returns Full file path
	 */
	static buildFilePath(name: string | undefined, mode: DetectMode | string): string {
		return generateFullPathUsingRelativePath(`./${import.meta.env.MAIN_VITE_TEMP_FILE}/${formatDateTime('YYYY-MM-DD')}/${mode}/${name}`)
	}
}

// Singleton instance of WorkOrderManager
const WorkOrderManager = singleton(WorkOrderManagerWithProtocol)
export default new WorkOrderManager()
