import { externalizeDepsPlugin } from 'electron-vite'
import terser from '@rollup/plugin-terser'
import { dirPath, isDev } from './util'
import alias from './alias'
import { visualizer } from 'rollup-plugin-visualizer'

export default {
	entry: dirPath('main'),
	build: {
		outDir: dirPath('main'),
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						return 'vendor'
					}
				}
			},
			external: ['sqlite3']
		},
		// currently, bypassed the build time by setting watch.buildDelay.
		// it works quite effectively but it doesn't feel like a reliable solution.
		// https://github.com/alex8088/electron-vite/issues/687
		watch: {
			chokidar: {
				usePolling: true,
				ignored: [/node_modules/, /src\/renderer/]
			},
			clearScreen: true,
			include: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
			skipWrite: false
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
		}),
		visualizer({
			gzipSize: true,
			brotliSize: true,
			filename: 'public/main/visualizer.html'
		})
	]
}
