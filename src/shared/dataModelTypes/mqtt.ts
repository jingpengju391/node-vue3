export type ResponseResultMessage = {
	mid: string // 请求ID（UUID）
	deviceId: string // 主节点的EID
	timestamp: number // 消息时间戳（毫秒）
	param: ResponseResultParam // 响应结果
}

export type ResponseResultParam = {
	result: 'OK' | 'ERROR' | string // 响应结果："OK"表示成功，"ERROR"表示失败，或其他字符串
}

export interface DeviceInfo {
	deviceId: string // 移动终端编号
	memoryUse: string // 内存使用百分比
	memoryAll: string // 内存已使用大小
	cpuUse: string // CPU 已使用百分比
	hardDiskUse: string // 硬盘空间使用百分比
	hardDiskAll: string // 硬盘空间使用大小
	lastReboot: string // 节点设备上一次开机时间
	wanIp?: string // 北向网口IP
	wanMac?: string // 北向网口MAC地址
	wapiMac1: string // WAPI-MAC 1地址
	wapiMac2: string // WAPI-MAC 2地址
	eth0Mac: string // ETH0-MAC 地址
	fivegSim: string // 5G-SIM卡编码
}

export interface DeviceEventMessage {
	eventId: string // 事件 ID，String 类型数字，设备维度唯一
	deviceId: string // 移动终端编码
	timestamp: number // 消息发送的时间戳（UTC，精度到秒）
	data: DeviceInfo[] // 设备基本信息数组
}
