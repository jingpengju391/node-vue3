import { isDev } from '@util/process'
import { app } from 'electron'
import { exec } from 'child_process'

export default function () {
	return new Promise((resolve, reject) => {
		// If in development mode, exit the function as no further action is needed
		if (isDev) resolve(true)

		// Construct the process name using the application name, version, and architecture
		const names = [app.getName(), app.getVersion(), process.arch]
		const command = `ps -ef | grep ${names.join('-')}.AppImage | grep -v grep | awk '{print $2}'`

		// Execute the command asynchronously
		exec(command, (error, stdout, _stderr) => {
			if (error) {
				// Log the command and the error details for debugging
				logger.verbose(`kill ${names.join('-')}.AppImage command: ${command}`)
				logger.error(`kill ${names.join('-')}.AppImage : ${error.message}`)
				reject(error)
				return
			}

			// Trim the output to remove any extra spaces or newlines
			const trimmedOutput = stdout.trim()

			// If no PID is found, log an error
			if (!trimmedOutput) {
				logger.verbose(`kill ${names.join('-')}.AppImage command: ${command}`)
				logger.error(`kill ${names.join('-')}.AppImage : PID not found`)
				reject(trimmedOutput)
				return
			}

			// Parse the PID from the command output
			const pid = parseInt(trimmedOutput, 10)

			// If the parsed PID is not a valid number, log an error
			if (isNaN(pid)) {
				logger.verbose(`kill ${names.join('-')}.AppImage command: ${command}`)
				logger.error(`kill ${names.join('-')}.AppImage : Failed to parse PID`)
				reject('pid not number')
				return
			}

			// Construct the kill command to terminate the process
			const killCommand = `kill -9 ${pid}`
			exec(killCommand, (killError) => {
				if (killError) {
					logger.error(`kill ${names.join('-')}.AppImage : Failed to kill process - ${killError.message}`)
					reject(`kill ${names.join('-')}.AppImage : Failed to kill process - ${killError.message}`)
				} else {
					logger.info(`kill ${names.join('-')}.AppImage : success`)
					resolve(true)
				}
			})
		})
	})
}
