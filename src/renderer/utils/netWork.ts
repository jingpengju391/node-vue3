export function getNetWorkInfo(): NetworkInformationMode {
	return {
		type: navigator.onLine ? navigator.connection?.effectiveType || '无服务' : '无服务',
		rtt: navigator.onLine ? navigator.connection?.rtt || 0 : 0,
		downlink: navigator.onLine ? navigator.connection?.downlink || 0 : 0
	}
}

export const getSignalLevel = (score: number | string | undefined) => {
	score = score ? Number(score) : 0
	return Math.min(score === 0 ? 0 : Math.ceil(score / 20), 5)
}
