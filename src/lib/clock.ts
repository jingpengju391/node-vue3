import { execSync } from 'child_process'

export function synchronizeSystemClock(time: number | string): void {
	// Convert the input to a number and check if it's valid
	const timestamp = Number(time)

	// Check if the conversion to number is valid
	if (isNaN(timestamp)) {
		// Log an error message if invalid input is provided
		logger.error('Invalid input for time synchronization. Please provide a valid timestamp.')
		return
	}

	// Convert the valid timestamp to a Date object
	const inputTime = new Date(timestamp)

	// Adjust the time by adding 8 hours (assumed to be UTC to UTC+8 time zone)
	inputTime.setHours(inputTime.getHours() + 8)

	// Format the adjusted time to 'YYYY-MM-DD HH:mm:ss' format
	const formattedTime = inputTime.toISOString().slice(0, 19).replace('T', ' ')

	try {
		// Use the sudo command to synchronize the system clock
		execSync(`sudo date -s '${formattedTime}'`, { stdio: 'inherit' })

		// Log the success message
		logger.log(`System time successfully synchronized to: ${formattedTime}`)
	} catch (error) {
		// Handle any errors that occur during the execution of the command
		logger.error('Failed to synchronize the system clock:', error)
	}
}
