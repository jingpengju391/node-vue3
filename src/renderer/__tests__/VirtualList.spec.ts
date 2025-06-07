import { mount } from '@vue/test-utils'
import VirtualList from '../components/VirtualList' // Assuming the component file is named VirtualList.vue
import { nextTick } from 'vue'
import { ElEmpty, ElScrollbar } from 'element-plus'

describe('VirtualList Component', () => {
	const generateLargeData = (length: number) => {
		return new Array(length).fill(null).map((_, index) => ({ id: index, name: `Item ${index}` }))
	}

	it('renders a list of items correctly', async () => {
		const list = generateLargeData(100) // Generate 100 items of data

		const wrapper = mount(VirtualList, {
			global: {
				components: {
					ElEmpty,
					ElScrollbar
				}
			},
			props: {
				list,
				height: 500,
				width: 300
			},
			slots: {
				default: ({ item }) => {
					return `<div class="item">${item.name}</div>`
				}
			}
		})

		await nextTick() // Wait for the component to finish rendering

		// Verify that 100 items are rendered
		expect(wrapper.findAll('.item').length).toBe(100)
	})

	it('handles performance for large lists', async () => {
		const list = generateLargeData(10000) // Generate 10000 items of data

		const start = performance.now()
		mount(VirtualList, {
			props: {
				list,
				height: 500,
				width: 300
			},
			slots: {
				default: ({ item }) => {
					return `<div class="item">${item.name}</div>`
				}
			}
		})
		await nextTick() // Wait for the component to finish rendering
		const end = performance.now()

		// Check that rendering 10,000 items takes less than 500ms
		expect(end - start).toBeLessThan(500)
	})

	it('handles empty list gracefully', async () => {
		const list = []

		const wrapper = mount(VirtualList, {
			props: {
				list,
				height: 500,
				width: 300
			},
			slots: {
				default: ({ item }) => {
					return `<div class="item">${item.name}</div>`
				}
			}
		})

		await nextTick() // Wait for the component to finish rendering

		// Ensure that the 'No data available' message is rendered
		expect(wrapper.find('.el-empty').exists()).toBe(true)
	})

	it('responds to scroll events', async () => {
		const list = generateLargeData(1000)
		const wrapper = mount(VirtualList, {
			props: {
				list,
				height: 500,
				width: 300
			},
			slots: {
				default: ({ item }) => {
					return `<div class="item">${item.name}</div>`
				}
			}
		})

		await nextTick()

		// Simulate a scroll event
		const scrollContainer = wrapper.find('.el-scrollbar')
		await scrollContainer.trigger('scroll')

		// After the scroll event, verify that onScroll was triggered (you can add a log or spy in the component to verify)
		expect(wrapper.emitted('scroll')).toBeTruthy()
	})

	it('adjusts rendering when height or width is changed', async () => {
		const list = generateLargeData(100)

		const wrapper = mount(VirtualList, {
			props: {
				list,
				height: 500,
				width: 300
			},
			slots: {
				default: ({ item }) => {
					return `<div class="item">${item.name}</div>`
				}
			}
		})

		await nextTick()

		// Initially, it should render 100 items
		expect(wrapper.findAll('.item').length).toBe(100)

		// Change width or height
		await wrapper.setProps({ width: 500 })
		await nextTick()

		// Ensure the component re-renders correctly
		expect(wrapper.findAll('.item').length).toBe(100)
	})
})
