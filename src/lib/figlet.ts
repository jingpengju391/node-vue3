// eslint-disable-next-line @typescript-eslint/no-var-requires
import figlet from 'figlet'
import { app } from 'electron'
import { formatDateTime } from '@util/index'
export default function getnitLoggerInfo(): string {
	const name = app.getName()
	const version = app.getVersion()
	const usages = app.getAppMetrics()
	const author = 'aojiaoshou'
	const description = 'An Electron application with Vue3 and TypeScript'
	const columns = 100
	const art = figlet.textSync(name.toLocaleUpperCase().replace('-', '  '))
	const lines = art.split('\n')
	const centeredArt = lines
		.map(function (line: string) {
			const diff = Math.floor((columns - line.length) / 2)
			return ' '.repeat(diff > 0 ? diff : 0) + line
		})
		.join('\n')
	const f = ['The', name, 'Version', version, 'ESM', 'and', 'CJS', 'Standard']
	const isBuild = false
	!isBuild && f.push(...['start', 'success'])

	const s = f.map((s) => '='.repeat(s.length))

	const tg = !isBuild ? 'upload time' : 'end time'

	const metrics = usages.map((metric) => `pid:${metric.pid}  work < ${bytesToMB(metric.memory.workingSetSize)}KB  peak < ${bytesToMB(metric.memory.peakWorkingSetSize)}KB`)

	const banner = `${f.join(' ')}\n${s.join(' ')}\nProcess Metric ${metrics.join('/')}\n${description}\n${tg}: ${formatDateTime()}  author: ${author}`
	const descWidth = columns - 4
	const descRegex = new RegExp(`.{1,${descWidth}}`, 'g')
	const descLines = banner.match(descRegex) || []
	const centeredDesc = descLines
		.map(function (line) {
			const lineDiff = Math.floor((columns - line.length) / 2)
			return ' '.repeat(lineDiff > 0 ? lineDiff : 0) + line
		})
		.join('\n')
	return '\n' + centeredArt + '\n' + centeredDesc + '\n'
}

const bytesToMB = (bytes: number): number => Math.ceil(bytes / 1024)
