import wifi from 'node-wifi'
import { execSync } from 'child_process'
import { readdirSync } from 'fs'
import { join } from 'path'
import { hasOwnProperty, quickSort, sleep } from '@util/index'
import { ExtendedConnectionOpts, WifiCSKey } from '@shared/dataModelTypes/socket'
import { isLinux, isMac } from '@util/process'

// Initialize the wifi module
wifi.init({
	iface: isLinux ? 'wlan0' : null // Network interface, if set to null, the system will automatically choose an interface
})

// Function to scan available Wi-Fi networks
export async function scanAvailableNetworks(): Promise<wifi.WiFiNetwork[]> {
	try {
		const uniqueNetworks: wifi.WiFiNetwork[] = []
		const seen = new Set()
		// Directly return the result of wifi.scan(), which already returns a promise
		const networks = await wifi.scan()

		networks.forEach((network) => {
			if (!seen.has(network.ssid)) {
				const ssid = isUtf8HexEncoded(network.ssid) ? decodeSSID(network.ssid) : network.ssid
				uniqueNetworks.push({
					...network,
					isOpenNetwork: !/^\s*(WPA2|WPA|WEP)/.test(network.security.toLocaleUpperCase()),
					ssid
				})
				seen.add(network.ssid)
			}
		})
		return uniqueNetworks
	} catch (error) {
		// More specific error handling, provide details about what went wrong
		throw new TypeError(`Error scanning Wi-Fi networks: ${error}`)
	}
}

// Function to connect to a specified Wi-Fi network
export async function connectAvailableWifi(param: ExtendedConnectionOpts): Promise<ExtendedConnectionOpts> {
	try {
		if (!hasOwnProperty(param, 'password') || !param.password) {
			const history = getWifiHistory().find((item) => item.name === param.ssid)
			param.password = history?.password || ''
		}
		if (!hasOwnProperty(param, 'password') || !param.password) {
			connectIgnorePassWord(param.ssid)
		} else {
			// Directly return the result of wifi.connect(), which already returns a promise
			await connectWifi(param as wifi.ConnectionOpts)
		}
		return await getConnectStatusAboutWifi()
	} catch (error) {
		// Provide more specific error details
		let MSG: WifiCSKey = 'PASSWORD_ERROR'
		if (!param.password) {
			MSG = 'PASSWORD_EMPTY'
		} else if (`Error connecting to Wi-Fi: ${error}`.includes('not find')) {
			MSG = 'NOT_FIND'
		} else if (`Error connecting to Wi-Fi: ${error}`.includes('data change')) {
			MSG = 'DATA_CHANGE'
		}
		throw MSG
	}
}

// Function to disconnect from the current Wi-Fi network
export async function connectWifi(param: wifi.ConnectionOpts): Promise<void> {
	try {
		if (isLinux) {
			const command = `sudo nmcli device wifi connect '${param.ssid}' password ${param.password} ifname wlan0`
			execSync(command, { encoding: 'utf8' })
		} else {
			// Directly return the result of wifi.disconnect(), which already returns a promise
			await wifi.connect(param as wifi.ConnectionOpts)
		}
	} catch (error) {
		// Provide more specific error details
		throw new TypeError(`Error disconnecting from Wi-Fi: ${error}`)
	}
}

// Function to disconnect from the current Wi-Fi network
export async function disconnectWifi(): Promise<void> {
	try {
		// Directly return the result of wifi.disconnect(), which already returns a promise
		if (isLinux) {
			const command = 'sudo nmcli device disconnect wlan0'
			execSync(command, { encoding: 'utf8' })
		} else {
			await wifi.disconnect()
		}
	} catch (error) {
		// Provide more specific error details
		throw new TypeError(`Error disconnecting from Wi-Fi: ${error}`)
	}
}

// Function to get the current Wi-Fi connections
export async function getCurrentConnections(): Promise<wifi.WiFiNetwork[]> {
	try {
		// Directly return the result of wifi.getCurrentConnections(), which already returns a promise
		const networks = await wifi.getCurrentConnections()
		return networks.map((network) => {
			const ssid = isUtf8HexEncoded(network.ssid) ? decodeSSID(network.ssid) : network.ssid
			return {
				...network,
				isOpenNetwork: !/^\s*(WPA2|WPA|WEP)/.test(network.security.toLocaleUpperCase()),
				ssid
			}
		})
	} catch (error) {
		// Provide more specific error details
		throw new TypeError(`Error getting current Wi-Fi connections: ${error}`)
	}
}

