import { App } from 'vue'
import { loading } from '@utils/loading'
import { v4 as uuid } from 'uuid'

// Use WeakMap to store event handlers for elements
const map = new WeakMap<HTMLElement, (event: MouseEvent) => void>()

export default (app: App) => {
	app.directive('click', {
		mounted(el, binding) {
			const {
				value: { loadText, handleClick }, // Extract loadText and handleClick from binding value
				modifiers
			} = binding

			async function handler(event: MouseEvent) {
				const button = el.querySelector('.van-button') || el

				// If neither 'disabled' nor 'loading' modifiers are present, execute the click handler directly
				if (!modifiers.disabled && !modifiers.loading) return handleClick(event)

				// If 'disabled' modifier is present, disable the button
				if (modifiers.disabled) {
					button.setAttribute('disabled', 'true')
					button.classList.add('van-button--disabled')
				}

				// If 'loading' modifier is present, update the loading state
				if (modifiers.loading) {
					loading.value = {
						uuid: uuid(),
						val: true,
						loadText
					}
				}

				// Execute the provided click handler function
				await handleClick(event)

				// Re-enable the button after the operation is complete
				if (modifiers.disabled) {
					button.removeAttribute('disabled')
					button.classList.remove('van-button--disabled')
				}

				// Reset loading state
				if (modifiers.loading) {
					loading.value = {
						uuid: uuid(),
						val: false,
						loadText
					}
				}
			}

			// Store the handler function in WeakMap and add event listener
			map.set(el, handler)
			el.addEventListener('click', handler)
		},

		unmounted(el) {
			// Retrieve and remove the stored handler when the element is unmounted
			const handler = map.get(el)
			if (!handler) return
			el.removeEventListener('click', handler)
			map.delete(el)
		}
	})
}
