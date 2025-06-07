import mqtt, { IClientPublishOptions } from 'mqtt'
import { EventEmitter } from 'events'
import { singleton, sleep } from '@util/index'
import { ResponseResultMessage } from '@shared/dataModelTypes/mqtt'
import { BrowserWindow } from 'electron'
import { isDev } from '@util/process'

type HeartbeatTimeout = 3000 | 15000

// Type definition for TCPMqtt object
type TCPMqtt = {
	mqtt: mqtt.MqttClient | null // The current MQTT client (TCP socket)
	status: 0 | 1 // Connection status: 0 means no client, 1 means connected
	heartbeatTimeout: HeartbeatTimeout // Interval for sending heartbeat packets
	host: string // The server's host address
	port: number // The server's port number
	reClient: boolean // Whether reconnection is required
	disconnected: boolean
	subscribedTopics: Map<string, Map<string, ResponseResultMessage | undefined>>
	options: mqtt.IClientOptions | undefined
	handleMqtt: (mqtt: mqtt.MqttClient | null) => void // Handle TCP socket
	handleStatus: (status: 0 | 1) => void // Handle connection status
	handleHeartbeatTimeout: (heartbeatTimeout: HeartbeatTimeout) => void // Handle heartbeat timeout
	handleReClient: (reClient: boolean) => void // Handle reconnection flag
	handleDisconnected: (disconnected: boolean) => void
	hasSubscribed: (topic: string) => boolean
	addSubscribed: (topic: string, message: ResponseResultMessage | undefined) => void
	getSubscribedMessage: (topic: string) => ResponseResultMessage | undefined
	clearSubscribedMessage: (topic: string) => void
}

class TCPMqttClass implements TCPMqtt {
	mqtt: mqtt.MqttClient | null // The current MQTT client (TCP socket)
	status: 0 | 1
	heartbeatTimeout: HeartbeatTimeout
	host: string
	port: number
	reClient: boolean
	disconnected: boolean
	subscribedTopics: Map<string, Map<string, ResponseResultMessage | undefined>>
	options: mqtt.IClientOptions | undefined
	// Constructor to initialize the TCPMqtt instance
	constructor(host: string, port: number, mqtt?: mqtt.MqttClient, options?: mqtt.IClientOptions, status?: 0 | 1, heartbeatTimeout?: HeartbeatTimeout, reClient?: boolean) {
		this.mqtt = mqtt ?? null // Initialize socket, default to null
		this.status = status ?? 0 // Default status to 0 (not connected)
		this.heartbeatTimeout = heartbeatTimeout ?? 3000 // Default heartbeat timeout to 3000ms
		this.host = host ?? null // Initialize host address
		this.port = port ?? null // Initialize port number
		this.reClient = !!reClient // Initialize reconnection flag
		this.disconnected = true
		this.subscribedTopics = new Map()
		this.options = options
	}

	// Handle updates to the MQTT client instance
	handleMqtt(mqtt: mqtt.MqttClient | null) {
		this.mqtt = mqtt // Update the socket instance
	}

	// Handle updates to the connection status
	handleStatus(status: 0 | 1) {
		this.status = status // Update the connection status
	}

	// Handle updates to the heartbeat timeout interval
	handleHeartbeatTimeout(heartbeatTimeout: HeartbeatTimeout) {
		this.heartbeatTimeout = heartbeatTimeout // Update the heartbeat timeout
	}

	// Handle the reconnection flag
	handleReClient(reClient: boolean) {
		this.reClient = reClient // Update the reconnection flag
	}

	// Handle the reconnection flag
	handleDisconnected(disconnected: boolean) {
		this.disconnected = disconnected // Update the reconnection flag
	}

	hasSubscribed(topic: string) {
		const ip = `${this.host}:${this.port}`
		return this.subscribedTopics.get(ip)?.has(topic) ?? false
	}

