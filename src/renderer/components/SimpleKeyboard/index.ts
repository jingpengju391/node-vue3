import { initKeyboard, keyboardClass, hidePropertyView } from './hook'
import 'simple-keyboard/build/css/index.css'
import './index.css'
export default defineComponent({
	name: 'SimpleKeyboard',
	setup() {
		onMounted(initKeyboard)
	},
	render() {
		const style = { bottom: hidePropertyView.value ? '-400px' : '0px' }
		return h('div', {
			class: keyboardClass,
			style
		})
	}
})
