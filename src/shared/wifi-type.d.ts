import 'node-wifi'

declare module 'node-wifi' {
	interface WiFiNetwork {
		isOpenNetwork: boolean
		password?: string
	}
}
