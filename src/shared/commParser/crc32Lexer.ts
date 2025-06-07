export interface FieldSchema {
	name: string
	type: 'UInt8' | 'UInt16BE' | 'UInt32BE' | 'BigUInt64BE' | 'Bytes' | 'String'
	offset?: number
	dynamicOffset?: string
	length?: number
	dynamicLength?: string
}

export enum MessageType {
	TaskIssued = 0x00000001, // 1. 任务下发
	TaskReceiveAck = 0x80000001, // 2. 任务接收确认
	RequestConnection = 0x00000002, // 3. 请求连接
	RequestConnectionAck = 0x80000002, // 4. 请求连接确认
	FileUpload = 0x00000003, // 5. 检测数据文件上传
	FileUploadAck = 0x80000003 // 6. 检测数据文件接收确认
}

export type MessageTypeCode =
	| MessageType.TaskIssued
	| MessageType.TaskReceiveAck
	| MessageType.RequestConnection
	| MessageType.RequestConnectionAck
	| MessageType.FileUpload
	| MessageType.FileUploadAck

export type Encoding = 'ascii' | 'utf16le'

export type WriteMethod = 'writeUInt8' | 'writeInt32LE' | 'writeFloatLE' | 'writeStringToBuffer' | 'writeInt16LE' | 'writeBigUInt64LE' | 'writeBytes'

export interface BuildSchema {
	field: string
	size: number
	writeMethod: WriteMethod
	encoding?: Encoding
	defaultValue: any
}

export interface PacketData {
	/** 报文头标识（一般固定为特定值，如 0xeb90eb90） */
	packetHeader: number

	/** 协议版本号（例如 1 表示版本1） */
	protocolVersion: number

	/** 报文序列号（用于识别请求/响应对应关系） */
	messageSequence: number

	/** 请求类型标志（如 0x00 表示请求，0x01 表示响应） */
	requestTypeFlag: 0x00 | 0x01

	/** 报文总长度（单位：字节，包括 header + body + tail） */
	totalPacketLength: number

	/** 报文类型编码（如 0x80000003 表示请求，0x00000001 表示响应）*/
	messageType: MessageTypeCode

	/** 压缩标志（如 0x00 表示不压缩，0x01 表示压缩） */
	compressionFlag: 0x00 | 0x01

	/** 加密标志（如 0x00 表示不加密，0x01 表示加密） */
	encryptionFlag: 0x00 | 0x01

	/** 厂商 ID（用于标识设备或软件厂商）特定 0x00 */
	manufacturerID: number

	/** 保留字节（一般用于扩展，长度固定，例如 15 个字节） */
	reservedBytes: Buffer

	/** 业务数据格式（如 JSON、XML、自定义格式标识）特定 0x01 */
	businessDataFormat: 0x01

	/** 业务数据长度（单位：字节） */
	businessDataSize: number

	/** 业务数据本体（通常是字符串形式，可能是 JSON/XML 等） */
	businessData: string

	/** 检测文件数据长度（单位：字节） */
	detectDataSize: number

	/** 检测文件数据内容（可能是二进制 buffer 数组或 chunk 形式） */
	detectData: Buffer

	/** 采用 CRC32，从报文头至检测数据文件部分的 CRC 校验） */
	crc32Checksum?: number

	/** 报文尾 */
	packetTail: 0x03
}

