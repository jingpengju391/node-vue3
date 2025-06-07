import { StoreDefinition, StateTree } from 'pinia'

export interface BaseState {}
export interface BaseGetters {}
export interface BaseActions {}

export interface ModuleMap {}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type ModUnion = Required<ModuleMap[keyof ModuleMap]>

export type RootState = BaseState & UnionToIntersection<ModUnion['state']>

type ModuleGetters = ModUnion['getters']
export type RootGetters = BaseGetters & UnionToIntersection<ModuleGetters>

type ModuleActions = ModUnion['actions']
export type RootActions = BaseActions & UnionToIntersection<ModuleActions>

export interface PiniaStore<S extends StateTree, G, A> {
	state: S
	getters: G
	actions: A
}

export interface ModuleOption<S, G, A> {
	persist?:
		| boolean
		| {
				storage: Storage
		  }
	state: () => S
	getters?: G & ThisType<S & G & A> & { [key: string]: any }
	actions?: A & ThisType<S & G & A>
}

export interface RootStore extends StoreDefinition<string, RootState, RootGetters, RootActions> {}
