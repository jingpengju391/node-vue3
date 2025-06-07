import { BrowserWindow } from 'electron'
import { ElectronApi } from '.'
import type { Api } from './dataModelTypes/api'
import { ModelWindowKey } from './dataModelTypes/windows'
import Logger from 'electron-log'

declare global {
	interface Window {
		electron: ElectronApi
		api: Api
	}

	interface Global {
		modelWindow: Map<ModelWindowKey, BrowserWindow>
	}

	var logger: Logger
}
