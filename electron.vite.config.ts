import { defineConfig } from 'electron-vite'

import mainConfig from './scripts/main.vite.config'
import preloadConfig from './scripts/preload.vite.config'
import rendererConfig from './scripts/renderer.vite.config'

export default defineConfig({
	main: mainConfig,
	preload: preloadConfig,
	renderer: rendererConfig
})
