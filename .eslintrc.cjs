/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
	extends: [
		'eslint:recommended',
		'plugin:vue/vue3-recommended',
		'@electron-toolkit',
		'@electron-toolkit/eslint-config-ts/eslint-recommended',
		'@vue/eslint-config-typescript/recommended',
		'@vue/eslint-config-prettier'
	],
	ignorePatterns: ['**/*.d.ts', 'cypress/**', 'cypress.config.ts'],
	rules: {
		'vue/require-default-prop': 'off',
		'vue/multi-word-component-names': 'off',
		indent: ['off', 'tab'],
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				vars: 'all',
				args: 'after-used',
				ignoreRestSiblings: false,
				argsIgnorePattern: '^_'
			}
		]
	},
	overrides: [
		{
			files: ['src/shared/**/*.ts', 'src/shared/**/*.d.ts'],
			rules: {
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-unused-vars': 'off',
				'@typescript-eslint/ban-types': 'off',
				'prefer-rest-params': 'off'
			}
		},
		{
			files: [
				'src/service/httpClient/*.ts',
				'src/service/mqtt/index.ts',
				'src/renderer/utils/*.ts',
				'src/util/*.ts',
				'src/lib/XmlParser.ts',
				'src/renderer/router/index.ts',
				'src/renderer/stores/definition.ts',
				'src/service/socket/index.ts',
				'src/renderer/components/JsonVirtualTable/*',
				'src/renderer/components/VirtualList/*'
			],
			rules: {
				'@typescript-eslint/no-explicit-any': 'off'
			}
		},
		{
			files: ['src/renderer/stores/definition.ts'],
			rules: {
				'@typescript-eslint/no-empty-interface': 'off'
			}
		}
	]
}
