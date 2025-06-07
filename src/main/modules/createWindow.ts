import { BrowserWindow } from 'electron'
import { WindowConfig } from '@shared/dataModelTypes/windows'
import { addWindow } from '../configWindows'
import { isDev } from '@util/process'

export async function createWindow({ sign, loadFile, loadURL, options, isOpenDevTools = true, callback }: WindowConfig) {
	const focusedWindow = new BrowserWindow(options)

	callback && (await callback(focusedWindow))

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	handlerFocusedWindowLoadFile(focusedWindow, loadFile, loadURL)

	focusedWindow.once('ready-to-show', () => openDevTools(focusedWindow, isOpenDevTools))

	addWindow(sign, focusedWindow)
}

function openDevTools(focusedWindow: BrowserWindow, isOpenDevTools: boolean = false) {
	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	// code: -32601 about Autofill.enable wasn't found
	// see https://github.com/electron/electron/issues/41614#issuecomment-2006678760
	isDev && isOpenDevTools && focusedWindow.webContents.openDevTools({ mode: 'right' })
}

// pass loadFile, loadURL, and isDev all at once.
// meanwhile, this means that if no parameters are passed during the call,
// the function will not encounter any errors.
function handlerFocusedWindowLoadFile(focusedWindow: BrowserWindow, loadFile?: string, loadURL?: string) {
	if (isDev) {
		loadURL ? focusedWindow.loadURL(loadURL) : loadFile && focusedWindow.loadFile(loadFile)
	} else {
		loadFile ? focusedWindow.loadFile(loadFile) : loadURL && focusedWindow.loadURL(loadURL)
	}
}