/**
 * Decodes a given string assumed to be in hexadecimal format into a UTF-8 string.
 * If the decoding fails, it returns the original string.
 * @param ssid - The string to decode.
 * @returns The decoded UTF-8 string or the original string if decoding fails.
 */
function decodeSSID(ssid: string) {
	try {
		// Convert the hexadecimal string to a buffer and decode it as UTF-8.
		return Buffer.from(ssid, 'hex').toString('utf8')
	} catch (error) {
		// Return the original string if decoding fails.
		return ssid
	}
}

/**
 * Checks whether a given string is a valid hexadecimal string.
 * @param str - The string to check.
 * @returns True if the string is a valid hexadecimal string, otherwise false.
 */
function isHexString(str: string) {
	// Check if the length of the string is even (a valid hex string must have even length).
	if (str.length % 2 !== 0) return false

	// Check if the string contains only valid hexadecimal characters.
	const hexRegex = /^[0-9a-fA-F]+$/
	return hexRegex.test(str)
}

/**
 * Checks if a given hexadecimal string is valid UTF-8 encoded data.
 * @param hexStr - The hexadecimal string to validate.
 * @returns True if the string can be decoded as valid UTF-8, otherwise false.
 */
function isValidUtf8(hexStr: string) {
	try {
		// Decode the hexadecimal string into a UTF-8 string.
		const decodedStr = Buffer.from(hexStr, 'hex').toString('utf8')

		// Dynamically construct the regex to avoid direct use of control characters.
		const unicodeRegex = new RegExp(`^[${String.fromCharCode(0)}-${String.fromCharCode(0xffff)}]*$`)

		// Check if the decoded string contains only valid Unicode characters.
		return unicodeRegex.test(decodedStr)
	} catch (error) {
		// Return false if decoding fails, indicating the string is not valid UTF-8.
		return false
	}
}

/**
 * Checks if a given string is a hexadecimal representation of a UTF-8 encoded string.
 * @param str - The string to check.
 * @returns True if the string is a UTF-8 encoded hexadecimal string, otherwise false.
 */
function isUtf8HexEncoded(str: string) {
	// Check if the string is a valid hexadecimal string and also valid UTF-8.
	return isHexString(str) && isValidUtf8(str)
}

/**
 * connect ignore passWord
 * @param {string} ssid - Wi-Fi ssid
 */
// Function to connect to a Wi-Fi network without requiring a password
function connectIgnorePassWord(ssid: string) {
	// Default command for Windows
	let command = `netsh wlan connect name="${ssid}"`

	// Modify command based on platform (macOS or Linux)
	switch (process.platform) {
		case 'darwin': // macOS command to find and return Wi-Fi password
			command = `security find-generic-password -D "AirPort network password" -a "${ssid}" -w`
			break
		case 'linux': // Linux command to connect to Wi-Fi using nmcli
			command = `sudo nmcli device wifi connect ${ssid} ifname wlan0`
			break
	}

	// Execute the appropriate command to connect to the Wi-Fi network
	execSync(command, { encoding: 'utf8' })
}

// Function to check the connection status of the Wi-Fi network
export async function getConnectStatusAboutWifi(): Promise<wifi.WiFiNetwork> {
	// Scan for available Wi-Fi networks
	const wifis = await scanAvailableNetworks()
	let attempt = 0
	const maxAttempts = 3 // Max number of attempts
	const baseDelay = 100 // Initial delay in milliseconds
	const maxDelay = 5000 // Maximum delay to prevent excessive wait time
	let wifi: wifi.WiFiNetwork | null = null

	// Retry logic to check current Wi-Fi connections
	while (!wifi && attempt <= maxAttempts) {
		// Calculate exponential backoff delay
		const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
		await sleep(delay)

		// Get the current Wi-Fi connections
		const ws = await getCurrentConnections()
		if (ws[0]) {
			// If a Wi-Fi connection is found, assign it
			wifi = ws[0]
		}
		attempt++ // Increment attempt count
	}

	// If no Wi-Fi connection is found, throw an error
	if (!wifi) {
		throw new TypeError(`not find`)
	}

	// Check if the found network matches any available network
	const findResult = wifis.find((item) => item.ssid === wifi.ssid && item.isOpenNetwork === wifi.isOpenNetwork)

	// If no matching network is found or there is a data change, throw an error
	if (!findResult) {
		throw new TypeError('data change')
	}

	// Return the current Wi-Fi connection information
	return wifi
}

