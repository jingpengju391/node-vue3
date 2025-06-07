import path from 'path'
import * as os from 'os'

export const resolvePath = (p: string) => path.resolve(__dirname, p)

export function getLocalIPAddress(): string {
	const interfaces = os.networkInterfaces()
	for (const iface in interfaces) {
		for (const alias of interfaces[iface]!) {
			if (alias.family === 'IPv4' && !alias.internal) {
				return alias.address
			}
		}
	}
	return '0.0.0.0'
}
