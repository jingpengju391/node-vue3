import { ModelWindowKey, WindowConfig } from '@shared/dataModelTypes/windows'
import { join } from 'path'
import { shell } from 'electron'
import icon from '../../../resources/icon.png?asset'
import { initWorkspaceBeforeCreateMainWindow, initServerAfterCreateMainWindow } from '../modules/initDataBeforeCreateWindow'
import { isMac } from '@util/process'

export function mainWindow(): WindowConfig {
	return {
		sign: ModelWindowKey.mainWindow,
		loadURL: process.env['ELECTRON_RENDERER_URL'],
		loadFile: join(__dirname, '../renderer/index.html'),
		options: {
			width: 0,
			height: 0,
			x: -100,
			y: 0,
			show: false,
			frame: isMac,
			autoHideMenuBar: true,
			...(process.platform === 'linux' ? { icon } : {}),
			webPreferences: {
				preload: join(__dirname, '../preload/index.js'),
				sandbox: false,
				nodeIntegration: false,
				contextIsolation: true,
				spellcheck: false,
				webSecurity: false
			}
		},
		callback: async (focusedWindow) => {
			await initWorkspaceBeforeCreateMainWindow()
			// focusedWindow.setMinimumSize(width, height)
			focusedWindow.once('ready-to-show', () => {
				// const loadingWindow = getModelWindow(ModelWindowKey.loadingWindow)
				// loadingWindow?.hide()
				// loadingWindow?.close()
				focusedWindow.show()
				initServerAfterCreateMainWindow()
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
