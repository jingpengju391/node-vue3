import { convertNumberString } from '@util/index'
import * as fs from 'fs'
import { buildSchema } from './crc32Lexer'

type Encoding = 'ascii' | 'utf16le'

/**
 * IRDat file header metadata structure.
 */
export interface IRDatHeader {
	typeCode: number
	totalLength: number
	timestamp: string
	nature?: number
	deviceName?: string
	deviceCode?: string
	pointName: string
	pointCode: string
	channelId?: number
	storageType: number
	temperatureUnit: number
	width: number
	height: number
	visibleLength: number
	infraredLength: number
	emissivity: number
	distance: number
	ambientTemperature: number
	humidity: number
	reflectionTemperature: number
	tempMax: number
	tempMin: number
	customReserved: Buffer
	visibleOffset: number
	infraredOffset: number
}

/**
 * Parser for IRDat file format, used to parse headers, extract images, and read temperature matrices.
 */
export class IRDatParser {
	private static readonly HEADER_SIZE = 512
	private buffer?: Buffer
	private header?: IRDatHeader

	constructor(buffer?: Buffer) {
		if (buffer) {
			this.buffer = buffer
			this.header = this.parseHeader()
		}
	}

	/**
	 * Read a string from the buffer and remove trailing null characters and spaces.
	 * @param start Start index in the buffer.
	 * @param length Length of the string in bytes.
	 * @param encoding Encoding type ('utf16le' or 'ascii').
	 */
	private readString(start: number, length: number, encoding: Encoding): string {
		if (!this.buffer) {
			throw new Error('Buffer is not initialized')
		}
		const raw = this.buffer.subarray(start, start + length)
		return raw.toString(encoding).replace(/\0+$/, '').trim()
	}

	/**
	 * Parse the IRDat file header to extract metadata fields.
	 * @returns Parsed IRDatHeader object.
	 */
	private parseHeader(): IRDatHeader {
		if (!this.buffer) {
			throw new Error('Buffer is not initialized')
		}
		const h = {} as IRDatHeader

		h.typeCode = this.buffer.readUInt8(IRDatParser.HEADER_SIZE)
		h.totalLength = this.buffer.readInt32LE(IRDatParser.HEADER_SIZE + 1)
		h.timestamp = this.buffer.readBigUInt64LE(IRDatParser.HEADER_SIZE + 5).toString()

		h.nature = this.buffer.readUInt8(IRDatParser.HEADER_SIZE + 13)
		h.deviceName = this.readString(IRDatParser.HEADER_SIZE + 14, 118, 'utf16le')
		h.deviceCode = this.readString(IRDatParser.HEADER_SIZE + 132, 42, 'ascii')
		h.pointName = this.readString(IRDatParser.HEADER_SIZE + 174, 128, 'utf16le')
		h.pointCode = convertNumberString(this.readString(IRDatParser.HEADER_SIZE + 302, 32, 'ascii'), 'dec')

		h.channelId = this.buffer.readInt16LE(IRDatParser.HEADER_SIZE + 334)
		h.storageType = this.buffer.readUInt8(IRDatParser.HEADER_SIZE + 336)
		h.temperatureUnit = this.buffer.readUInt8(IRDatParser.HEADER_SIZE + 337)
		h.width = this.buffer.readInt32LE(IRDatParser.HEADER_SIZE + 338)
		h.height = this.buffer.readInt32LE(IRDatParser.HEADER_SIZE + 342)
		h.visibleLength = this.buffer.readInt32LE(IRDatParser.HEADER_SIZE + 346)
		h.infraredLength = this.buffer.readInt32LE(IRDatParser.HEADER_SIZE + 350)
		h.emissivity = this.buffer.readFloatLE(IRDatParser.HEADER_SIZE + 354)
		h.distance = this.buffer.readFloatLE(IRDatParser.HEADER_SIZE + 358)
		h.ambientTemperature = this.buffer.readFloatLE(IRDatParser.HEADER_SIZE + 362)
		h.humidity = this.buffer.readUInt8(IRDatParser.HEADER_SIZE + 366)
		h.reflectionTemperature = this.buffer.readFloatLE(IRDatParser.HEADER_SIZE + 367)
		h.tempMax = this.buffer.readFloatLE(IRDatParser.HEADER_SIZE + 371)
		h.tempMin = this.buffer.readFloatLE(IRDatParser.HEADER_SIZE + 375)
		h.customReserved = this.buffer.subarray(IRDatParser.HEADER_SIZE + 379, IRDatParser.HEADER_SIZE)

		const k = this.getDataSizePerPoint(h.storageType)
		const m = k * h.width * h.height
		const dataEnd = IRDatParser.HEADER_SIZE * 2 + m

		h.visibleOffset = dataEnd
		h.infraredOffset = dataEnd + h.visibleLength

		return h
	}

	/**
	 * Get the size in bytes per pixel depending on the storage type.
	 * @param t Storage type code (0x02 = uint8, 0x04 = int32, 0x06 = float32).
	 */
	private getDataSizePerPoint(t: number): number {
		switch (t) {
			case 0x02:
				return 1
			case 0x04:
				return 4
			case 0x06:
				return 4
			default:
				return 4
		}
	}

	/**
	 * Get the parsed header information.
	 * @returns Parsed IRDatHeader object.
	 */
	public getHeader(): IRDatHeader {
		if (!this.header) {
			throw new Error('Buffer is not initialized')
		}
		return this.header
	}

