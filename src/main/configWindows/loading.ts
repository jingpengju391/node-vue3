import { ModelWindowKey, WindowConfig } from '@shared/dataModelTypes/windows'
import { join } from 'path'

export function loadingWindow(): WindowConfig {
	return {
		sign: ModelWindowKey.loadingWindow,
		loadFile: join(__dirname, '../../public/loading.html'),
		options: {
			width: 350,
			height: 350,
			show: false,
			frame: false,
			transparent: true,
			// backgroundColor: 'rgba(0, 0, 0, 0)',
			hasShadow: false,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
				spellcheck: false,
				devTools: false
			}
		},
		isOpenDevTools: false,
		callback: async (focusedWindow) => {
			focusedWindow.on('ready-to-show', () => {
				focusedWindow.show()
			})
		}
	}
}
