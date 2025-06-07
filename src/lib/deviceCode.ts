import { generateFullPathUsingRelativePath } from './file'
import { readFileSync } from 'fs'

// Function to retrieve device codes from a file and return them as a map of key-value pairs.
export function parseDeviceCodeFile(): { [propName: string]: string } {
	// Initialize an empty object to store the key-value pairs
	const codeMap: { [propName: string]: string } = {}

	try {
		// Retrieve the environment variables for device code and suffix
		const { VITE_DEVICECODE, VITE_DEVICECODE_SUFFIX } = import.meta.env

		// Generate the full file path using the relative path
		const deviceCodeFilePath = generateFullPathUsingRelativePath(`${VITE_DEVICECODE}${VITE_DEVICECODE_SUFFIX}`)

		// Read the content of the file as a UTF-8 string
		const fileData = readFileSync(deviceCodeFilePath, 'utf8')

		// Split the file content into lines
		const lines = fileData.split('\n')

		// Iterate through each line to extract key-value pairs
		for (const line of lines) {
			// Skip empty lines
			if (line.trim() === '') continue

			// Find the index of the colon that separates the key and value
			const colonIndex = line.indexOf(':')

			// If the line contains a colon, it's considered a valid key-value pair
			if (colonIndex !== -1) {
				// Extract the key and value, trimming any extra spaces
				const key = line.substring(0, colonIndex).trim()
				const value = line.substring(colonIndex + 1).trim()

				// Add the key-value pair to the codeMap object
				codeMap[key] = value
			} else {
				// Log a warning if the line is not in the expected format (missing colon)
				logger.warn(`Skipping invalid line (missing colon): ${line}`)
			}
		}
	} catch (error) {
		// Log an error if there is an issue reading the file or processing the lines
		logger.error('Error reading device code file:', error)
	}

	// Return the map of key-value pairs
	return codeMap
}
