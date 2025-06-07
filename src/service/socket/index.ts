import * as net from 'net'
import { EventEmitter } from 'events'
import { singleton, sleep } from '@util'

type HeartbeatTimeout = 3000 | 15000 | 0

type TCPSockets = {
	socket: net.Socket | null // The current TCP socket
	status: 0 | 1 // Connection status: 0 means no client, 1 means connected
	heartbeatTimeout: HeartbeatTimeout // Interval for sending heartbeat packets
	host: string // The server's host address
	port: number // The server's port number
	reClient: boolean // Whether reconnection is required
	handleSocket: (socket: net.Socket | null) => void // Handle TCP socket
	handleStatus: (status: 0 | 1) => void // Handle connection status
	handleHeartbeatTimeout: (heartbeatTimeout: HeartbeatTimeout) => void // Handle heartbeat timeout
	handleReClient: (reClient: boolean) => void // Handle reconnection flag
}

class TCPSocketClass implements TCPSockets {
	socket: net.Socket | null
	status: 0 | 1
	heartbeatTimeout: HeartbeatTimeout
	host: string
	port: number
	reClient: boolean
	constructor(host: string, port: number, socket?: net.Socket, status?: 0 | 1, heartbeatTimeout?: HeartbeatTimeout, reClient?: boolean) {
		this.socket = socket ?? null // Initialize socket, default to null
		this.status = status ?? 0 // Default status to 0 (not connected)
		this.heartbeatTimeout = heartbeatTimeout ?? 3000 // Default heartbeat timeout to 3000ms
		this.host = host ?? null // Initialize host address
		this.port = port ?? null // Initialize port number
		this.reClient = !!reClient // Initialize reconnection flag
	}

	handleSocket(socket: net.Socket | null) {
		this.socket = socket // Update the socket instance
	}

	handleStatus(status: 0 | 1) {
		this.status = status // Update the connection status
	}

	handleHeartbeatTimeout(heartbeatTimeout: HeartbeatTimeout) {
		this.heartbeatTimeout = heartbeatTimeout // Update the heartbeat timeout
	}

	handleReClient(reClient: boolean) {
		this.reClient = reClient // Update the reconnection flag
	}
}

class TCPClientWithProtocol extends EventEmitter {
	private sockets: Map<string, TCPSockets> // Store multiple socket instances, indexed by host:port
	private acceptData: Map<string, Buffer> // Store XML data for each socket (as strings)
	private heartbeatIntervals: Map<string, NodeJS.Timeout | null> // Store heartbeat intervals for each socket
	private readonly reconnectTimeout: number // Interval for automatic reconnection
	private readonly startsWith: string
	private readonly endsWith: string

	constructor() {
		super()
		this.sockets = new Map() // Initialize sockets map
		this.acceptData = new Map() // Initialize xmls map for XML strings
		this.heartbeatIntervals = new Map() // Initialize heartbeat intervals map
		this.reconnectTimeout = 5000 // Set automatic reconnection interval to 5 seconds
		this.startsWith = '<head>'
		this.endsWith = '</head>'
	}

	// Connect to the server
	public connect(host: string, port: number, heartbeatTimeout?: HeartbeatTimeout): void {
		const socketId = `${host}:${port}` // Generate a unique socket ID based on host and port
		const existing = this.sockets.get(socketId)
		if (existing && existing.socket && !existing.socket.destroyed) {
			this.emit('connected', socketId)
			logger.info(`Socket ${socketId} is already connected. Skipping reconnect.`)
			return
		}
		const socket = new net.Socket() // Initialize a new socket instance
		this.sockets.set(socketId, new TCPSocketClass(host, port, socket, undefined, heartbeatTimeout)) // Store the socket instance
		this.acceptData.set(socketId, Buffer.alloc(0)) // Initialize an empty string xmls for this socket
		this.heartbeatIntervals[socketId] = null // Initialize heartbeat interval for this socket

		socket.connect(port, host, () => {
			// Emit a 'connected' event to notify other parts of the application
			this.emit('connected', socketId)
			logger.log(`Connected to server at ${host}:${port}`) // Log connection success
			this.sockets.get(socketId)?.heartbeatTimeout && this._startHeartbeat(socketId) // Start heartbeat after connection is established
		})

		this._setupListeners(socketId) // Set up event listeners for this socket
	}

