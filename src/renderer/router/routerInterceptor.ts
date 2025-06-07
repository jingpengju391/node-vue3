import { formatDateTime } from '@util/index'
import { storage } from '@lib/storage'
import { process } from '@hooks/api'
const loginRoutePath = ['/', '/LoginView']

export const routeBeforeEach = (to, _from, next) => {
	if (!loginRoutePath.includes(to.path)) {
		const loginTime = storage.get('loginTime')
		const currentTime = formatDateTime('YYYY MM DD')
		if (loginTime && loginTime !== currentTime) {
			ElNotification({
				title: '提示',
				dangerouslyUseHTMLString: true,
				message: '<strong>登录 <i>已过期</i> ，请重新登录</strong>',
				type: 'info'
			})
			return next(loginRoutePath[0])
		}
	} else {
		const lastVisitedPath = storage.get('lastVisitedPath')
		if (lastVisitedPath && !loginRoutePath.includes(lastVisitedPath)) {
			const targetURL = loginRoutePath.includes(to.path) ? lastVisitedPath || '/' : to.path
			return next(targetURL)
		}
	}

	next()
}

export const routeAfterEach = (to) => {
	storage.set('lastVisitedPath', to.path)
	if (!to.meta.infrared) {
		process.stopPollInfraredFiles()
		process.stopTTS()
	}
}
