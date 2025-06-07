export const copyText = (function () {
	if (navigator.clipboard) {
		return (text: string) => {
			navigator.clipboard.writeText(text)
		}
	} else {
		return (text: string) => {
			const input = document.createElement('input')
			input.setAttribute('value', text)
			document.body.appendChild(input)
			input.select()
			document.execCommand('copy')
			document.body.removeChild(input)
		}
	}
})()

type OverloadFunction = (...args: any[]) => any

export function createOverload() {
	const fnMap = new Map<string, OverloadFunction>()

	function overload(this: unknown, ...args: any[]): any {
		const key = args.map((arg) => typeof arg).join(',')
		const fn = fnMap.get(key)

		if (!fn) {
			throw new TypeError('No implementation found for given argument types.')
		}

		return fn.apply(this, args)
	}

	overload.addImpl = function (this: void, ...args: [...string[], OverloadFunction]): void {
		const fn = args.pop()

		if (typeof fn !== 'function') {
			throw new TypeError('The last argument must be a function.')
		}

		const key = args.join(',')
		fnMap.set(key, fn)
	}

	return overload
}

export function getPreviousNDays(dateStr: string, n: number): string {
	const date = new Date(dateStr)
	date.setDate(date.getDate() - n)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	const seconds = String(date.getSeconds()).padStart(2, '0')
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function isTimeBetween(t: string | Date, t1: string | Date, t2: string | Date): boolean {
	const timeDate = t instanceof Date ? t : new Date(t)
	const time1Date = t1 instanceof Date ? t1 : new Date(t1)
	const time2Date = t2 instanceof Date ? t2 : new Date(t2)

	const startTime = time1Date < time2Date ? time1Date : time2Date
	const endTime = time1Date < time2Date ? time2Date : time1Date

	return timeDate >= startTime && timeDate <= endTime
}

export function hasEmptyValue(obj: Record<string, any>): boolean {
	return Object.values(obj).some((value) => value === null || value === undefined || value === '')
}

export function adjustTime(time: string, hoursToAdjust: number): string {
	if (!time || typeof time !== 'string') {
		throw new Error('Invalid time format')
	}

	const [datePart, timePart] = time.split(' ')

	if (!datePart || !timePart) {
		throw new Error('Invalid time format. Expected format: "YYYY-MM-DD HH:MM:SS"')
	}

	const [yy, mm, dd] = datePart.split('-').map(Number)
	const [hh, m, s] = timePart.split(':').map(Number)

	if (isNaN(yy) || isNaN(mm) || isNaN(dd) || isNaN(hh) || isNaN(m) || isNaN(s)) {
		throw new Error('Invalid date or time values')
	}

	const date = new Date(yy, mm - 1, dd, hh, m, s)

	date.setHours(date.getHours() - hoursToAdjust)

	const adjustedYear = date.getFullYear()
	const adjustedMonth = String(date.getMonth() + 1).padStart(2, '0')
	const adjustedDay = String(date.getDate()).padStart(2, '0')
	const adjustedHours = String(date.getHours()).padStart(2, '0')
	const adjustedMinutes = String(date.getMinutes()).padStart(2, '0')
	const adjustedSeconds = String(date.getSeconds()).padStart(2, '0')

	return `${adjustedYear}-${adjustedMonth}-${adjustedDay} ${adjustedHours}:${adjustedMinutes}:${adjustedSeconds}`
}

export function ringTraverse<T>(array: T[], startIndex: number, callback: (item: T, index: number) => boolean | void): void {
	const len = array.length
	for (let offset = 0; offset < len; offset++) {
		const i = (startIndex + offset) % len
		const result = callback(array[i], i)
		if (result === true) {
			break
		}
	}
}
