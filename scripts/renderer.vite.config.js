import path from 'path'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Inspect from 'vite-plugin-inspect'
import terser from '@rollup/plugin-terser'
import { lazyImport, VxeResolver } from 'vite-plugin-lazy-import'
import { resolvePath, dirPath, isDev, getOptimizeDepsIncludes } from './util'
import alias from './alias'
import { visualizer } from 'rollup-plugin-visualizer'

const mode = process.env.NODE_ENV || 'development'
const { VITE_APP_SERVER_PORT, VITE_APP_SERVER_HOST, VITE_APP_SERVER_OPEN, VITE_APP_AUTO_IMPORT_PATH } = loadEnv(mode, process.cwd())
const pathSrc = path.resolve(__dirname, VITE_APP_AUTO_IMPORT_PATH)

export default {
	entry: dirPath(),
	optimizeDeps: {
		include: getOptimizeDepsIncludes()
	},
	build: {
		outDir: dirPath(),
		assetsInlineLimit: 4096,
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('element-plus')) return 'element-plus'
						if (id.includes('vant')) return 'vant'
						if (id.includes('vxe-table')) return 'vxe-table'
						if (id.includes('vue')) return 'vue'
						return 'vendor'
					}
				}
			}
		}
	},
	resolve: {
		alias
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@use "@/themes/element.scss" as *; @use "@/themes/vant.scss" as *;`,
				charset: false,
				api: 'modern-compiler'
			}
		}
	},
	plugins: [
		vue(),
		createSvgIconsPlugin({
			// Specify the icon folder to be cached
			iconDirs: [resolvePath('../src/renderer/assets/icons')],
			// Specify symbolId format
			symbolId: 'icon-[name]'
		}),
		AutoImport({
			// Auto import functions from Vue, e.g. ref, reactive, toRef...
			imports: ['vue', 'pinia'],
			resolvers: [
				VantResolver(),
				ElementPlusResolver(),
				// Auto import icon components
				IconsResolver({ prefix: 'Icon' })
			],
			dts: path.resolve(pathSrc, 'auto-imports.d.ts')
		}),
		Components({
			resolvers: [
				VantResolver(),
				// Auto register icon components
				IconsResolver({ enabledCollections: ['ep'] }),
				// Auto register Element Plus components
				ElementPlusResolver({
					importStyle: 'sass'
				})
			],
			dts: path.resolve(pathSrc, 'components.d.ts')
		}),
		lazyImport({
			resolvers: [
				VxeResolver({
					libraryName: 'vxe-grid'
				})
			]
		}),
		Icons({ autoInstall: true }),
		Inspect(),
		terser({
			compress: {
				drop_console: !isDev,
				drop_debugger: !isDev
			}
		}),
		visualizer({
			gzipSize: true,
			brotliSize: true,
			filename: 'public/renderer/visualizer.html'
		})
	],
	server: {
		port: parseInt(VITE_APP_SERVER_PORT),
		host: VITE_APP_SERVER_HOST,
		open: JSON.parse(VITE_APP_SERVER_OPEN)
	}
}
