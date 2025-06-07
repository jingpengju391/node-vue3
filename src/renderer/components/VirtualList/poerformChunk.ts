const chunkSplitor = ((): ((task: (timeLeft: (time: number) => boolean) => void) => void) => {
	if (globalThis.requestIdleCallback) {
		return (task: (timeLeft: (time: number) => boolean) => void): void => {
			globalThis.requestIdleCallback((deadline) => {
				const hasTime = (time: number): boolean => time < deadline.timeRemaining()
				task(hasTime)
			})
		}
	} else {
		return (task: (timeLeft: (time: number) => boolean) => void): void => {
			setTimeout(() => {
				task((time) => time < 16)
			}, 30)
		}
	}
})()

export default function performChunk<T>(datas: T[], callback: (data: T, index: number) => void): void {
	datas = Array.isArray(datas) ? datas : [datas]

	if (datas.length === 0) return

	let i = 0

	function _run(): void {
		if (i === datas.length) return
		chunkSplitor((hasTime: (time: number) => boolean): void => {
			const now = Date.now()
			while (hasTime(Date.now() - now) && i < datas.length) {
				callback(datas[i], i)
				i++
			}
			_run()
		})
	}
	_run()
}
