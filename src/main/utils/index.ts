import { screen } from 'electron'
import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import { isDev } from '@util/process'

const exec = promisify(execCallback)

export function getScreenSize() {
	const primaryDisplay = screen.getPrimaryDisplay()
	return primaryDisplay.workAreaSize
}

/**
 * Get the MAC address for a given IP.
 * @param ip - The target IP address.
 * @returns The MAC address as a string.
 */
export async function fetchMacAddress(ip: string): Promise<string> {
	try {
		const n = isDev ? 'n' : 'c'
		const l = isDev ? 'l' : 's'
		const a = isDev ? 'a' : 'n'

		await exec(`ping -${n} 1 -${l} 2 ${ip}`)

		const { stdout, stderr } = await exec(`arp -${a} ${ip}`)
		if (stderr) {
			throw new Error(stderr)
		}

		const macMatch = stdout.match(/([0-9a-fA-F]{2}([:-])[0-9a-fA-F]{2}(\2[0-9a-fA-F]{2}){4})/)
		if (!macMatch) {
			throw new Error('No MAC address found.')
		}

		return macMatch[0]
	} catch (error) {
		// Ensure error is typed correctly
		if (error instanceof Error) {
			throw new Error(`Failed to get MAC address: ${error.message} ${ip}`)
		}
		throw new Error('Unknown error occurred while getting MAC address.')
	}
}