	addSubscribed(topic: string, message: ResponseResultMessage | undefined = undefined) {
		const ip = `${this.host}:${this.port}`
		const mqttMap = this.subscribedTopics.get(ip)

		if (!mqttMap) {
			this.subscribedTopics.set(ip, new Map([[topic, message]]))
		} else {
			const topicMap = mqttMap.get(topic)
			if (!topicMap) {
				mqttMap.set(topic, message)
			}
		}
	}

	getSubscribedMessage(topic: string) {
		const ip = `${this.host}:${this.port}`
		const mqttMap = this.subscribedTopics.get(ip)
		return mqttMap?.get(topic)
	}

	clearSubscribedMessage(topic: string) {
		const ip = `${this.host}:${this.port}`
		const mqttMap = this.subscribedTopics.get(ip)
		mqttMap?.set(topic, undefined)
	}
}

// MQTT Client with Protocol Management (Heartbeat, Reconnection, etc.)
class MqttClientWithProtocol extends EventEmitter {
	private mqtts: Map<string, TCPMqtt> // Store multiple TCP MQTT connections
	private heartbeatIntervals: Map<string, NodeJS.Timeout | null> // Store heartbeat intervals for each socket
	private readonly reconnectTimeout: number // Interval for automatic reconnection
	private window: BrowserWindow | undefined
	constructor() {
		super()
		this.mqtts = new Map() // Initialize the map for storing TCP MQTT clients
		this.heartbeatIntervals = new Map() // Initialize heartbeat intervals map
		this.reconnectTimeout = 5000 // Set the automatic reconnection interval to 5 seconds
	}

	// Connect to the server and create an MQTT client
	public connect(host: string, port: number, options: mqtt.IClientOptions = {}, window: BrowserWindow | undefined, protocol: string = 'tcp', suffix: string = ''): void {
		this.window = window
		const os = { reconnectPeriod: 0, ...options, clear: false }
		const ip = `${host}:${port}` // Generate a unique socket ID based on host and port
		const client = mqtt.connect(`${protocol}://${ip}${suffix}`, os) // Connect to MQTT broker
		this.mqtts.set(ip, new TCPMqttClass(host, port, client, os)) // Store the new MQTT client
		this.heartbeatIntervals[ip] = null // Initialize heartbeat interval for this socket
		this._setupListeners(ip) // Set up event listeners for this socket
	}

	// Disconnect from the server and remove the MQTT client
	public disconnect(host: string, port: number): void {
		const ip = `${host}:${port}` // Generate unique IP for the connection
		const tcp_mptt = this.mqtts.get(ip) // Get the existing TCP MQTT instance
		if (tcp_mptt?.mqtt) {
			tcp_mptt?.mqtt.removeAllListeners()
			tcp_mptt?.mqtt.end(true, () => {
				// End the connection gracefully
				this.mqtts.delete(ip) // Remove the socket instance from the map
				logger.log(`Disconnected from ${host}:${port}`) // Log disconnection
				this.emit('disconnect') // Emit the 'disconnect' event
			})
		}
	}

	// Disconnect all from the server and remove the MQTT client
	public disconnectAll(): void {
		this.removeAllListeners()
		const iterator = this.mqtts.entries()
		let result = iterator.next()
		while (!result.done) {
			const [key] = result.value
			const [host, port] = key.split(':')
			this.disconnect(host, Number(port))
			result = iterator.next()
		}
	}

