import { globalShortcut } from 'electron'
import { getModelWindow } from '../configWindows'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'

export function registerRenderProcessShortcutsHandlers() {
	globalShortcut.register('CommandOrControl+O', () => {
		const window = getModelWindow(ModelWindowKey.mainWindow)
		window?.webContents.openDevTools({ mode: 'detach' })
	})
}

export function unregisterRenderProcessShortcutsHandlers() {
	globalShortcut.unregisterAll()
}