	// Disconnect from the server
	public disconnect(host: string, port: number): void {
		const socketId = `${host}:${port}` // Generate a unique socket ID using host and port
		const tcp_sockets = this.sockets.get(socketId)

		if (tcp_sockets?.socket) {
			tcp_sockets.socket.destroy() // Gracefully close the TCP connection
			this.sockets.delete(socketId) // Remove the socket instance from the sockets map
			logger.log(`Disconnected from ${host}:${port}`) // Log the disconnection event
		}

		// Retrieve and clear the heartbeat interval associated with this socket
		const interval = this.heartbeatIntervals.get(socketId)
		if (interval) {
			clearInterval(interval) // Stop the periodic heartbeat timer
			this.heartbeatIntervals.delete(socketId) // Remove the timer from the map
		}
	}

	// Send data to the server
	public send(host: string, port: number, xmlData: string | Buffer): void {
		logger.log(`socker end:`, xmlData)
		const socketId = `${host}:${port}`
		const socket = this.sockets.get(socketId)?.socket
		if (socket && !socket.destroyed) {
			socket.write(xmlData) // Send the complete message
		} else {
			logger.log(`Socket to ${socketId} is closed. Cannot send data.`) // Log if socket is closed
		}
	}

	// Set up listeners for socket events (data, error, close)
	private _setupListeners(socketId: string): void {
		const socket = this.sockets.get(socketId)?.socket
		if (socket) {
			socket.on('data', (data: Buffer) => {
				logger.log(`accept socket: ${socketId}:`, data)
				const dataCache = this.acceptData.get(socketId) || Buffer.alloc(0)
				const combined = Buffer.concat([dataCache as Buffer, data]) // Accumulate received data in Buffer
				this.acceptData.set(socketId, combined)
				// Using debounce to call _processData after a delay
				this._debouncedProcessData(socketId)
			})

			socket.on('error', (_err: Error) => {
				// Handle reconnection in case of an error
				this._debouncedReconnection(socketId)
			})

			socket.on('close', () => {
				// Attempt reconnection when the connection is closed
				this._debouncedReconnection(socketId)
			})
		}
	}

	// Debounced version of _processData
	private _debouncedProcessData = this._debounceQueue((socketId: string) => {
		this._processData(socketId) // Call the original _processData
	})

	// Debounced version of _processData
	private _debouncedReconnection = this._debounceQueue((socketId: string) => {
		logger.error(`Socket error at ${socketId}`) // Log error if socket encounters an error
		this._handleReconnection(socketId)
	})

	// Process the received data, extracting full messages based on the protocol
	private _processData(socketId: string): void {
		// Assuming the received data is stored in `this.xmls`
		const tcp_sockets = this.sockets.get(socketId)
		const data = this.acceptData.get(socketId)

		// If no data is found for the given socketId, return early
		if (!data || !tcp_sockets) return
		logger.log('accept data is binary protocol:', this.isBinaryProtocol(data))
		if (this.isBinaryProtocol(data)) {
			this.parseBinaryFrames(socketId, data)
		} else {
			this.parseTextFrames(socketId, data)
		}
	}

	// Handle automatic reconnection after an error or close event
	private async _handleReconnection(socketId: string): Promise<void> {
		this.emit('disconnect', socketId)
		const tcp_sockets = this.sockets.get(socketId)
		if (tcp_sockets?.reClient || !tcp_sockets?.socket) return
		tcp_sockets.handleReClient(true) // Set the reconnection flag to true
		await sleep(this.reconnectTimeout) // Wait for the reconnect timeout
		logger.log(`Attempting to reconnect to ${socketId}...`) // Log reconnection attempt
		// Attempt reconnection
		this.connect(tcp_sockets.host, tcp_sockets.port)
		tcp_sockets.handleReClient(false) // Reset the reconnection flag after reconnecting
	}

