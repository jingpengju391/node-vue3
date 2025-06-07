import { IOpenDialogWithBuffersReturnValue } from '@shared/dataModelTypes/WorkOrder'
import { ITerminable, toTerminable } from '@shared/terminable'
import Electron, { dialog, BrowserWindow } from 'electron'
import fs from 'fs'

export default class DialogService {
	// Ensures the value is false during initialization to prevent concurrent dialogs
	static #isDialogShowing = false

	// Displays the file selection dialog, supports selecting multiple files
	static async showOpenWorkspaceDialog(): Promise<IOpenDialogWithBuffersReturnValue> {
		// Locking mechanism to prevent multiple dialogs from showing at once
		const dialogLock = this.#requestSingleDialogLock()
		if (!dialogLock) {
			logger.log('A dialog is already or will be showing')
			return { canceled: true, filePaths: [], fileBuffers: [] }
		}

		// Get the currently focused window for the dialog to open in
		const currentWindow = BrowserWindow.getFocusedWindow()

		try {
			// Configure the dialog options to allow selecting multiple files
			const dialogOptions: Electron.OpenDialogOptions = {
				title: 'Select Files', // Dialog title
				properties: ['openFile', 'multiSelections'] // Allow multiple files to be selected
			}

			// Show the dialog in the current window, if it exists
			const result = currentWindow ? await dialog.showOpenDialog(currentWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions)

			// Log the dialog result for debugging purposes
			logger.log('Dialog result:', result)

			// If files are selected, return the file paths and binary data
			if (!result.canceled) {
				let filePaths = result.filePaths

				// Enforce the limit of selecting at most 2 files
				if (filePaths.length > 2) {
					logger.warn('You can only select up to 2 files. Limiting to first 2 files.')
					filePaths = filePaths.slice(0, 2) // Limit to first 2 files
				}

				// Convert selected files to binary data
				const { sortedPaths, sortedBuffers } = await this.convertFilesToBinary(filePaths)
				return { canceled: false, filePaths: sortedPaths, fileBuffers: sortedBuffers }
			} else {
				// If no files were selected, return canceled state
				return { canceled: true, filePaths: [], fileBuffers: [] }
			}
		} catch (error) {
			// Log any errors that occur while opening the dialog
			logger.error('Failed to open dialog:', error)
			return { canceled: true, filePaths: [], fileBuffers: [] }
		} finally {
			// Ensure that the lock is released once the dialog has completed
			dialogLock.terminate()
		}
	}

	// Requests a lock to ensure that only one dialog is shown at a time
	static #requestSingleDialogLock(): ITerminable | undefined {
		if (this.#isDialogShowing) return undefined
		this.#isDialogShowing = true
		return toTerminable(() => {
			this.#isDialogShowing = false
		})
	}

	// Converts the selected file paths to binary data (Buffer), sorted by file size (ascending)
	static async convertFilesToBinary(filePaths: string[]): Promise<{ sortedPaths: string[]; sortedBuffers: Buffer[] }> {
		try {
			// Read all files and gather their sizes and buffers
			const fileData = await Promise.all(
				filePaths.map(async (filePath) => {
					const stat = await fs.promises.stat(filePath)
					const buffer = await fs.promises.readFile(filePath)
					return { filePath, buffer, size: stat.size }
				})
			)

			// Sort by file size (ascending)
			fileData.sort((a, b) => a.size - b.size)

			// Separate into arrays
			const sortedPaths = fileData.map((f) => f.filePath)
			const sortedBuffers = fileData.map((f) => f.buffer)

			return { sortedPaths, sortedBuffers }
		} catch (error) {
			logger.error('Failed to read and sort files by size:', error)
			return { sortedPaths: [], sortedBuffers: [] }
		}
	}
}
