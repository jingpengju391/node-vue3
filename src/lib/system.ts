import os from 'os'
import { exec } from 'child_process'
import diskinfo from 'node-disk-info'
import { SystemMemory } from '@shared/dataModelTypes/windows'
import { sleep } from '@util/index'
import { isLinux, isWin } from '@util/process'

// Async function to get disk usage information
export async function getDiskUsage(): Promise<{ available: number; used: number }> {
	return new Promise((resolve, reject) => {
		;(async () => {
			try {
				// Get the disk layout information
				const disks = await diskinfo.getDiskInfo()
				// Iterate over all disks and calculate the usage
				let available = 0
				let used = 0
				// If the OS is Linux, we only consider the root disk
				if (isLinux) {
					const disk = disks.find((d) => d.mounted === '/')
					if (disk) {
						available = Number(disk.available ?? 0) * 1024 // Free space in bytes
						used = Number(disk.used ?? 0) * 1024 // Free space in bytes
					}
				} else {
					for (const disk of disks) {
						available += Number(disk.available ?? 0) // Free space in bytes
						used += Number(disk.used ?? 0) // Free space in bytes
					}
				}
				resolve({ available, used })
			} catch (error) {
				reject('Error getting disk usage: ' + (error as Error).message)
			}
		})()
	})
}

// Get the current CPU usage
export function getCpuUsage(): Promise<number> {
	return new Promise((resolve, reject) => {
		;(async () => {
			try {
				// Get the initial CPU times
				const start = getCpuTimes()

				// Wait for 100 milliseconds and then get the second CPU times
				await sleep(500)
				const end = getCpuTimes()

				// Calculate the difference in idle and total time
				const idle = end.idle - start.idle
				const total = end.total - start.total

				// CPU usage = (total time - idle time) / total time
				const cpuUsage = (1 - idle / total) * 100
				resolve(Math.round(cpuUsage))
			} catch (error) {
				reject('Error occurred while calculating CPU usage: ' + (error as Error).message)
			}
		})()
	})
}

// Get the CPU times (idle and total time)
function getCpuTimes(): { idle: number; total: number } {
	const cpus = os.cpus()
	let idle = 0
	let total = 0

	if (cpus.length === 0) {
		throw new Error('Failed to retrieve CPU information')
	}

	// Iterate through each CPU core and accumulate idle and total times
	cpus.forEach(function (cpu) {
		idle += cpu.times.idle
		total += Object.values(cpu.times).reduce(function (acc, time) {
			return acc + time
		}, 0)
	})

	return { idle, total }
}

// Async function to get memory usage information
export function getMemoryUsage(): Promise<SystemMemory> {
	return new Promise((resolve) => {
		// Get the total and free memory in bytes
		const totalMemory = os.totalmem() // Total memory in bytes
		const freeMemory = os.freemem() // Free memory in bytes

		// Calculate used memory
		const usedMemory = totalMemory - freeMemory

		// Calculate memory usage percentage
		const memoryUsagePercentage = (usedMemory / totalMemory) * 100

		// Resolve the promise with memory usage information in GB and percentage
		resolve({
			totalMemory, // Convert to GB and round to 2 decimal places
			freeMemory,
			usedMemory,
			memoryUsagePercentage: memoryUsagePercentage.toFixed(2) // Round the percentage to 2 decimal places
		})
	})
}

/**
 * Get the Bluetooth device name (Windows & Linux).
 * @returns {Promise<string>} Bluetooth device name or an empty string if not found.
 */
export function getBluetoothName(): Promise<string> {
	return new Promise((resolve) => {
		const platform = os.platform()

		let command: string
		if (isWin) {
			command = `chcp 65001 & wmic path Win32_PnPEntity where "PNPClass='Bluetooth'" get Name`
		} else if (isLinux) {
			command = 'hciconfig -a'
		} else {
			logger.warn('Unsupported OS for Bluetooth detection.')
			return resolve('')
		}

		exec(command, (error, stdout, stderr) => {
			if (error) {
				logger.error(`Error executing command: ${error.message}`)
				return resolve('')
			}
			if (stderr) {
				logger.warn(`Command returned an error: ${stderr}`)
			}

			logger.log(`Command output:\n${stdout}`)

			if (platform === 'win32') {
				// Windows: Extract Bluetooth name from command output
				const lines = stdout.split('\n').filter((line) => line.trim() && !line.includes('Name'))
				if (lines.length > 0) {
					return resolve(lines[0].trim())
				}
			} else if (platform === 'linux') {
				// Linux: Extract Bluetooth name using regex
				const match = stdout.match(/Name:\s*(.+)/)
				if (match) {
					return resolve(match[1].trim().replace(/^['"]|['"]$/g, ''))
				}
			}

			resolve('') // Return empty string if name not found
		})
	})
}
