import { resolvePath } from './util'

export default {
	'@': resolvePath('../src/renderer'),
	'@components': resolvePath('../src/renderer/components'),
	'@shared': resolvePath('../src/shared'),
	'@lib': resolvePath('../src/lib'),
	'@util': resolvePath('../src/util'),
	'@assets': resolvePath('../src/renderer/assets'),
	'@directives': resolvePath('../src/renderer/directives'),
	'@stores': resolvePath('../src/renderer/stores'),
	'@utils': resolvePath('../src/renderer/utils'),
	'@hooks': resolvePath('../src/renderer/hooks'),
	'@service': resolvePath('../src/service'),
	'@server': resolvePath('../src/server')
}