/**
 * Retrieves the list of Wi-Fi networks saved on the system, based on the operating system.
 * - macOS: Uses `networksetup` to list preferred wireless networks.
 * - Linux: Reads Wi-Fi configurations from NetworkManager's system connections.
 * - Windows: Uses `netsh wlan show profiles` to retrieve saved Wi-Fi profiles.
 */
export const getWifiHistory = (function () {
	if (isMac) {
		// macOS implementation
		return (): { name: string; password: string }[] => {
			try {
				const command = 'sudo /usr/sbin/networksetup -listpreferredwirelessnetworks en0'
				const stdout = execSync(command, { encoding: 'utf8' })
				const wifiNames = stdout
					.split('\n')
					.slice(1)
					.map((line) => line.trim())
					.filter(Boolean)

				return wifiNames.map((name) => {
					try {
						const pw = execSync(`security find-generic-password -D "AirPort network password" -a "${name}" -gw`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
						return { name, password: pw }
					} catch {
						return { name, password: '' }
					}
				})
			} catch (error) {
				logger.error('Failed to retrieve Wi-Fi history on macOS:', error)
				return []
			}
		}
	} else if (isLinux) {
		// Linux implementation
		const path = '/etc/NetworkManager/system-connections/'

		return (): { name: string; password: string }[] => {
			try {
				const files = readdirSync(path).filter((f) => f.endsWith('.nmconnection'))

				return files.map((fileName) => {
					const fullPath = join(path, fileName)
					try {
						// 使用 sudo 读取内容（需要提前授权，或程序以 root 运行）
						const content = execSync(`sudo cat "${fullPath}"`, { encoding: 'utf8' })
						const ssidMatch = content.match(/^\s*ssid=(.+)$/m)
						const pskMatch = content.match(/^\s*psk=(.+)$/m)

						return {
							name: ssidMatch?.[1]?.trim() || fileName.replace('.nmconnection', ''),
							password: pskMatch?.[1]?.trim() || ''
						}
					} catch {
						return {
							name: fileName.replace('.nmconnection', ''),
							password: ''
						}
					}
				})
			} catch (error) {
				logger.error('Failed to retrieve Wi-Fi history on Linux:', error)
				return []
			}
		}
	} else {
		// Windows implementation
		return (): { name: string; password: string }[] => {
			try {
				const command = 'netsh wlan show profiles'
				const stdout = execSync(command, { encoding: 'utf8' })
				const wifiNames = stdout
					.split('\n')
					.map((line) => line.split(':')[1]?.trim())
					.filter(Boolean)

				return wifiNames.map((name) => {
					try {
						const detail = execSync(`netsh wlan show profile name="${name}" key=clear`, { encoding: 'utf8' })
						const pwLine = detail.split('\n').find((line) => line.toLowerCase().includes('key content'))

						const password = pwLine?.split(':')[1]?.trim() || ''
						return { name, password }
					} catch {
						return { name, password: '' }
					}
				})
			} catch (error) {
				logger.error('Failed to retrieve Wi-Fi history on Windows:', error)
				return []
			}
		}
	}
})()

export async function autoConnectAvailableWifi(connectWifi: wifi.WiFiNetwork | undefined, availableWifis: wifi.WiFiNetwork[]): Promise<wifi.WiFiNetwork | undefined> {
	// If there are no available WiFi networks or a WiFi connection already exists, exit the function
	if (!availableWifis.length || connectWifi) {
		return undefined
	}

	// Retrieve the list of previously connected WiFi networks from history
	const histories = getWifiHistory()

	// Create a Set of the WiFi SSIDs from the history for quick lookup
	const sethistoriy = new Set(histories.map((item) => item.name))

	// Find the intersection of available WiFi networks and WiFi networks from the history,
	// then sort them by quality in descending order
	const intersection = quickSort(
		availableWifis.filter((item) => sethistoriy.has(item.ssid)),
		'quality',
		true
	)

	if (!intersection.length) return undefined

	for (const iterator of intersection) {
		try {
			// Attempt to connect to the current WiFi network
			await connectAvailableWifi(iterator)
			return iterator // Exit the function if the connection is successful
		} catch (error) {
			// Ignore errors and continue to the next WiFi network
		}
	}

	return undefined
}
