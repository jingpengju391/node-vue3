import { SignalType } from '@shared/dataModelTypes/socket'
import { _arity, _curry1, _curry2, _clone, _isNumber, _has, _isArguments, _equals } from './internals'

export const once = _curry1(function once<T, F extends (...args: any[]) => T>(fn: F): F {
	let called = false
	let result: T
	return _arity(fn.length, function (this: any) {
		if (called) return result

		called = true
		result = fn.apply(this, arguments as any)
		return result
	} as F)
})

export const clone = _curry1(function clone<T extends { clone?: Function }>(value: T): T {
	return value != null && typeof value.clone === 'function' ? value.clone() : _clone(value, [], [], true)
})

export const range = _curry2(function range(from: any, to: any): number[] {
	if (!(_isNumber(from) && _isNumber(to))) {
		throw new TypeError('Both arguments to range must be numbers')
	}

	const result: any = []
	let n = from

	while (n < to) {
		result.push(n)
		n += 1
	}
	return result
})

export const omit = _curry2(function omit<T>(names: (keyof T)[], obj: T): Partial<T> {
	const result = {} as Partial<T>
	const index = {} as { [key in keyof T]: number }
	let idx = 0

	while (idx < names.length) {
		index[names[idx]] = 1
		idx += 1
	}

	for (const prop in obj) {
		if (!Object.prototype.hasOwnProperty.call(index, prop)) {
			result[prop] = obj[prop]
		}
	}

	return result
})

export const pick = _curry2(function pick<T>(names: (keyof T)[], obj: any): Partial<T> {
	const result = {} as { [key in keyof T]: any }
	let idx = 0

	while (idx < names.length) {
		if (names[idx] in obj) {
			result[names[idx]] = obj[names[idx]]
		}
		idx += 1
	}

	return result
})

export const equals = _curry2(function equals(a: any, b: any) {
	return _equals(a, b, [], [])
})

/**
 * merge default option & transmit params option
 * if you try Object.assign is nothing or deep merge property
 */
export function __assignDefaultProperty<T extends object, U extends object>(defaultOptions: T, options: U): T & U {
	const __assign =
		Object.assign ||
		function () {
			return [...new Set([...Object.keys(defaultOptions), ...Object.keys(options)])].reduce(
				(newObj, k) => {
					if (__isObject(options[k as keyof typeof options]) && __isObject(defaultOptions[k as keyof typeof defaultOptions])) {
						;(<any>newObj)[k as keyof typeof newObj] = __assignDefaultProperty(defaultOptions[k as keyof typeof defaultOptions] as T, options[k as keyof typeof options] as U)
						return newObj
					}
					;(<any>newObj)[k] = options[k as keyof typeof options] || defaultOptions[k as keyof typeof defaultOptions]
					return newObj
				},
				<T & U>{}
			)
		}
	return __assign({}, defaultOptions, options)
}

function __isObject(val: any): boolean {
	return typeof val === 'object'
}

export function generateSearchOptions<T>(
	data: T[],
	keys: (keyof T)[],
	label: string = 'label',
	value: string = 'value',
	handlerlabel?: (d: T) => T[keyof T],
	prer?: () => void
): { [key in keyof T]?: Array<Record<typeof label | typeof value, T[keyof T]>> } {
	prer?.()

	const result: { [key in keyof T]?: Array<Record<typeof label | typeof value, T[keyof T]>> } = {}
	const optionMap = new Map<keyof T, Map<T[keyof T], boolean>>(keys.map((k) => [k, new Map<T[keyof T], boolean>()]))

	for (const item of data) {
		for (const key of keys) {
			result[key] ??= []
			const seen = optionMap.get(key)!
			const val = item[key]

			if (!seen.get(val)) {
				seen.set(val, true)

				result[key]!.push({
					[label]: handlerlabel ? handlerlabel(item) : val,
					[value]: val
				} as Record<typeof label | typeof value, T[keyof T]>)
			}
		}
	}

	return result
}

export function getMqttHostDeviceCode(type?: SignalType) {
	const deviceCode = global?.deviceInfo?.deviceCode
	// Determine network type and set appropriate MQTT host and port
	let envType = 'WAPI'
	if (global?.network?.cmd) {
		const [networkStore] = global.network.cmd.split(' ')
		envType = networkStore?.toLocaleUpperCase() === '5G' ? 'FG' : 'WAPI'
	}

	if (type) {
		envType = type.toLocaleUpperCase() === SignalType.mobile.toLocaleUpperCase() ? 'FG' : 'WAPI'
	}

	const setup_port = import.meta.env[`MAIN_VITE_SETUP_MQTT_${envType}_PORT`]
	const setup_host = import.meta.env[`MAIN_VITE_SETUP_MQTT_${envType}_HOST`]
	const platform_port = import.meta.env[`MAIN_VITE_PLATFORM_MQTT_${envType}_PORT`]
	const platform_host = import.meta.env[`MAIN_VITE_PLATFORM_MQTT_${envType}_HOST`]

	const setup_username = import.meta.env[`MAIN_VITE_SETUP_MQTT_${envType}_USERNAME`]
	const setup_password = import.meta.env[`MAIN_VITE_SETUP_MQTT_${envType}_PASSWORD`]
	const platform_username = import.meta.env[`MAIN_VITE_PLATFORM_MQTT_${envType}_USERNAME`]
	const platform_password = import.meta.env[`MAIN_VITE_PLATFORM_MQTT_${envType}_PASSWORD`]

	return {
		setup_port,
		setup_host,
		platform_port,
		platform_host,
		deviceCode,
		setup_username,
		setup_password,
		platform_username,
		platform_password
	}
}

/**
 * Groups an array of items by a key extractor function,
 * and optionally sorts each group based on a specific field and direction.
 *
 * @param arr - The input array to be grouped.
 * @param getKey - Function to extract grouping key from each item.
 * @param options - Optional config for sorting each group.
 * @returns A record of grouped (and optionally sorted) items.
 */
export function groupByWithKeyExtractor<T>(
	arr: T[],
	getKey: (item: T) => string,
	options?: {
		sortFn: (arr: T[], sortField: keyof T, isDescending: boolean) => T[]
		sortField: keyof T
		isDescending?: boolean
	}
): Record<string, T[]> {
	const result: Record<string, T[]> = {}

	for (const item of arr) {
		const key = getKey(item)
		if (!result[key]) {
			result[key] = []
		}
		result[key].push(item)
	}

	if (options) {
		const { sortFn, sortField, isDescending = false } = options
		for (const key in result) {
			result[key] = sortFn(result[key], sortField, isDescending)
		}
	}

	return result
}
