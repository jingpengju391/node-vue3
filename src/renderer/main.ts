import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Skeleton from '@x-ui-vue3/skeleton'
import { VxeGrid } from 'vxe-table'
import router from '@/router' // Import the router configuration
import { Icon } from 'vant'
import App from './App.vue'
import { isDev } from './hooks/api'
import directives from './directives' // Import custom Vue directives
import './assets/normalize.css' // Import global CSS for normalizing styles across browsers
import 'vxe-table/lib/style.css'
import './themes/vxe-table.scss'
import './assets/keyboard-styles.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Use the router to enable navigation between views
app.use(router)

// Use Vant's Icon component globally
app.use(Icon)

app.use(Skeleton)

app.use(VxeGrid)

// Register custom directives
directives(app)

// Set the initial route to LoginView
router.replace('/LoginView')

app.mount('#app')

// Set the HTML cursor style to 'none' in production mode for enhanced UX or restricted interaction
// In development mode, keep the cursor visible
document.documentElement.style.cursor = isDev ? 'auto' : 'none'
