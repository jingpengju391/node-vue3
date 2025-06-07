type Connectors = '/' | ' ' | '-' | ':'

export type CombinationWithConnectors<S extends string, U extends string = S> = S extends S ? S | `${S}${Connectors}${CombinationWithConnectors<Exclude<U, S>>}` : never

export type DataCombination = CombinationWithConnectors<'YYYY' | 'MM' | 'DD'>

export type TimeCombination = CombinationWithConnectors<'hh' | 'mm' | 'ss'>

export type DTCombination = DataCombination | `${DataCombination}${Connectors}${TimeCombination}`

export function reverseMap<T extends Record<string | number, number>>(map: T): Record<number, keyof T> {
	const reversed: Record<number, keyof T> = {}
	for (const key in map) {
		reversed[map[key]] = Number(key) as keyof T
	}
	return reversed
}
