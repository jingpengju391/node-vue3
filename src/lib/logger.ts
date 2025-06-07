import * as path from 'path'
import log from 'electron-log/main'
import { generateFullPathUsingRelativePath } from '@lib'
import { formatDateTime } from '@util/index'

const { MAIN_VITE_LOGS_PATH, MAIN_VITE_LOGS_SUFFIX } = import.meta.env
const filePath = getLogFilePath()

// Setting the maximum size to the maximum safe integer is almost impossible to achieve
log.transports.file.maxSize = 1 * 1024 * 1024 * 1024
// log.transports.file.archiveLogFn = (oldLogFile) => {
// 	oldLogFile.clear()
// }
// set log save path
log.transports.file.resolvePathFn = () => generateFullPathUsingRelativePath(filePath)
// the file transport writes log messages to a file
log.transports.file.format = `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}`
// disable output log on shell
log.transports.console.level = false
// globally set the logger function
globalThis.logger = log

export function getLogFileName(time: string = formatDateTime('YYYY-MM-DD')): string {
	return `${time}${MAIN_VITE_LOGS_SUFFIX}`
}

export function getLogFilePath(time?: string): string {
	return path.join(MAIN_VITE_LOGS_PATH, `${getLogFileName(time)}`)
}
