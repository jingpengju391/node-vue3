import { ElectronApi } from '@shared/index'
import { ipcRenderer } from 'electron'

const electronApi: ElectronApi = {
	send: (channel, data) => {
		ipcRenderer.send(channel, data)
	},
	receive: (channel, callback) => {
		ipcRenderer.on(channel, (_event, ...args) => callback(...args))
	},
	invoke: (channel, ...args) => {
		return ipcRenderer.invoke(channel, ...args)
	}
}

export default electronApi
