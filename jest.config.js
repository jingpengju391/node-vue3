module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': 'ts-jest'
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/']
}
