import wifi from 'node-wifi'

export enum NetWorkScript {
	cmdialup = 'cm-dial-up',
	wapiweb = 'wapi_web'
}

export enum NetWorkType {
	usb0 = 'usb0',
	tun0 = 'tun0'
}

export enum NetTypeMapPort {
	usb0 = 9889,
	tun0 = 9890,
	blueTooth = 9888,

	pot = 9891
}

export enum SignalType {
	mobile = '5G status',
	wapi = 'wapi status'
}

export enum WifiConnectStatus {
	connected = '已连接',
	connecting = '输入秘钥'
}

export enum WifiIsOpen {
	isOpen = '开放网络',
	notOpen = '非开放网络'
}

export const WifiCS = {
	NOT_FIND: { code: 501, message: '网络不在服务区内' },
	DATA_CHANGE: { code: 502, message: '自上次连接后，某些信息已更改，我们还需要一些信息才能完成连接' },
	PASSWORD_ERROR: { code: 503, message: '密码错误' },
	PASSWORD_EMPTY: { code: 504, message: '密码为空' },
	SUCCESS: { code: 200, message: '连接成功' }
} as const

export type WifiCSKey = keyof typeof WifiCS

export type WifiCSCode = (typeof WifiCS)[keyof typeof WifiCS]['code']

export type ExtendedConnectionOpts = Omit<wifi.ConnectionOpts, 'password'> & {
	password?: string
	isOpenNetwork?: boolean
}

export type NetWorkData = {
	csq: string
	hardwareType: string
	simCardNum?: string
	mobile?: string
	vpnCard?: string
	softwareVersion?: string
	name?: NetWorkScript.cmdialup | NetWorkScript.wapiweb
	freq?: string
	WAPI1MAC?: string
	WAPI2MAC?: string
	softwareVerion?: string
}

export type NetWorkInformation = {
	cmd: string
	seq: string
	data: NetWorkData
}

export type OrcResult = {
	data: {
		ocrResult: string
	}
}

export type BlueToothData = {
	[propName: string]: string
}

export type BlueTooth = {
	cmd: string
	seq: string
	data: BlueToothData
}

export type AvailableWifi = {
	currentConnection: wifi.WiFiNetwork | undefined
	availableWifiList: wifi.WiFiNetwork[]
}

export type T95Information = {}

export type DMSInformation = {}

export type SocketInformation = NetWorkInformation | T95Information | DMSInformation
