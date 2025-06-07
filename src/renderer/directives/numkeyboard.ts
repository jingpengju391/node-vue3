import { App, Directive } from 'vue'

// 全局变量，用于跟踪当前显示的键盘和关联的输入框
let currentKeyboardData: {
	keyboard: HTMLDivElement | null
	inputEl: HTMLInputElement | null
} = {
	keyboard: null,
	inputEl: null
}

const NumberKeyboardDirective: Directive = {
	mounted(el: any, binding) {
		// 确保 el 是输入框元素
		const inputEl = el.tagName === 'INPUT' ? el : el.querySelector('input')
		if (!inputEl) {
			console.error('No input element found for the numkeyboard directive')
			return
		}

		// 创建键盘DOM
		const keyboard = document.createElement('div')
		keyboard.className = 'numberKeyboard_wrapper'
		keyboard.style.display = 'none'
		keyboard.style.position = 'fixed'
		keyboard.style.bottom = '0'
		keyboard.style.left = '0'
		keyboard.style.width = '100%'
		keyboard.style.zIndex = '9999'
		keyboard.innerHTML = `
            <div class="numberKeyboard_body">
                ${['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.', '删除', '确认']
					.map(
						(num) => `
                            <div class="numberKeyboard_body_item" data-value="${num === '删除' ? 'backspace' : num === '收起' || num === '确认' ? 'close' : num}">
                                ${num}
                            </div>
                        `
					)
					.join('')}
            </div>
        `

		document.body.appendChild(keyboard)

		// 保存引用
		inputEl._keyboard = keyboard
		inputEl._keyboardVisible = false
		inputEl._isClickingKeyboard = false

		// 点击输入框显示键盘
		inputEl.addEventListener('click', () => {
			if (currentKeyboardData.keyboard === keyboard && inputEl._keyboardVisible) {
				return
			}

			if (currentKeyboardData.keyboard && currentKeyboardData.inputEl) {
				hideKeyboard(currentKeyboardData.keyboard, currentKeyboardData.inputEl)
			}

			currentKeyboardData = {
				keyboard,
				inputEl
			}

			showKeyboard(keyboard, inputEl)
			inputEl.focus()
		})

		// 输入框失去焦点时隐藏键盘
		const handleBlur = () => {
			if (inputEl._isClickingKeyboard) {
				return
			}

			setTimeout(() => {
				if (document.activeElement !== inputEl && !keyboard.contains(document.activeElement)) {
					hideKeyboard(keyboard, inputEl)
				}
			}, 100)
		}

		inputEl.addEventListener('blur', handleBlur)
		inputEl._blurHandler = handleBlur

		// 键盘鼠标按下事件
		const handleKeyboardMouseDown = () => {
			inputEl._isClickingKeyboard = true
		}

		// 键盘鼠标抬起事件
		const handleKeyboardMouseUp = () => {
			setTimeout(() => {
				inputEl._isClickingKeyboard = false
			}, 150)
		}

		keyboard.addEventListener('mousedown', handleKeyboardMouseDown)
		keyboard.addEventListener('mouseup', handleKeyboardMouseUp)
		inputEl._keyboardMouseDownHandler = handleKeyboardMouseDown
		inputEl._keyboardMouseUpHandler = handleKeyboardMouseUp

		// 键盘点击事件
		const handleKeyboardClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement
			const item: any = target.closest('.numberKeyboard_body_item')
			if (!item) return

			const value = item.dataset.value
			if (value === 'close' || value === '收起' || value === '确认') {
				hideKeyboard(keyboard, inputEl)
				return
			}

			handleKeyPress(value, inputEl, binding.value)
		}

		keyboard.addEventListener('click', handleKeyboardClick)
		inputEl._keyboardClickHandler = handleKeyboardClick

		// 点击外部关闭键盘
		const handleOutsideClick = (e: MouseEvent) => {
			if (!inputEl._keyboardVisible) return
			if (inputEl.contains(e.target as Node)) return
			if (keyboard.contains(e.target as Node)) return

			hideKeyboard(keyboard, inputEl)
		}

		document.addEventListener('click', handleOutsideClick)
		inputEl._outsideClickHandler = handleOutsideClick

		// 显示键盘 - 修改部分
		const showKeyboard = (keyboard: HTMLDivElement, inputEl: HTMLInputElement | any) => {
			inputEl._keyboardVisible = true
			keyboard.style.display = 'flex'
			currentKeyboardData = { keyboard, inputEl }

			// 获取键盘高度
			const keyboardHeight = keyboard.offsetHeight - 210

			// 添加页面整体上移的样式
			document.body.style.position = 'fixed'
			document.body.style.width = '100%'
			document.body.style.bottom = keyboardHeight + 'px'

			// 滚动到输入框位置
			inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}

		// 隐藏键盘 - 修改部分
		const hideKeyboard = (keyboard: HTMLDivElement, inputEl: HTMLInputElement | any) => {
			inputEl._keyboardVisible = false
			keyboard.style.display = 'none'

			// 恢复页面位置
			document.body.style.position = ''
			document.body.style.width = ''
			document.body.style.bottom = ''

			if (currentKeyboardData.keyboard === keyboard) {
				currentKeyboardData = { keyboard: null, inputEl: null }
			}
		}

		// 处理按键输入
		const handleKeyPress = (value: string, inputEl: HTMLInputElement, bindingValue: any) => {
			let currentValue = inputEl.value || ''
			const selectionStart = inputEl.selectionStart || 0
			const selectionEnd = inputEl.selectionEnd || 0

			const { min = -Infinity, max = Infinity, precision = 4, onChange } = bindingValue || {}

			switch (value) {
				case 'backspace':
				case '删除':
					if (currentValue.length === 0) return

					if (selectionStart === selectionEnd) {
						const newPos = Math.max(0, selectionStart - 1)
						currentValue = currentValue.substring(0, newPos) + currentValue.substring(selectionEnd)
						inputEl.value = currentValue
						setCursorPosition(inputEl, newPos)
					} else {
						currentValue = currentValue.substring(0, selectionStart) + currentValue.substring(selectionEnd)
						inputEl.value = currentValue
						setCursorPosition(inputEl, selectionStart)
					}
					break

				case '.':
					if (currentValue.indexOf('.') === -1 && currentValue !== '-') {
						currentValue = currentValue.substring(0, selectionStart) + '.' + currentValue.substring(selectionEnd)
						inputEl.value = currentValue
						setCursorPosition(inputEl, selectionStart + 1)
					}
					break

				case '-':
					if (currentValue === '' || currentValue === '-') {
						currentValue = '-'
						inputEl.value = currentValue
						setCursorPosition(inputEl, 1)
					} else if (!currentValue.startsWith('-')) {
						if (selectionStart === 0) {
							currentValue = '-' + currentValue
							inputEl.value = currentValue
							setCursorPosition(inputEl, 1)
						}
					}
					break

				default:
					if (currentValue === '-' || currentValue === '') {
						inputEl.value = currentValue === '-' ? `-${value}` : value
						setCursorPosition(inputEl, inputEl.value.length)
					} else {
						if (selectionStart !== selectionEnd) {
							currentValue = currentValue.substring(0, selectionStart) + value + currentValue.substring(selectionEnd)
						} else {
							const decimalIndex = currentValue.indexOf('.')
							if (decimalIndex !== -1 && selectionStart > decimalIndex) {
								const decimalPlaces = currentValue.length - decimalIndex - 1
								if (decimalPlaces >= precision) return
							}

							currentValue = currentValue.substring(0, selectionStart) + value + currentValue.substring(selectionEnd)
						}
						inputEl.value = currentValue
						setCursorPosition(inputEl, selectionStart + 1)
					}
					break
			}

			// 验证和限制值
			let numericValue = currentValue === '-' ? NaN : parseFloat(currentValue)

			if (isNaN(numericValue)) {
				if (currentValue === '-') {
					numericValue = min
				} else {
					currentValue = ''
					numericValue = 0
				}
			}

			if (numericValue < min) {
				if (min < 0 && currentValue.startsWith('-')) {
					inputEl.value = min.toString()
				} else if (min >= 0 && currentValue.startsWith('-')) {
					inputEl.value = currentValue.replace('-', '')
					numericValue = parseFloat(inputEl.value)
					if (numericValue > max) {
						inputEl.value = max.toString()
					}
				} else {
					inputEl.value = min.toString()
				}
			} else if (numericValue > max) {
				inputEl.value = max.toString()
			}

			triggerInputEvents(inputEl)
			if (bindingValue?.onChange) {
				bindingValue.onChange(inputEl.value)
			}
		}

		const setCursorPosition = (input: HTMLInputElement, pos: number) => {
			requestAnimationFrame(() => {
				input.setSelectionRange(pos, pos)
				input.focus()
			})
		}

		const triggerInputEvents = (inputEl: HTMLInputElement) => {
			const inputEvent = new Event('input', { bubbles: true })
			const changeEvent = new Event('change', { bubbles: true })
			inputEl.dispatchEvent(inputEvent)
			inputEl.dispatchEvent(changeEvent)
			const compositionEnd = new Event('compositionend', { bubbles: true })
			inputEl.dispatchEvent(compositionEnd)
		}
	},

	unmounted(
		el: HTMLElement & {
			_keyboard?: HTMLDivElement
			_keyboardClickHandler?: (e: MouseEvent) => void
			_outsideClickHandler?: (e: MouseEvent) => void
			_blurHandler?: () => void
			_keyboardMouseDownHandler?: () => void
			_keyboardMouseUpHandler?: () => void
		}
	) {
		if (el._keyboard) {
			if (currentKeyboardData.keyboard === el._keyboard) {
				currentKeyboardData = { keyboard: null, inputEl: null }
			}
			if (el._keyboard.parentNode) {
				el._keyboard.parentNode.removeChild(el._keyboard)
			}
		}
		if (el._keyboardClickHandler) {
			el._keyboard?.removeEventListener('click', el._keyboardClickHandler)
		}
		if (el._outsideClickHandler) {
			document.removeEventListener('click', el._outsideClickHandler)
		}
		if (el._blurHandler) {
			el.removeEventListener('blur', el._blurHandler)
		}
		if (el._keyboardMouseDownHandler) {
			el._keyboard?.removeEventListener('mousedown', el._keyboardMouseDownHandler)
		}
		if (el._keyboardMouseUpHandler) {
			el._keyboard?.removeEventListener('mouseup', el._keyboardMouseUpHandler)
		}

		// 确保在卸载时恢复页面位置
		document.body.style.position = ''
		document.body.style.width = ''
		document.body.style.bottom = ''
	}
}

export default (app: App) => {
	app.directive('numkeyboard', NumberKeyboardDirective)
}
