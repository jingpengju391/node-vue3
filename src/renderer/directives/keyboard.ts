import { App } from 'vue'
import { keyboard, handlerBoardShowAndHide, keyboardClass, ENUMCLOSE, defaultEvents, BKSH, CLOSE } from '../components/SimpleKeyboard/hook'
import { debounce } from '@util/index'

let scale = 1
// Use WeakMap to store event handlers for elements
const focusMap = new WeakMap<HTMLElement, () => void>()
const blurMap = new WeakMap<HTMLElement, () => void>()
const clickMap = new WeakMap<HTMLElement, EventListener>()

let currentDome: HTMLInputElement | null = null

export const syncInputModelData = debounce((val: string) => {
	if (!currentDome) return
	currentDome.dispatchEvent(new Event('input'))
	keyboard.value?.setInput(val)
}, 300)

export default (app: App) => {
	app.directive('keyboard', {
		beforeMount(el) {
			// Find the input element inside the directive's bound element
			// If no input is found, use the element itself
			const input = el.querySelector('input, textarea') || el

			// Store event handlers in WeakMap for proper cleanup
			focusMap.set(input, _focus)
			blurMap.set(input, _blur)

			// Attach event listeners
			input.addEventListener('focus', _focus)
			input.addEventListener('blur', _blur)

			const attrs = input.getAttributeNames().reduce(
				(acc, attr) => {
					acc[attr] = input.getAttribute(attr)
					return acc
				},
				{} as Record<string, string | null>
			)

			function _focus() {
				currentDome = input
				// Get the current input value
				const value = currentDome?.value || ''
				// Set the input value in the virtual keyboard component
				keyboard.value?.setInput(value)
				// Configure the virtual keyboard options, including event handlers
				keyboard.value?.setOptions({
					onChange: async (val: string) => {
						const selectionStart = input.selectionStart
						currentDome!.value = val
						requestAnimationFrame(() => {
							currentDome!.setSelectionRange(selectionStart + scale, selectionStart + scale)
							scale = 1
						})
						syncInputModelData(val)
					}, // Custom onChange event from the directive binding
					onKeyPress: (key: string) => {
						if (key === CLOSE) {
							input.blur()
							return
						}
						const value = currentDome?.value || ''
						keyboard.value?.setInput(value)
						if (key === BKSH) {
							scale = -1
						}
						// If the pressed key matches a default event, execute it
						if (defaultEvents[key]) {
							defaultEvents[key]()
						}
					},
					...attrs,
					maxLength: attrs.maxlength ? Number(attrs.maxlength) : null
				})
				// Hide the keyboard when the input is focused
				handlerBoardShowAndHide(false)
			}

			function _blur() {
				// Blur event handler: Hide the keyboard when the input loses focus
				handlerBoardShowAndHide(true)
			}
		},
		// mounted hook: Called after the element is inserted into the DOM
		mounted() {
			// Find the virtual keyboard element
			const keyboardEl = document.querySelector(`.${keyboardClass}`) as HTMLElement
			if (!keyboardEl) return

			// Store event handler and attach event listener
			clickMap.set(keyboardEl, _clickDom)
			keyboardEl.addEventListener('click', _clickDom)

			const targets = ['hg-candidate-box-next hg-candidate-box-btn-active', 'hg-candidate-box-list-item', 'hg-candidate-box-prev hg-candidate-box-btn-active']
			keyboardEl.addEventListener(
				'mouseup',
				(e) => {
					const target = e.target as HTMLElement
					!targets.includes(target.className) && e.preventDefault()
				},
				true
			)

			keyboardEl.addEventListener(
				'mousedown',
				(e) => {
					const target = e.target as HTMLElement
					!targets.includes(target.className) && e.preventDefault()
				},
				true
			)
			// hg-candidate-box-next hg-candidate-box-btn-active
			keyboardEl.addEventListener(
				'touchstart',
				(e) => {
					const target = e.target as HTMLElement
					!targets.includes(target.className) && e.preventDefault()
				},
				{ passive: false }
			)

			keyboardEl.addEventListener(
				'touchend',
				(e) => {
					const target = e.target as HTMLElement
					if (!targets.includes(target.className)) {
						e.preventDefault()
						setTimeout(() => {
							if (target.innerText !== ENUMCLOSE) {
								currentDome?.focus()
							}
						}, 0)
					}
				},
				{ passive: false }
			)

			function _clickDom(event: Event) {
				const target = event.target as HTMLElement
				if (target.innerText !== ENUMCLOSE) {
					currentDome?.focus()
				}
			}
		},
		// unmounted hook: Clean up event listeners before the element is removed
		unmounted() {
			if (!currentDome) return
			// Remove focus event listener
			const handlerFocus = focusMap.get(currentDome)
			if (handlerFocus) {
				currentDome.removeEventListener('focus', handlerFocus)
				focusMap.delete(currentDome)
			}

			// Remove blur event listener
			const handlerBlur = blurMap.get(currentDome)
			if (handlerBlur) {
				currentDome.removeEventListener('blur', handlerBlur)
				blurMap.delete(currentDome)
			}

			// Find the virtual keyboard element
			const keyboardEl = document.querySelector(`.${keyboardClass}`) as HTMLElement
			if (!keyboardEl) return

			// Remove click event listener from the keyboard
			const handlerClick = clickMap.get(keyboardEl)
			if (handlerClick) {
				keyboardEl.removeEventListener('click', handlerClick)
				clickMap.delete(keyboardEl)
			}
		}
	})
}