	/**
	 * Build a new header buffer based on a partial header and optional image data.
	 * @param partialHeader Optional override for header fields.
	 * @param visibleImage Optional visible image buffer.
	 * @param infraredImage Optional infrared image buffer.
	 * @returns Combined buffer containing the header and images.
	 */
	public buildHeaderBuffer(partialHeader: Partial<IRDatHeader> = {}, visibleImage?: Buffer, infraredImage?: Buffer): Buffer {
		const totalLength = 512 + (visibleImage?.length || 0)
		const headerBuffer = Buffer.alloc(379)

		let offset = 0
		const writeField = (field: string, size: number, writeMethod: string, encoding?: Encoding, defaultValue?: any) => {
			const value = partialHeader[field] ?? (field === 'totalLength' ? totalLength : defaultValue)
			if (writeMethod === 'writeStringToBuffer') {
				this.writeStringToBuffer(headerBuffer, offset, value as string, encoding!)
			} else if (field === 'width') {
				headerBuffer[writeMethod](infraredImage?.readUInt32BE(16) ?? value, offset)
			} else if (field === 'height') {
				headerBuffer[writeMethod](infraredImage?.readUInt32BE(20) ?? value, offset)
			} else if (field === 'visibleLength') {
				headerBuffer[writeMethod](visibleImage?.length ?? value, offset)
			} else if (field === 'infraredLength') {
				headerBuffer[writeMethod](infraredImage?.length ?? value, offset)
			} else {
				headerBuffer[writeMethod](value, offset)
			}
			offset += size
		}

		buildSchema.forEach(({ field, size, writeMethod, encoding, defaultValue }) => {
			writeField(field, size, writeMethod, encoding, defaultValue)
		})

		return Buffer.concat([Buffer.alloc(IRDatParser.HEADER_SIZE), headerBuffer, Buffer.alloc(133), visibleImage ?? Buffer.alloc(0), infraredImage ?? Buffer.alloc(0)])
	}

	/**
	 * Helper function to write a string into a buffer at a specified start index.
	 * @param buffer Target buffer.
	 * @param start Start index in the buffer.
	 * @param str String to write.
	 * @param encoding String encoding type ('ascii' or 'utf16le').
	 */
	private writeStringToBuffer(buffer: Buffer, start: number, str: string, encoding: Encoding): void {
		const encoded = Buffer.from(str, encoding)
		encoded.copy(buffer, start)
	}

	/**
	 * Extract the visible light image data and save it to a file.
	 * @param filepath Path to save the extracted image.
	 */
	public extractVisibleImage(filepath: string) {
		if (!this.header || !this.buffer) {
			throw new Error('Buffer is not initialized')
		}
		if (this.header.visibleLength <= 0) {
			logger.warn('No visible image data found in the .dat file.')
			return
		}
		const start = this.header.visibleOffset
		const end = start + this.header.visibleLength

		try {
			fs.writeFileSync(filepath, this.buffer.subarray(start, end))
		} catch (err) {
			logger.error(`Failed to extract visible image: ${(err as Error).message}`)
		}
	}

	/**
	 * Extract the infrared image data and save it to a file.
	 * @param filepath Path to save the extracted infrared image.
	 */
	public extractInfraredImage(filepath: string) {
		if (!this.header || !this.buffer) {
			throw new Error('Buffer is not initialized')
		}
		if (this.header.infraredLength <= 0) {
			logger.warn('No infrared image data found in the .dat file.')
			return
		}
		const start = this.header.infraredOffset
		const end = start + this.header.infraredLength
		try {
			fs.writeFileSync(filepath, this.buffer.subarray(start, end))
		} catch (err) {
			logger.error(`Failed to extract infrared image: ${(err as Error).message}`)
		}
	}

	/**
	 * Extract the entire .dat file and save it to a specified path.
	 * @param filepath Path to save the extracted .dat file.
	 */
	public extractDatFile(filepath: string) {
		if (!this.header || !this.buffer) {
			throw new Error('Buffer is not initialized')
		}
		try {
			fs.writeFileSync(filepath, this.buffer)
		} catch (err) {
			logger.error(`Failed to extract dat file: ${(err as Error).message}`)
		}
	}

	/**
	 * Read and return the temperature matrix data from the infrared block.
	 * @returns 2D array representing temperature or raw data values.
	 */
	public getTemperatureMatrix(): number[][] {
		if (!this.header || !this.buffer) {
			throw new Error('Buffer is not initialized')
		}
		const { width, height, storageType } = this.header
		const matrix: number[][] = []
		const k = this.getDataSizePerPoint(storageType)
		const offset = IRDatParser.HEADER_SIZE // Infrared temperature data always starts at offset 512

		for (let i = 0; i < height; i++) {
			const row: number[] = []
			for (let j = 0; j < width; j++) {
				const index = offset + (i * width + j) * k
				let value: number
				switch (storageType) {
					case 0x02:
						value = this.buffer.readUInt8(index)
						break
					case 0x04:
						value = this.buffer.readInt32LE(index)
						break
					case 0x06:
						value = this.buffer.readFloatLE(index)
						break
					default:
						value = 0
				}
				row.push(value)
			}
			matrix.push(row)
		}
		return matrix
	}
}