	// Publish a message to a topic
	public publish<T>(
		host: string,
		port: number,
		topic: string,
		message: T,
		requestConfig?: { topic: string; loadText: string; callback?: (res: { code: number; msg: string }) => void },
		retries: number = 3,
		qos?: IClientPublishOptions['qos']
	): void {
		const networkStore = global.network
		if (!isDev) {
			if (!networkStore || networkStore?.data?.csq?.toString() === '0') {
				throw Error('Request cancelled by transformRequest: no network')
			}
		}
		logger.log(`to publish topic: ${topic}:`, message)
		const ip = `${host}:${port}` // Unique identifier for the connection
		const mqttMap = this.mqtts.get(ip)
		const mqtt = mqttMap?.mqtt // Get the corresponding MQTT client
		if (mqtt && !mqttMap?.disconnected) {
			if (requestConfig) {
				retries === 3 &&
					this.window?.webContents.send('mqtt:loading', {
						loadText: requestConfig.loadText,
						val: true,
						result: 2
					})
				mqttMap.addSubscribed(topic, undefined)
				this.subscribe(host, port, requestConfig.topic, (res) => {
					mqttMap.addSubscribed(topic, res)
					this.window?.webContents.send('mqtt:loading', {
						loadText: requestConfig.loadText,
						val: false,
						result: res.param.result === 'OK' ? 1 : 2
					})
					requestConfig.callback &&
						requestConfig.callback({
							code: res.param.result === 'OK' ? 200 : 501,
							msg: res.param.result === 'OK' ? '成功' : '失败'
						})
				})
			}

			mqtt.publish(topic, JSON.stringify(message), { qos: qos || 0 }, async (err) => {
				// Publish the message
				if (err) {
					logger.log(`to publish topic err: ${topic}`, err)
					if (retries <= 0) {
						if (requestConfig) {
							this.window?.webContents.send('mqtt:loading', {
								loadText: requestConfig?.loadText,
								val: false,
								result: 2
							})
							requestConfig.callback &&
								requestConfig.callback({
									code: 503,
									msg: `发布错误`
								})
						}
						throw new Error(`${topic}: Publish failed`)
					}
					this.publish(host, port, topic, message, requestConfig, retries - 1) // Retry if failed
				} else {
					if (retries <= 0) {
						if (requestConfig) {
							this.window?.webContents.send('mqtt:loading', {
								loadText: requestConfig?.loadText,
								val: false,
								result: 2
							})
							requestConfig.callback &&
								requestConfig.callback({
									code: 502,
									msg: `重试3次，工具箱未响应！`
								})
						}

						throw new Error(`${topic}: Publish failed`)
					}
					await sleep(this.reconnectTimeout)
					!mqttMap.getSubscribedMessage(topic) && requestConfig && this.publish(host, port, topic, message, requestConfig, retries - 1) // Retry if failed
				}
			})
		} else {
			const { MAIN_VITE_SETUP_MQTT_WAPI_PORT, MAIN_VITE_SETUP_MQTT_WAPI_HOST } = import.meta.env
			this.window?.webContents.send('mqtt:loading', {
				loadText: '',
				val: false,
				result: 2,
				message: ip === `${MAIN_VITE_SETUP_MQTT_WAPI_HOST}:${MAIN_VITE_SETUP_MQTT_WAPI_PORT}` ? '指令下发失败，请检查网络配置！' : '网络未连接，点击状态栏选择要连接的网络。'
			})
		}
	}

	// Subscribe to a topic
	public subscribe(host: string, port: number, topic: string, callback?: (message: ResponseResultMessage) => void, retries: number = 3): void {
		const ip = `${host}:${port}` // Unique identifier for the connection
		const mqttClass = this.mqtts.get(ip)
		const mqtt = mqttClass?.mqtt // Get the corresponding MQTT client
		if (mqtt && !mqttClass?.hasSubscribed(topic)) {
			logger.log(`to subscribe topic: ${topic}`)
			mqtt.subscribe(topic, { qos: 0 }, (err, _granted) => {
				// Subscribe to the topic
				if (err) {
					logger.log(`to subscribe topic err: ${topic}`, err)
					if (retries <= 0) {
						throw new Error(`${topic}: Subscription failed`)
					}
					this.subscribe(host, port, topic, callback, retries - 1) // Retry if failed
				} else {
					mqttClass.addSubscribed(topic, undefined)
					mqtt.on('message', (receivedTopic, payload) => {
						const message = JSON.parse(payload.toString())
						// Handle incoming messages
						if (receivedTopic === topic) {
							if (callback) {
								logger.log(`receive response topic: ${topic} message:`, message)
								callback(message)
							} else {
								logger.log(`receive topic: ${topic} message:`, message)
								this.emit('message', {
									payload: message,
									topic
								}) // Emit the 'message' event
							}
						}
					})
				}
			})
		}
	}

