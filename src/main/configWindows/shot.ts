import { ModelWindowKey, WindowConfig } from '@shared/dataModelTypes/windows'
import { join } from 'path'
import { shell } from 'electron'
import { getScreenSize } from '../utils'
import { getModelWindow } from '.'
import { isDev } from '@util/process'

export function shotWindow(): WindowConfig {
	const { width, height } = getScreenSize()
	const ratio = isDev ? 0.5 : 1
	return {
		sign: ModelWindowKey.shotWindow,
		loadURL: getLoadURL(),
		options: {
			width: width * ratio,
			height: height * ratio,
			x: 0,
			y: 0,
			show: false,
			frame: false,
			transparent: !isDev,
			webPreferences: {
				preload: join(__dirname, '../preload/index.js'),
				sandbox: false
			},
			parent: getModelWindow(ModelWindowKey.mainWindow)
		},
		callback: async (focusedWindow) => {
			focusedWindow.once('ready-to-show', () => {
				focusedWindow.setFullScreen(!isDev)
			})

			focusedWindow.webContents.setWindowOpenHandler((details) => {
				shell.openExternal(details.url)
				return { action: 'deny' }
			})

			focusedWindow.on('resize', () => {
				focusedWindow.webContents.send('window-change-resize')
			})
		}
	}
}

function getLoadURL(): string {
	if (isDev) {
		return `${process.env['ELECTRON_RENDERER_URL']}/#/shot`
	}
	return `file://${join(__dirname, '../renderer/index.html#shot')}`
}
