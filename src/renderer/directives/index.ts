import { App } from 'vue'
import Keyboard from './keyboard'
import Numkeyboard from './numkeyboard'
import asyncClick from './asyncClick'
export default (app: App) => {
	Keyboard(app), asyncClick(app), Numkeyboard(app)
}
