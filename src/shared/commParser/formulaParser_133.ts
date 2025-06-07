import { packetSchema, FieldSchema, PacketData } from './crc32Lexer'

export class PacketCodec133 {
	// Packet data structure with default values
	#packetData: PacketData = {
		packetHeader: 0xeb90eb90,
		protocolVersion: 1,
		messageSequence: 0,
		requestTypeFlag: 0x00,
		totalPacketLength: 0,
		messageType: 0x80000003,
		compressionFlag: 0x00,
		encryptionFlag: 0x00,
		manufacturerID: 0x00,
		reservedBytes: Buffer.alloc(15),
		businessDataFormat: 0x01,
		businessDataSize: 0,
		businessData: '',
		detectDataSize: 0,
		detectData: Buffer.alloc(0),
		crc32Checksum: 0,
		packetTail: 0x03
	}

	// Evaluates an expression in the given context and returns the result
	private evaluate(expr: string, context: Record<string, any>): number {
		const safeExpr = expr.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (key) => {
			if (Object.prototype.hasOwnProperty.call(context, key)) {
				return `context["${key}"]`
			}
			throw new Error(`Unknown variable ${key} in expression: ${expr}`)
		})
		return Function('context', `"use strict"; return (${safeExpr})`)(context)
	}

	// Writes the field value to the buffer at the calculated offset
	private write(buffer: Buffer, field: FieldSchema, value: any, context: any) {
		const offset = field.offset ?? this.evaluate(field.dynamicOffset!, context)

		// Handle different field types
		switch (field.type) {
			case 'UInt8':
				buffer.writeUInt8(value, offset)
				break
			case 'UInt16BE':
				buffer.writeUInt16BE(value, offset)
				break
			case 'UInt32BE':
				buffer.writeUInt32BE(value, offset)
				break
			case 'BigUInt64BE':
				buffer.writeBigUInt64BE(BigInt(value), offset)
				break
			case 'Bytes': {
				const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value)
				bytes.copy(buffer, offset)
				break
			}
			case 'String': {
				buffer.write(value, offset, 'utf8')
				break
			}
			default:
				throw new Error(`Unsupported field type: ${field.type}`)
		}

		// Update context with the written value
		context[field.name] = value

		// Update size-related fields if necessary
		if (field.name === 'businessData') context.businessDataSize = Buffer.byteLength(value)
		if (field.name === 'detectData') context.detectDataSize = value.length
		context.bufferLength = buffer.length
	}

	// Reads a field value from the buffer at the calculated offset
	private read(buffer: Buffer, field: FieldSchema, context: any): any {
		const offset = field.offset ?? this.evaluate(field.dynamicOffset!, context)
		const length = field.length ?? (field.dynamicLength ? this.evaluate(field.dynamicLength, context) : 0)

		let value
		// Handle different field types
		switch (field.type) {
			case 'UInt8':
				value = buffer.readUInt8(offset)
				break
			case 'UInt16BE':
				value = buffer.readUInt16BE(offset)
				break
			case 'UInt32BE':
				value = buffer.readUInt32BE(offset)
				break
			case 'BigUInt64BE':
				value = Number(buffer.readBigUInt64BE(offset))
				break
			case 'Bytes':
				value = buffer.subarray(offset, offset + length)
				break
			case 'String':
				value = buffer.toString('utf8', offset, offset + (context.businessDataSize ?? buffer.length - offset))
				break
			default:
				throw new Error(`Unsupported field type: ${field.type}`)
		}

		// Update context with the read value
		context[field.name] = value

		// Update size-related fields if necessary
		if (field.name === 'businessDataSize') context.businessDataSize = value
		if (field.name === 'detectDataSize') context.detectDataSize = value
		context.bufferLength = buffer.length

		return value
	}

	// CRC32 table generator
	private getCRC32Table = (() => {
		let table: number[] | null = null
		return () => {
			if (table) return table
			table = new Array(256).fill(0).map((_, i) => {
				let crc = i
				for (let j = 0; j < 8; j++) {
					crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
				}
				return crc >>> 0
			})
			return table
		}
	})()

	// CRC32 checksum calculation method
	private calcCRC32(data: Uint8Array): number {
		const table = this.getCRC32Table()
		let crc = 0xffffffff
		for (let i = 0; i < data.length; i++) {
			crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff]
		}
		return (crc ^ 0xffffffff) >>> 0
	}

	// Builds the packet with the given business data and request type flag
	build(businessData: string, messageType: number, requestTypeFlag: 0x00 | 0x01 = 0x00, messageSequence?: number): Buffer {
		// Set business data and request type flag
		this.#packetData.businessData = businessData
		this.#packetData.requestTypeFlag = requestTypeFlag
		this.#packetData.messageType = messageType

		// Increment message sequence for request type 0x00
		this.#packetData.messageSequence = messageSequence || this.#packetData.messageSequence++

		// Calculate packet size
		const businessDataSize = Buffer.byteLength(businessData)
		const detectDataSize = this.#packetData.detectData.length
		const totalPacketLength = 60 + businessDataSize + detectDataSize

		// Update size-related fields
		this.#packetData.businessDataSize = businessDataSize
		this.#packetData.detectDataSize = detectDataSize
		this.#packetData.totalPacketLength = totalPacketLength

		// Allocate buffer for the packet
		const buffer = Buffer.alloc(totalPacketLength)
		const context = { ...this.#packetData, bufferLength: totalPacketLength }

		// Write fields to the buffer
		for (const field of packetSchema) {
			if (['crc32Checksum', 'packetTail'].includes(field.name)) continue
			this.write(buffer, field, this.#packetData[field.name], context)
		}

		// Calculate and write CRC32 checksum and packet tail
		const crc = this.calcCRC32(buffer.subarray(0, totalPacketLength - 5))
		buffer.writeUInt32BE(crc, totalPacketLength - 5)
		buffer.writeUInt8(this.#packetData.packetTail, totalPacketLength - 1)

		return buffer
	}

	// Parses a buffer to extract packet data
	parse(buffer: Buffer): PacketData {
		const result: Partial<PacketData> = {}
		const context: Record<string, any> = {}

		// Read fields from the buffer
		for (const field of packetSchema) {
			if (['crc32Checksum', 'packetTail'].includes(field.name)) continue
			const value = this.read(buffer, field, context)
			;(result as any)[field.name] = field.type === 'Bytes' ? [...value] : value
		}

		// Check CRC32 checksum
		const checksum = buffer.readUInt32BE(buffer.length - 5)

		const data = buffer.subarray(0, buffer.length - 5)
		const crcRaw = this.calcCRC32(data)
		const expected = ~crcRaw >>> 0
		if (checksum !== expected) {
			logger.error(`CRC mismatch: ${checksum} != ${expected}: checksum: ${checksum}, expected: ${expected}`)
		}

		// Set final checksum and packet tail
		result.crc32Checksum = checksum
		result.packetTail = buffer.readUInt8(buffer.length - 1) as 0x03
		return result as PacketData
	}

	getMessageSequence() {
		return this.#packetData.messageSequence
	}
}

export default new PacketCodec133()
