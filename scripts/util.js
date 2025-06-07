import path from 'path'
import fs from 'fs'
import { loadEnv } from 'vite'

// Function to resolve a path relative to the current directory
export const resolvePath = (p) => path.resolve(__dirname, p)

// Function to get the directory path for the build output
// processName is the subdirectory name (default is 'renderer')
export function dirPath(processName = 'renderer') {
	// Get the current mode (development or production)
	const mode = process.env.NODE_ENV || 'development'

	// Load environment variables for the current mode
	const { VITE_APP_BUILD_OUTPUTDIR } = loadEnv(mode, process.cwd())

	// Return the resolved directory path for the build output
	return resolvePath(`../${VITE_APP_BUILD_OUTPUTDIR}/${processName}`)
}

// Check if the current environment is development mode
export const isDev = process.env.NODE_ENV === 'development'

// Function to get the optimized dependencies for Element Plus and Vant
export function getOptimizeDepsIncludes() {
	const optimizeDepsIncludes = []

	// If it's not in development mode, return an empty array
	if (!isDev) return optimizeDepsIncludes

	// Define the paths for Element Plus and Vant components
	const elementPlusPath = path.resolve('node_modules', 'element-plus', 'es', 'components')
	const vantPath = path.resolve('node_modules', 'vant', 'es')

	// add base dependencies for Element Plus and Vant
	optimizeDepsIncludes.push('element-plus/es', 'vant/es')

	// process Element Plus components
	if (fs.existsSync(elementPlusPath)) {
		// Iterate through each component in Element Plus and check for its styles
		fs.readdirSync(elementPlusPath).forEach((dirname) => {
			const stylePath = path.join(elementPlusPath, dirname, 'style', 'css.mjs')
			// If the style exists, include it in the optimization list
			if (fs.existsSync(stylePath)) {
				optimizeDepsIncludes.push(`element-plus/es/components/${dirname}/style/css`)
			}
		})
	} else {
		// Warn if the Element Plus directory is not found
		console.warn('element Plus directory not found, it may not be installed correctly')
	}

	// process Vant components (excluding unnecessary directories)
	const excludedDirs = new Set(['utils', 'style', 'composables'])
	if (fs.existsSync(vantPath)) {
		// Iterate through each component in Vant and include styles, excluding unnecessary directories
		fs.readdirSync(vantPath)
			.filter((dirName) => {
				const fullPath = path.join(vantPath, dirName)
				// Include only directories that are not in the excluded list
				return fs.statSync(fullPath).isDirectory() && !excludedDirs.has(dirName)
			})
			.forEach((dirName) => {
				optimizeDepsIncludes.push(`vant/es/${dirName}/style/index`)
			})
	} else {
		// Warn if the Vant directory is not found
		console.warn('vant directory not found, it may not be installed correctly')
	}

	// Return the final list of optimized dependencies
	return optimizeDepsIncludes
}
