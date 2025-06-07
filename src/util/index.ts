import { DTCombination } from '@shared/dataModelTypes/util'
import { DetectMode, WorkDetailType } from '@shared/dataModelTypes/WorkOrder'

export function singleton<T extends new (...args: any[]) => any>(className: T): T & (new (...args: ConstructorParameters<T>) => InstanceType<T>) & InstanceType<T> {
	let instance: InstanceType<T>
	const proxy = new Proxy(className, {
		construct(target, args) {
			if (instance) {
				console.warn('current class need is sing class!')
			} else {
				instance = Reflect.construct(target, args)
			}
			return instance
		}
	})
	className.prototype.constructor = proxy
	return proxy as T & (new (...args: ConstructorParameters<T>) => InstanceType<T>) & InstanceType<T>
}

export function performChunk<T>(datas: T[], consumer: (item: T, index: number) => void): void {
	if (datas.length === 0) return
	let i = 0
	function _run() {
		if (i === datas.length) return

		globalThis.requestIdleCallback((idle) => {
			while (idle.timeRemaining() > 0 && i < datas.length) {
				const item = datas[i]
				consumer(item, i)
				i++
			}
			_run()
		})
	}

	_run()
}

export function formatDateTime(format: DTCombination = 'YYYY-MM-DD hh:mm:ss', timestamp: number = Date.now()) {
	const now = new Date(timestamp)
	const dataMap = new Map<string, string>([
		['YYYY', String(now.getFullYear())],
		['MM', String(now.getMonth() + 1).padStart(2, '0')],
		['DD', String(now.getDate()).padStart(2, '0')],
		['hh', String(now.getHours()).padStart(2, '0')],
		['mm', String(now.getMinutes()).padStart(2, '0')],
		['ss', String(now.getSeconds()).padStart(2, '0')]
	])

	return format.replace(/[a-zA-Z]+/g, (match) => dataMap.get(match) ?? '')
}

export async function sleep(ms: number = 1000): Promise<void> {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function isImageFile(filename: string): boolean {
	return /\.(jpe?g|png)$/i.test(filename)
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number = 600): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout> | null = null
	return function (this: any, ...args: Parameters<T>) {
		timer !== null && clearTimeout(timer)
		timer = setTimeout(() => fn.apply(this, args), delay)
	} as (...args: Parameters<T>) => void
}

export function throttle(fn: (...args: any[]) => void, delay: number = 600): (...args: any[]) => void {
	let lock = false
	return (...args: any[]) => {
		if (lock) return
		fn(...args)
		lock = true
		setTimeout(() => {
			lock = false
		}, delay)
	}
}

export function toCamelCase(str: string): string {
	return str.replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, char) => char.toUpperCase())
}

type PlainObject = { [key: string]: any }

export function convertKeysToCamelCase<T>(obj: T): T {
	if (Array.isArray(obj)) {
		return obj.map(convertKeysToCamelCase) as T
	} else if (obj && typeof obj === 'object') {
		return Object.entries(obj).reduce((acc, [key, value]) => {
			acc[toCamelCase(key)] = convertKeysToCamelCase(value)
			return acc
		}, {} as PlainObject) as T
	}
	return obj
}

export function quickSort<T extends Record<string, any>>(arr: T[], sortField: keyof T, isDescending: boolean = false): T[] {
	function qsort(arr: T[], l: number, r: number): T[] {
		if (l < r) {
			const pivot = l
			let p = l + 1
			for (let i = l + 1; i <= r; i++) {
				const compare = isDescending ? arr[i][sortField] > arr[pivot][sortField] : arr[i][sortField] < arr[pivot][sortField]
				if (compare) {
					;[arr[i], arr[p]] = [arr[p], arr[i]]
					p += 1
				}
			}
			;[arr[pivot], arr[p - 1]] = [arr[p - 1], arr[pivot]]
			qsort(arr, l, p - 2)
			qsort(arr, p, r)
		}
		return arr
	}

	return qsort(arr, 0, arr.length - 1)
}

export function hasOwnProperty<T extends object | null | undefined, K extends keyof any>(obj: T, prop: K): boolean {
	return obj && Object.hasOwn(obj, prop)
}

