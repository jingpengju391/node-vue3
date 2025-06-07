import { externalizeDepsPlugin } from 'electron-vite'
import terser from '@rollup/plugin-terser'
import { dirPath, isDev } from './util'
import alias from './alias'

export default {
	entry: dirPath('preload'),
	build: {
		outDir: dirPath('preload'),
		rollupOptions: {
			output: {
				// manualChunks(id) {}
			}
		}
	},
	resolve: {
		alias
	},
	plugins: [
		externalizeDepsPlugin(),
		terser({
			compress: {
				drop_console: !isDev,
				drop_debugger: !isDev
			}
		})
	]
}
