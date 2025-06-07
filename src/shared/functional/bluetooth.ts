import path from 'path'
import { EventEmitter } from 'events'
import { copyFileSync } from 'fs'
import { spawn, ChildProcessWithoutNullStreams, exec, execFile } from 'child_process'
import { generateFullPathUsingRelativePath } from '@lib'
import { singleton } from '@util'
import { businessDataAck, MessageType } from '@shared/commParser/crc32Lexer'
import PacketCodec from '@shared/commParser/formulaParser_133'

const { MAIN_VITE_BLUETOOTH_SERVER } = import.meta.env

const PACKET_TYPE = {
	CONNECTED: 1,
	DISCONNECTED: 2,
	DATA: 3,
	ACK: 4
}

class BluetoothServiceWithProtocol extends EventEmitter {
	private pythonProcess: ChildProcessWithoutNullStreams | null = null
	private bufferCache: Map<string, Buffer> = new Map()
	private stdoutBuffer: Buffer = Buffer.alloc(0)

	public async startBluetoothService(): Promise<void> {
		const scriptPath = await this.deployBluetoothServerForTargetPath()
		try {
			this.pythonProcess = spawn('sudo', [scriptPath], {
				stdio: ['pipe', 'pipe', 'pipe']
			})
			this.pythonProcess.stdout.on('data', (data: Buffer) => this.onStdoutData(data))
			this.pythonProcess.stderr.on('data', (data: Buffer) => logger.error(`Bluetooth stderr: ${data.toString()}`))
			this.pythonProcess.on('close', (code: number) => {
				logger.log(`Bluetooth process exited with code ${code}`)
				this.emit('disconnect')
			})
		} catch (error) {
			logger.error(`Failed to start Bluetooth service: ${error}`)
		}
	}

	public sendData(data: Buffer, ack: boolean = false): void {
		logger.log(`send detect data (is heartbeat ${ack}) :`, data)
		if (this.pythonProcess?.stdin.writable) {
			this.pythonProcess.stdin.write(data, (err) => {
				if (err) {
					logger.error('Error writing data to stdin:', err)
				}
			})
		}
	}

	private deployBluetoothServerForTargetPath(): Promise<string> {
		return new Promise((resolve, reject) => {
			const scriptPath = generateFullPathUsingRelativePath(MAIN_VITE_BLUETOOTH_SERVER)
			const sourceScript = path.join(process.resourcesPath, 'tasks', 'bluetooth_server')

			try {
				copyFileSync(sourceScript, scriptPath)
			} catch (copyError) {
				reject(`Failed to copy file: ${(copyError as Error).message}`)
				return
			}

			exec(`sudo /bin/chmod 755 ${scriptPath}`, (error, _stdout, stderr) => {
				if (error) {
					reject(`Error during chmod: ${error.message}`)
					return
				}
				if (stderr) {
					reject(`stderr: ${stderr}`)
					return
				}

				execFile('/home/firefly/bluetooth/t95_app_stop.sh', (error, _stdout, stderr) => {
					if (error) {
						logger.error(`stop t95: ${error.message}`)
					}
					if (stderr) {
						logger.error(`stop t95: ${stderr}`)
					}

					resolve(scriptPath)
				})
			})
		})
	}

	private onStdoutData(data: Buffer) {
		this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, data])
		while (this.stdoutBuffer.length >= 2) {
			const length = this.stdoutBuffer.readUInt16BE(0)
			if (this.stdoutBuffer.length < 2 + length) {
				break
			}
			const fullPacket = this.stdoutBuffer.subarray(2, 2 + length)
			this.handleStdoutData(fullPacket)
			this.stdoutBuffer = this.stdoutBuffer.subarray(2 + length)
		}
	}

	private handleStdoutData(data: Buffer): void {
		if (data.length < 18) {
			logger.warn('Invalid data received: too short', data)
			return
		}
		const type = data.readUInt8(0)
		const mac = data.subarray(1, 18).toString('utf-8').replace(/\0/g, '')
		const payload = data.subarray(18)

		switch (type) {
			case PACKET_TYPE.CONNECTED:
				this.emit('connected', mac)
				this.bufferCache.set(mac, Buffer.alloc(0))
				break
			case PACKET_TYPE.DISCONNECTED:
				this.bufferCache.set(mac, Buffer.alloc(0))
				this.emit('disconnect', mac)
				break
			case PACKET_TYPE.DATA:
				this.bufferCache.set(mac, Buffer.concat([(this.bufferCache.get(mac) || Buffer.alloc(0)) as Buffer, payload]))
				this._debouncedProcessData(mac)
				break
			case PACKET_TYPE.ACK:
				this.sendData(PacketCodec.build(businessDataAck, MessageType.FileUploadAck), true)
				break
			default:
				logger.error('unknow data type')
				break
		}
	}

	// Debounced version of _processData
	private _debouncedProcessData = this._debounceQueue((mac: string) => {
		this.processReceivedDataBuffer(mac) // Call the original _processData
	})

	private processReceivedDataBuffer(mac: string): void {
		const data = this.bufferCache.get(mac)
		// If no data is found for the given socketId, return early
		if (!data || !data.length) return
		const startFlag = Buffer.from([0xeb, 0x90, 0xeb, 0x90])
		const endFlag = 0x03
		const messages: Buffer[] = []
		let offset = 0
		while (offset < data.length) {
			const startIdx = data.indexOf(startFlag, offset)
			if (startIdx === -1 || startIdx + 16 > data.length) break
			const totalLength = data.readBigUInt64BE(startIdx + 8)
			const endIdx = startIdx + Number(totalLength) - 1
			if (endIdx + 1 > data.length) break
			if (data[endIdx] !== endFlag) {
				logger.warn(`Socket ${mac}: Invalid end flag at index ${endIdx}`)
				offset = startIdx + 4
				continue
			}

			const frame = data.subarray(startIdx, endIdx + 1)
			messages.push(frame)

			offset = endIdx + 1
		}

		if (offset > 0) {
			const remaining = data.subarray(offset)
			this.bufferCache.set(mac, Buffer.from(remaining))
		}

		if (messages.length > 0) {
			this.emit('dataReceived', mac, messages)
		} else {
			logger.info(`Socket ${mac}: No complete Buffer frames found`)
		}
	}

	private _debounceQueue<T extends (...args: any[]) => void>(fn: T, delay: number = 600): (...args: Parameters<T>) => void {
		// Map to store timers for each unique set of arguments
		const timers = new Map<string, NodeJS.Timeout>()

		// Function to generate a unique key based on the arguments
		const getKey = (args: Parameters<T>): string => JSON.stringify(args)

		return (...args: Parameters<T>): void => {
			const key = getKey(args) // Serialize arguments to create a unique key

			// Clear any existing timer for the same key to reset the debounce
			if (timers.has(key)) clearTimeout(timers.get(key)!)

			// Create a new timer for the current key
			timers.set(
				key,
				setTimeout(() => {
					fn(...args) // Invoke the target function with the arguments
					timers.delete(key) // Remove the completed timer from the Map
				}, delay)
			)
		}
	}
}

const BluetoothService = singleton(BluetoothServiceWithProtocol)
export default new BluetoothService()