export const packetSchema: FieldSchema[] = [
	{ name: 'packetHeader', type: 'UInt32BE', offset: 0 },
	{ name: 'protocolVersion', type: 'UInt8', offset: 4 },
	{ name: 'messageSequence', type: 'UInt16BE', offset: 5 },
	{ name: 'requestTypeFlag', type: 'UInt8', offset: 7 },
	{ name: 'totalPacketLength', type: 'BigUInt64BE', offset: 8 },
	{ name: 'messageType', type: 'UInt32BE', offset: 16 },
	{ name: 'compressionFlag', type: 'UInt8', offset: 20 },
	{ name: 'encryptionFlag', type: 'UInt8', offset: 21 },
	{ name: 'manufacturerID', type: 'UInt8', offset: 22 },
	{ name: 'reservedBytes', type: 'Bytes', offset: 23, length: 15 },
	{ name: 'businessDataFormat', type: 'UInt8', offset: 38 },
	{ name: 'businessDataSize', type: 'BigUInt64BE', offset: 39 },
	{ name: 'businessData', type: 'String', offset: 47 },
	{ name: 'detectDataSize', type: 'BigUInt64BE', dynamicOffset: '47 + businessDataSize' },
	{ name: 'detectData', type: 'Bytes', dynamicOffset: '55 + businessDataSize', dynamicLength: 'detectDataSize' },
	{ name: 'crc32Checksum', type: 'UInt32BE', dynamicOffset: 'bufferLength - 5' },
	{ name: 'packetTail', type: 'UInt8', dynamicOffset: 'bufferLength - 1' }
]

export const buildSchema: BuildSchema[] = [
	{ field: 'typeCode', size: 1, writeMethod: 'writeUInt8', defaultValue: 0 },
	{ field: 'totalLength', size: 4, writeMethod: 'writeInt32LE', defaultValue: undefined },
	{ field: 'timestamp', size: 8, writeMethod: 'writeBigUInt64LE', defaultValue: BigInt(Date.now()) },
	{ field: 'nature', size: 1, writeMethod: 'writeUInt8', defaultValue: 0 },
	{ field: 'deviceName', size: 118, writeMethod: 'writeStringToBuffer', encoding: 'utf16le', defaultValue: 'dms' },
	{ field: 'deviceCode', size: 42, writeMethod: 'writeStringToBuffer', encoding: 'ascii', defaultValue: '' },
	{ field: 'pointName', size: 128, writeMethod: 'writeStringToBuffer', encoding: 'utf16le', defaultValue: '' },
	{ field: 'pointCode', size: 32, writeMethod: 'writeStringToBuffer', encoding: 'ascii', defaultValue: '' },
	{ field: 'channelId', size: 2, writeMethod: 'writeInt16LE', defaultValue: 0 },
	{ field: 'storageType', size: 1, writeMethod: 'writeUInt8', defaultValue: 0 },
	{ field: 'temperatureUnit', size: 1, writeMethod: 'writeUInt8', defaultValue: 0 },
	{ field: 'width', size: 4, writeMethod: 'writeInt32LE', defaultValue: 0 },
	{ field: 'height', size: 4, writeMethod: 'writeInt32LE', defaultValue: 0 },
	{ field: 'visibleLength', size: 4, writeMethod: 'writeInt32LE', defaultValue: 0 },
	{ field: 'infraredLength', size: 4, writeMethod: 'writeInt32LE', defaultValue: 0 },
	{ field: 'emissivity', size: 4, writeMethod: 'writeFloatLE', defaultValue: 0 },
	{ field: 'distance', size: 4, writeMethod: 'writeFloatLE', defaultValue: 0 },
	{ field: 'ambientTemperature', size: 4, writeMethod: 'writeFloatLE', defaultValue: 0 },
	{ field: 'humidity', size: 1, writeMethod: 'writeUInt8', defaultValue: 0 },
	{ field: 'reflectionTemperature', size: 4, writeMethod: 'writeFloatLE', defaultValue: 0 },
	{ field: 'tempMax', size: 4, writeMethod: 'writeFloatLE', defaultValue: 0 },
	{ field: 'tempMin', size: 4, writeMethod: 'writeFloatLE', defaultValue: 0 }
]

export const businessDataCRC = '<error_code>100</error_code>' // CRC 校验失败，应重新发送此序号的数据包
export const businessDataAck = '<error_code>200</error_code>' // 数据正常
export const businessDataERR = '<error_code>300</error_code>' // 报文字段验证错误，应重新发送此序号的数据包