	public unsubscribe(host: string, port: number, topic: string, retries: number = 3, callback?: () => void) {
		const ip = `${host}:${port}` // Unique identifier for the connection
		const mqtt = this.mqtts.get(ip)?.mqtt // Get the corresponding MQTT client
		if (mqtt && !mqtt.disconnected) {
			mqtt.unsubscribe(topic, (err) => {
				if (err) {
					logger.log(`to unsubscribe topic err: ${topic}`, err)
					if (retries <= 0) {
						throw new Error(`${topic}: unSubscription failed`)
					}
					this.unsubscribe(host, port, topic, retries - 1, callback) // Retry if failed
				} else {
					callback && callback()
				}
			})
		}
	}

	// Set up listeners for connection, error, and disconnection events
	private _setupListeners(ip: string): void {
		const mqtt = this.mqtts.get(ip)
		const client = mqtt?.mqtt
		if (client) {
			client.on('connect', () => {
				logger.log(`connected: ${ip}`)
				const [host, port] = ip.split(':')
				this.emit('connect', { host, port: Number(port) }) // Emit the 'connect' event when connection is successful

				mqtt?.handleDisconnected(false)
			})
			client.on('error', async (err: Error) => {
				mqtt?.handleDisconnected(true)
				this._debouncedReconnection(ip, err) // Handle reconnection in case of an error
			})
			client.on('close', () => {
				mqtt?.handleDisconnected(true)
				this._debouncedReconnection(ip) // Handle reconnection if connection is closed
			})
		}
	}

	// Debounced version of reconnection process
	private _debouncedReconnection = this._debounceQueue((ip: string, err?: Error) => {
		logger[err ? 'error' : 'info'](`MQTT ${err ? 'error' : 'info'} at ${ip}`, err) // Log error if socket encounters an error
		this._handleReconnection(ip)
	})

	// Handle automatic reconnection after an error or close event
	private async _handleReconnection(ip: string): Promise<void> {
		this.emit('disconnect', ip) // Emit disconnect event for this connection
		const tcp_mptt = this.mqtts.get(ip) // Get the existing TCP MQTT instance
		if (tcp_mptt?.reClient || !tcp_mptt?.mqtt || tcp_mptt?.mqtt.connected) return // Avoid reconnecting if already marked for reconnection
		tcp_mptt.handleReClient(true) // Set the reconnection flag to true
		await sleep(this.reconnectTimeout) // Wait for the reconnect timeout
		logger.log(`Attempting to reconnect to ${tcp_mptt.host}:${tcp_mptt.port}...`) // Log reconnection attempt
		this.connect(tcp_mptt.host, tcp_mptt.port, tcp_mptt.options, this.window) // Attempt reconnection
		tcp_mptt.handleReClient(false) // Reset the reconnection flag after reconnecting
	}

	// Helper function to debounce reconnection attempts
	private _debounceQueue<T extends (...args: any[]) => void>(fn: T, delay: number = 600): (...args: Parameters<T>) => void {
		const timers = new Map<string, NodeJS.Timeout>() // Store timers for each unique argument set

		// Generate a unique key based on the arguments
		const getKey = (args: Parameters<T>): string => JSON.stringify(args)

		return (...args: Parameters<T>): void => {
			const key = getKey(args) // Serialize arguments to create a unique key

			// Clear any existing timer for the same key
			if (timers.has(key)) clearTimeout(timers.get(key)!)

			// Set a new timer for the current key
			timers.set(
				key,
				setTimeout(() => {
					fn(...args) // Invoke the target function
					timers.delete(key) // Remove the timer after execution
				}, delay)
			)
		}
	}
}

// Singleton instance of MqttClientWithProtocol
const MqttClient = singleton(MqttClientWithProtocol)
export default new MqttClient()
