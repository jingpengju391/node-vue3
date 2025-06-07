import { isDev } from '@util/process'
import { app } from 'electron'
import { execSync } from 'child_process'

export default function () {
	// If in development mode, exit the function as no further action is needed
	if (isDev) return

	// Construct the process name using the application name, version, and architecture
	const names = [app.getName(), app.getVersion(), process.arch]
	const command = `ps -ef | grep ${names.join('-')}.AppImage | grep -v grep | awk '{print $2}'`
	// Now kill all bluetooth_server related processes
	const bluetoothCommand = "ps aux | grep bluetooth_server | grep -v grep | awk '{print $2}'"
	logger.log('start kill app process')
	try {
		// Execute the command asynchronously
		const stdout = execSync(command)
		const bluetoothStdout = execSync(bluetoothCommand)

		// Trim the output to remove any extra spaces or newlines
		const trimmedOutput = stdout?.toString()?.trim()
		logger.log(`trimmed output: ${trimmedOutput}`)
		// Parse the output to get all PIDs
		const bluetoothPids = bluetoothStdout.toString().trim().split('\n')
		logger.log(`trimmed output: ${bluetoothPids}`)

		if (bluetoothPids.length > 0) {
			bluetoothPids.forEach((pid) => {
				if (pid) {
					const killBluetoothCommand = `sudo kill -9 ${pid}`
					execSync(killBluetoothCommand, { stdio: 'inherit' })
					logger.log(`Killed bluetooth_server process with PID: ${pid}`)
				}
			})
		}

		// If no PID is found, log an error
		if (!trimmedOutput) {
			logger.log(`kill ${names.join('-')}.AppImage : PID not found`)
			return
		}

		// Parse the PID from the command output
		const pid = parseInt(trimmedOutput)
		logger.log(`kill pid:${pid}`)
		// If the parsed PID is not a valid number, log an error
		if (isNaN(pid)) {
			logger.log(`kill ${names.join('-')}.AppImage : Failed to parse PID`)
			return
		}

		// Construct the kill command to terminate the process
		const killCommand = `kill -9 ${pid}`
		execSync(killCommand, { stdio: 'inherit' })
		logger.log('info', `kill process end`)
	} catch (error) {
		logger.error(error)
	}
}
