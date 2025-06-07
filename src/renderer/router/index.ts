import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { routeBeforeEach, routeAfterEach } from './routerInterceptor'

// Get all page modules and components
const pages = import.meta.glob<Record<string, () => Promise<any>>>(`../views/**/page.ts`, {
	eager: true, // Load modules eagerly at build time
	import: 'default' // Import the default export from each page module
})

const components = import.meta.glob<Record<string, () => Promise<any>>>(`../views/**/Index.vue`)

// Define the route configuration type
const routes: Array<RouteRecordRaw> = Object.entries(pages).map(([path, meta]) => {
	// Get the component path by replacing `/page.ts` with `/Index.vue`
	const compPath = path.replace('/page.ts', '/Index.vue')
	const component = components[compPath] // Retrieve the component from components map

	// Process the path: remove `../views` and `/page.ts`
	path = path.replace(/^\.{2}\/views|\/page\.ts$/g, '') || '/'

	// Generate the route name by splitting the path and joining parts with a hyphen
	const name = path.split('/').filter(Boolean).join('-') || 'index'

	if (!meta?.disablePreload && component) {
		component()
	}

	// Return the route object with path, name, component, and meta
	return {
		path,
		name,
		component,
		meta
	}
})

// / redirect path LoginView
routes.push({
	path: '/',
	redirect: '/LoginView'
})

// Create the router instance with history mode and the defined routes
const router = createRouter({
	history: createWebHashHistory(), // Using hash-based history mode
	routes // The routes defined above
})

// Set up route guards
router.beforeEach(routeBeforeEach)
router.afterEach(routeAfterEach)

export default router
