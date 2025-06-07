import { ClassNameVarType } from './type'
import { ref, nextTick } from 'vue'
import { debounce, sleep } from '@util'

let isFinishLoadData = false
let variableHeight = 0
let itemHeight = 0
export const currentRender = ref<unknown[]>([])

export const initData = debounce(async (arr: unknown[], currentIndex: number | undefined, containerOrderNode: HTMLDivElement | null) => {
	currentRender.value.length = 0
	isFinishLoadData = false

	!currentRender.value.length && arr[0] && currentRender.value.push(arr[0])
	// view area height : variableHeight
	// scroll space in Y : scrollTop
	// document total list height : getScrollHeight
	const { container, containerItem } = getHeightAtEl()

	if (!containerItem) {
		await nextTick()
		const { container, containerItem } = getHeightAtEl()
		variableHeight = container
		itemHeight = containerItem
	} else {
		variableHeight = container
		itemHeight = containerItem
	}

	const finishLoadDataNumber = currentRender.value.length
	// will reach bottom ?
	const isReachBottom = willReachBottom(finishLoadDataNumber, 0)
	if (!isReachBottom || isFinishLoadData) return
	const scrollTop = currentIndex ? currentIndex * itemHeight : 0
	const loadData = getWillLoadData(finishLoadDataNumber, scrollTop, arr)
	currentRender.value.push(...loadData)
	handlerScrollTopView(currentIndex, containerOrderNode)
}, 100)

export const onScroll = debounce((scroll: { scrollLeft?: number; scrollTop: number }, arr: unknown[]) => {
	const { scrollTop } = scroll
	// finish load data number
	const finishLoadDataNumber = currentRender.value.length
	// will reach bottom ?
	const isReachBottom = willReachBottom(finishLoadDataNumber, scrollTop)
	if (!isReachBottom || isFinishLoadData) return
	const loadData = getWillLoadData(finishLoadDataNumber, scrollTop, arr)
	currentRender.value.push(...loadData)
}, 100)

export const handlerScrollTopView = debounce(async (currentIndex: number | undefined, containerOrderNode: HTMLDivElement | null, arr?: unknown[]) => {
	if (!currentIndex && currentIndex !== 0) return
	const scrollTop = currentIndex * itemHeight
	arr && onScroll({ scrollTop }, arr)
	await sleep(150)
	const container = document.querySelector(`.el-scrollbar.${ClassNameVarType.container}`) as HTMLDivElement
	const containerItem = document.querySelector(`#${ClassNameVarType.containerItem}${currentIndex}`) as HTMLDivElement
	if (!containerItem || !container || !containerOrderNode) return
	const ob = new IntersectionObserver(
		(entries) => {
			const entry = entries[0]
			if (!entry.isIntersecting) {
				const top = currentIndex * containerItem.offsetHeight - (container.offsetHeight - containerItem.offsetHeight) / 2
				containerOrderNode.scrollTo({ top, left: 0 })
			}
			ob.unobserve(containerItem)
		},
		{
			root: container,
			threshold: 1
		}
	)

	ob.observe(containerItem)
}, 100)

// get el height
function getHeightAtEl(): { container: number; containerItem: number } {
	const container = document.querySelectorAll(`.el-scrollbar.${ClassNameVarType.container}`)[0] as HTMLDivElement
	const containerItem = document.querySelectorAll(`.${ClassNameVarType.containerItem}`)[0] as HTMLDivElement
	return {
		container: container?.offsetHeight || 0,
		containerItem: containerItem?.offsetHeight || 0
	}
}

function willReachBottom(totalNumber: number, scrollTop: number) {
	// total height
	const totalHeight = itemHeight * totalNumber
	return scrollTop + variableHeight >= totalHeight - variableHeight
}

function getScrollSize() {
	return Math.ceil(variableHeight / itemHeight)
}

function getneedLoadNumber(scrollTop: number): number {
	const pageSize = getScrollSize()
	return (Math.ceil(scrollTop / variableHeight) + 2) * pageSize
}

function getWillLoadData<T>(finishLoadDataNumber: number, scrollTop: number, totalData: T[]): T[] {
	const totalNumber = totalData.length
	const needLoadNumber = getneedLoadNumber(scrollTop)
	if (needLoadNumber >= totalNumber) {
		isFinishLoadData = true
		return totalData.slice(finishLoadDataNumber)
	}
	return totalData.slice(finishLoadDataNumber, needLoadNumber)
}
