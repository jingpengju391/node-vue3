import { h, defineComponent, PropType, watch, useTemplateRef } from 'vue'
import { ClassNameVarType, JsonVirtualContainer } from './type'
import { currentRender, initData, onScroll, handlerScrollTopView } from './scroll'
import './defaultStyle.scss'

export default defineComponent({
	name: 'VirtualList',
	props: {
		list: {
			type: Array as PropType<any[]>,
			default: () => [],
			required: true
		},
		width: [String, Number] as PropType<string | number>,
		currentIndex: {
			type: Number as PropType<number | undefined>,
			default: undefined
		}
	},
	setup(props) {
		const height = ref(0)
		const containerRefNode = useTemplateRef<HTMLDivElement | null>('containerRef')
		const containerOrderNode = useTemplateRef<HTMLDivElement | null>('scrollbarRef')

		watch(
			() => props.list,
			() => initData(props.list, props.currentIndex, containerOrderNode.value)
		)

		watch(
			() => props.currentIndex,
			() => handlerScrollTopView(props.currentIndex, containerOrderNode.value, props.list)
		)

		onMounted(() => {
			height.value = containerRefNode.value?.offsetHeight || 0
			initData(props.list, props.currentIndex, containerOrderNode.value)
		})

		return { containerOrderNode, containerRefNode, height }
	},
	render() {
		const width = typeof this.width === 'string' ? this.width : `${this.width || 100}${this.width ? 'px' : '%'}`
		const style = { width, height: `${this.height}px` }

		const renderView = () =>
			currentRender.value.map((item, index) =>
				h(
					JsonVirtualContainer.HTMLTag,
					{
						class: ClassNameVarType.containerItem,
						id: `${ClassNameVarType.containerItem}${index}`,
						style: {
							display: 'flex'
						}
					},
					this.$slots.default?.({ item, index })
				)
			)

		return h(
			'div',
			{
				class: ClassNameVarType.containerDiv,
				ref: 'containerRef',
				style: {
					display: 'flex',
					width: '100%',
					height: '100%'
				}
			},
			[
				h(
					ElScrollbar,
					{
						ref: 'scrollbarRef',
						class: ClassNameVarType.container,
						style: { ...style, display: currentRender.value.length ? 'block' : 'none' },
						onScroll: (scroll: { scrollLeft: number; scrollTop: number }) => onScroll(scroll, this.list)
					},
					renderView
				),
				h(ElEmpty, { class: 'virtual-list-empty', style: { display: !currentRender.value.length ? 'flex' : 'none' }, description: '暂无数据' })
			]
		)
	}
})
