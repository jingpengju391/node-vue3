import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'

export enum ModelWindowKey {
	loadingWindow = 'loadingWindow',
	mainWindow = 'mainWindow',
	shotWindow = 'shotWindow'
}

export type ModelWindowType = {
	[key in ModelWindowKey]: BrowserWindow
}

export type WindowConfig = {
	sign: ModelWindowKey
	loadURL?: string
	loadFile?: string
	isOpenDevTools?: boolean
	callback?: (focusedWindow: BrowserWindow) => Promise<void>
	options: BrowserWindowConstructorOptions
}

export type SystemMemory = {
	totalMemory: number
	freeMemory: number
	usedMemory: number
	memoryUsagePercentage: string
}
