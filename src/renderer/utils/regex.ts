export const base64Regex = /^data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/]+={0,2}$/
export const regexIpPort = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:|：)([0-9]{1,5})$/
export const regexIp = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

export function extractIpPort(input: string): { ip: string; port: number } {
	const match = input.match(/^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)([:：](\d{1,5}))?$/)
	if (!match)
		return {
			ip: '',
			port: 8888
		}

	const [ipPortStr] = match
	const [ipPart, portStr] = ipPortStr.split(/:|：/)

	return {
		ip: ipPart,
		port: portStr ? Number(portStr) : 8888
	}
}

export function cleanIpcErrorMessage(error: Error): string {
	const match = error.message.match(/Error invoking remote method '[^']+': (?:Error:?\s*)?(.+)/)
	return match ? match[1].trim() : error.message
}