export async function retryWithExponentialBackoff<T>(operation: () => Promise<T> | T, maxRetries: number = 3, baseDelay: number = 100, useJitter: boolean = true): Promise<T> {
	try {
		return await Promise.resolve(operation())
	} catch (error) {
		if (maxRetries <= 0) {
			throw new Error(`Operation failed after ${maxRetries} retries: ${error}`)
		}

		const jitter = useJitter ? Math.random() * baseDelay : 0
		const delay = Math.floor(baseDelay * Math.pow(2, maxRetries - 1) + jitter)
		await sleep(delay)
		return retryWithExponentialBackoff(operation, maxRetries - 1, baseDelay, useJitter)
	}
}

export function deepClone<T>(value: T): T {
	const cache = new Map()

	function _deepClone<T>(value: T): T {
		if (value === null || typeof value !== 'object') {
			return value
		}

		if (cache.has(value)) {
			return cache.get(value)
		}

		const result: T | any = Array.isArray(value) ? [] : {}

		cache.set(value, result)

		for (const key in value) {
			result[key] = _deepClone(value[key])
		}

		return result
	}

	return _deepClone(value)
}

export function findDifferences(a: Record<string, any>, b: Record<string, any>): any[] {
	return [...new Set([...Object.keys(a), ...Object.keys(b)])].reduce((r: any[], k: string) => {
		if (a[k] && b[k] && typeof a[k] === 'object' && typeof b[k] === 'object') {
			const temp = findDifferences(a[k], b[k])
			if (temp.length) r.push(...temp.map(([l, ...a]) => [k + ' ' + l, ...a]))
			return r
		}

		if (k in a && !(k in b)) {
			r.push([k, 'deleted', a[k]])
			return r
		}

		if (!(k in a) && k in b) {
			r.push([k, 'created', b[k]])
			return r
		}

		if (a[k] === b[k]) return r

		r.push([k, 'changed', a[k], b[k]])
		return r
	}, [])
}

export function compareVersion(v1: string, v2: string) {
	const a1: number[] = v1.split('.').map((v) => Number(v))
	const a2: number[] = v2.split('.').map((v) => Number(v))
	let i = 0
	let result = 0

	while (i < a1.length || i < a2.length) {
		a1[i] = a1[i] ? Number(a1[i]) : 0
		a2[i] = a2[i] ? Number(a2[i]) : 0

		if (a1[i] > a2[i]) {
			result = 1
			break
		} else if (a1[i] < a2[i]) {
			result = -1
			break
		}
		i++
	}
	return result
}

export function isEmptyObject(obj: unknown): obj is object {
	return typeof obj === 'object' && obj !== null && !Array.isArray(obj) && Object.keys(obj).length === 0
}

export function extractIpFromUrl(url: string): string | null {
	const match = url.match(/http:\/\/([\d.]+)\//)
	return match ? match[1] : null
}

/**
 * Utility to convert between decimal and hexadecimal string representations.
 *
 * This function supports converting a numeric string from decimal to hexadecimal,
 * or from hexadecimal to decimal. It handles optional "0x" prefixes for hexadecimal inputs,
 * and always outputs uppercase hexadecimal with a "0x" prefix.
 *
 * @param input - A numeric string in either decimal or hexadecimal format (with or without the "0x" prefix)
 * @param target - Target base for conversion:
 *   - "dec" for converting to decimal string
 *   - "hex" for converting to hexadecimal string
 * @returns The converted string in the desired format.
 *
 * @throws Error if the input string is not a valid number in the expected format.
 */
export function convertNumberString(input: string | number, _target: 'dec' | 'hex'): string {
	// let value: bigint

	// const str = input.toString().trim()
	// if (target === 'dec') {
	// 	value = BigInt(str.startsWith('0x') || str.startsWith('0X') ? str : '0x' + str)
	// } else {
	// 	value = BigInt(str)
	// }
	return input.toString()
}

export function splitNumber(num: string, splitPattern: number[]): [string, DetectMode, WorkDetailType, number] {
	const str = num.toString()
	const result: (number | string)[] = []
	let offset = 0

	for (let i = 0; i < splitPattern.length; i++) {
		const size = splitPattern[i]

		if (size === 0) {
			const part = str.slice(offset)
			result.push(i === 0 ? part : Number(part))
			break
		} else {
			const part = str.slice(offset, offset + size)
			result.push(i === 0 ? part : Number(part))
			offset += size
		}
	}

	while (result.length < 4) {
		result.push(result.length === 0 ? '' : 0)
	}

	return result as [string, DetectMode, WorkDetailType, number]
}