	// Start sending heartbeat packets periodically to keep the connection alive
	private _startHeartbeat(socketId: string): void {
		// Avoid creating multiple heartbeat tasks for the same socket
		if (this.heartbeatIntervals.get(socketId)) {
			return // If a heartbeat interval is already set for this socket, do nothing
		}

		const tcp_sockets = this.sockets.get(socketId)
		// Check if the socket is valid and not destroyed
		if (!tcp_sockets?.socket || tcp_sockets.socket.destroyed) return

		// Start a periodic heartbeat task with a defined interval
		const interval = setInterval(() => {
			const s = this.sockets.get(socketId)
			// If the socket is invalid or destroyed, clear the interval and remove it from the map
			if (!s?.socket || s.socket.destroyed) {
				clearInterval(interval) // Stop the heartbeat task
				this.heartbeatIntervals.delete(socketId) // Remove the heartbeat interval entry from the map
				return
			}
			// Send a heartbeat message to the server to keep the connection alive
			this.send(s.host, s.port, '<heartbeat/>')
			// logger.log(`heartbeat (${socketId})`) // Optionally log the heartbeat for debugging
		}, tcp_sockets.heartbeatTimeout) // The interval is defined by the `heartbeatTimeout` for the specific socket

		// Store the interval ID so that it can be cleared later
		this.heartbeatIntervals.set(socketId, interval)
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

	private isBinaryProtocol(data: Buffer) {
		const startFlag = Buffer.from([0xeb, 0x90, 0xeb, 0x90])
		return data.subarray(0, 4).equals(startFlag)
	}

	private parseBinaryFrames(socketId: string, data: Buffer) {
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
				logger.warn(`Socket ${socketId}: Invalid end flag at index ${endIdx}`)
				offset = startIdx + 4
				continue
			}

			const frame = data.subarray(startIdx, endIdx + 1)
			messages.push(frame)

			offset = endIdx + 1
		}

		if (offset > 0) {
			const remaining = data.subarray(offset)
			this.acceptData.set(socketId, Buffer.from(remaining))
		}

		if (messages.length > 0) {
			this.emit('dataReceived', socketId, messages)
		} else {
			logger.info(`Socket ${socketId}: No complete Buffer frames found`)
		}
	}

	private parseTextFrames(socketId: string, data: Buffer) {
		const dataString = data.toString('utf8')
		const regex = new RegExp(`${this._escapeRegex(this.startsWith)}.*?${this._escapeRegex(this.endsWith)}`, 'g')
		// Array to store extracted messages
		const matches: string[] = []

		// Execute regex on the received data string (assumed to be 'this.xmls.get(socketId)')
		let match: RegExpExecArray | null
		// Extract matches from the data
		while ((match = regex.exec(dataString)) !== null) {
			matches.push(match[0]) // Push the matched content (between start and end) into the 'matches' array
		}

		if (matches.length > 0) {
			// Update the stored data by removing the processed content (to avoid reprocessing the same data)
			const unprocessed = dataString.replace(regex, '')
			this.acceptData.set(socketId, Buffer.from(unprocessed, 'utf8'))
			// logger.info(`Socket ${socketId}: Processed ${matches.length} matches`, matches)
			// Optionally: Return or process the matches array as needed
			// For example, emit the matches to listeners or handle them in some way
			this.emit('dataReceived', socketId, matches) // Emit an event with the processed data (optional)
		} else {
			logger.info(`Socket ${socketId}: No matches found`)
		}
	}

	private _escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	}
}

const TCPClient = singleton(TCPClientWithProtocol)
export default new TCPClient()
