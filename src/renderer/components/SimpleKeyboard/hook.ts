import { SimpleKeyboard } from 'simple-keyboard/build/index'
import Keyboard from 'simple-keyboard'
import layout from 'simple-keyboard-layouts/build/layouts/chinese'

export const keyboard = ref<SimpleKeyboard | null>(null)
export const hidePropertyView = ref(true)
export const keyboardClass = 'simple-keyboard'
export const ENUMCLOSE = '关闭'
export const BKSH = '{bksp}'
export const CLOSE = '{close}'

export const defaultLayout = [
	'` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
	'{tab} q w e r t y u i o p [ ] \\',
	"{lock} a s d f g h j k l ; ' {enter}",
	'{shift} z x c v b n m , . / {clear}',
	'{change} {space} {close}'
]

export const shiftLayout = [
	'~ ! @ # $ % ^ & * ( ) _ + {bksp}',
	'{tab} Q W E R T Y U I O P { } |',
	'{lock} A S D F G H J K L : " {enter}',
	'{shift} Z X C V B N M < > ? {clear}',
	'{change} {space} {close}'
]

export const displayDefault = {
	'{bksp}': 'backspace',
	'{lock}': 'caps',
	'{enter}': '> enter',
	'{tab}': 'tab',
	'{shift}': 'shift',
	'{change}': '中文',
	'{space}': ' ',
	'{clear}': '清空',
	'{close}': ENUMCLOSE
}

export const buttonTheme = [
	{
		class: 'hg-red close',
		buttons: '{close}'
	},
	{
		class: 'change',
		buttons: '{change}'
	}
]

export const defaultEvents = {
	'{change}': change,
	'{close}': close,
	'{clear}': clear,
	'{lock}': shiftAndlock,
	'{shift}': shiftAndlock
}

export function initKeyboard() {
	keyboard.value = new Keyboard(keyboardClass, {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		layoutCandidates: (layout as any).layoutCandidates,
		layout: {
			default: defaultLayout,
			shift: shiftLayout
		},
		display: displayDefault,
		buttonTheme
	})
}

export const handlerBoardShowAndHide = (val: boolean) => {
	hidePropertyView.value = val
}

function change() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const layoutCandidates = keyboard.value?.options.layoutCandidates ? undefined : (layout as any).layoutCandidates
	displayDefault['{change}'] = layoutCandidates ? '中文' : '英文'
	keyboard.value?.setOptions({
		layoutName: 'default',
		layoutCandidates,
		display: displayDefault
	})
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function close(_el: HTMLInputElement, _timer: NodeJS.Timeout) {}

export function clear() {
	keyboard.value?.setInput('')
}

function shiftAndlock() {
	const layoutName = keyboard.value?.options.layoutName === 'default' ? 'shift' : 'default'
	keyboard.value?.setOptions({
		layoutName
	})
}
