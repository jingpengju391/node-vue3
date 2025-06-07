import Sortable from 'sortablejs'
import { v4 as uuid } from 'uuid'
import { JsonVirtualProps } from './type'

export const omitProperty = ['className', 'backgroundConfig', 'hideWrapBorder', 'currentRow', 'currentColumn', 'sortable']

export const defaultHeaderHeight = {
	unit: 'px',
	value: 69
}

export const elSortableClass = {
	row: '.body--wrapper>.vxe-table--body tbody',
	col: '.body--wrapper>.vxe-table--header .vxe-header--row',
	handle: '.vxe-header--column'
}

export const defaultProperty: Partial<JsonVirtualProps> = {
	id: uuid(),
	ref: 'tableRef',
	className: 'json-virtual-box',
	border: 'none',
	hideWrapBorder: {
		top: false,
		right: false,
		bottom: false,
		left: false
	},
	scrollY: {
		enabled: true,
		gt: 0
	},
	height: 'auto',
	showHeaderOverflow: true,
	showOverflow: true,
	keepSource: true,
	backgroundConfig: {
		transparent: true
	},
	rowConfig: {
		keyField: 'id',
		isHover: true,
		isCurrent: true
	},
	checkboxConfig: {
		trigger: 'row'
	},
	columnConfig: {
		resizable: true
	},
	customConfig: {
		storage: true
	},
	sortable: {
		enabled: false,
		disabledRow: false,
		disabledCol: false,
		rowOption: null,
		colOption: null
	},
	columns: [],
	data: []
}

export const dragRowOption: Sortable.SortableOptions = {
	animation: 180,
	direction: 'horizontal',
	onEnd: (/** Event */ evt: Sortable.SortableEvent) => {
		console.warn(evt, 'please replace the current method')
	}
}

export const dragColOption: Sortable.SortableOptions = {
	onEnd: async (/** Event */ evt: Sortable.SortableEvent) => {
		console.warn(evt, 'please replace the current method')
	}
}
