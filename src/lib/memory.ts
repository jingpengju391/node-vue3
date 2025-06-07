import path from 'path'
import fs from 'fs'
import { generateFullPathUsingRelativePath } from './file'
import { clearWorkOrderWithStatus } from '@server/index'

// Main entry function to clear disk space-related data
export async function clearDiskSpaceData(): Promise<void> {
	const { MAIN_VITE_LOGS_PATH, MAIN_VITE_LOGS_SUFFIX, MAIN_VITE_TEMP_FILE } = import.meta.env

	// Clear all work orders with status code 3
	await clearWorkOrderWithStatus(30)

	// Remove timeout log files
	clearTimeoutFilesByDirPath(generateFullPathUsingRelativePath(MAIN_VITE_LOGS_PATH), 14, filterLogWithTimeout, MAIN_VITE_LOGS_SUFFIX)

	// Delete the earliest temp folder that is not today
	const dirnames = getFolders()
	const earliest = getEarliestDate(dirnames)
	earliest && deleteFolder(generateFullPathUsingRelativePath(path.join(MAIN_VITE_TEMP_FILE, earliest)))
}

// Delete expired files from a directory based on a threshold and custom filter
function clearTimeoutFilesByDirPath(exePath: string, timeDate: number = 3, stringToDateTimestamp: (fileNames: string[], threshold: number, suffix?: string) => string[], suffix?: string): void {
	const thresholdTimestamp = getThresholdTimestamp(timeDate)
	const fileNames = getAllFileNamesWithoutExtensionsSync(exePath, suffix)
	const timeoutFiles = stringToDateTimestamp(fileNames, thresholdTimestamp, suffix)
	deleteFiles(timeoutFiles)
}

// Get timestamp (milliseconds) of "N days ago" from now
function getThresholdTimestamp(days: number): number {
	const nDaysInMillis = days * 24 * 60 * 60 * 1000
	return Date.now() - nDaysInMillis
}

// Recursively read all filenames (without extension) in a directory, filtered by suffix
function getAllFileNamesWithoutExtensionsSync(dirPath: string, suffix?: string): string[] {
	let fileNames: string[] = []
	logger.log(fs.existsSync(dirPath), 'fileNames')
	if (!fs.existsSync(dirPath)) return []

	const entries = fs.readdirSync(dirPath, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name)

		if (entry.isFile()) {
			if (suffix && path.extname(entry.name) !== suffix) continue
			const fileName = path.basename(entry.name, path.extname(entry.name))
			fileNames.push(fileName)
		} else if (entry.isDirectory()) {
			// Recursively fetch from subdirectories
			const nested = getAllFileNamesWithoutExtensionsSync(fullPath, suffix)
			fileNames = fileNames.concat(nested)
		}
	}

	return fileNames
}

// Filter out expired log files by comparing dates in filenames
function filterLogWithTimeout(fileNames: string[], thresholdTimestamp: number, suffix: string | undefined): string[] {
	return fileNames
		.filter((name) => {
			const [year, month, day] = name.split('-').map(Number)

			const monthStr = month.toString().padStart(2, '0')
			const dayStr = day.toString().padStart(2, '0')

			const formattedDateString = `${year}-${monthStr}-${dayStr}`
			const date = new Date(formattedDateString)

			// Check if file's date is older than the threshold
			return thresholdTimestamp - date.getTime() > 0
		})
		.map((name) => `${name}${suffix}`) // Append suffix to get full filename
}

// Delete a list of files by their names (assumes base directory is MAIN_VITE_LOGS_PATH)
function deleteFiles(fileNames: string[]): void {
	const { MAIN_VITE_LOGS_PATH } = import.meta.env
	for (const name of fileNames) {
		const filePath = generateFullPathUsingRelativePath(path.join(MAIN_VITE_LOGS_PATH, name))
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath)
		}
	}
}

// Get folder names in the MAIN_VITE_TEMP_FILE directory (non-recursive)
function getFolders(): string[] {
	const { MAIN_VITE_TEMP_FILE } = import.meta.env
	const dirPath = generateFullPathUsingRelativePath(MAIN_VITE_TEMP_FILE)

	return fs.readdirSync(dirPath).filter((item: string) => {
		const itemPath = path.join(dirPath, item)
		return fs.statSync(itemPath).isDirectory()
	})
}

// Return the earliest date (as string) in a list, excluding today's date
function getEarliestDate(dates: string[]): string | null {
	const today = new Date().toISOString().split('T')[0]

	const filteredDates = dates.filter((date) => date !== today)
	if (filteredDates.length === 0) return null

	filteredDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

	return filteredDates[0]
}

// Delete a folder (recursively), logging the result
function deleteFolder(folderPath: string): void {
	if (fs.existsSync(folderPath)) {
		fs.rmSync(folderPath, { recursive: true, force: true })
		logger.log(`Deleted folder: ${folderPath}`)
	} else {
		logger.warn(`Folder does not exist: ${folderPath}`)
	}
}
