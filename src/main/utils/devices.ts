import { NetTypeMapPort, NetWorkType } from '@shared/dataModelTypes/socket'

interface NetLocalConfig {
	host: string
	port: number
}

export const netfg = {
	host: '127.0.0.1',
	port: NetTypeMapPort[NetWorkType.tun0]
}

export const netwapi = {
	host: '127.0.0.1',
	port: NetTypeMapPort[NetWorkType.usb0]
}

export const blueTooth = {
	host: '127.0.0.1',
	port: NetTypeMapPort.blueTooth
}

export default [blueTooth] as NetLocalConfig[]
