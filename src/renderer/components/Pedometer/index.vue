<template>
	<div class="stepper-container">
		<button class="stepper-button" :disabled="isMinDisabled" @click="decrement" @mousedown="startDecrementHold" @mouseup="stopHold" @mouseleave="stopHold">-</button>

		<div class="stepper-input-wrapper">
			<input ref="inputRef" v-numkeyboard="keyboardOptions" class="stepper-input" type="text" :value="displayValue" />
		</div>

		<button class="stepper-button" :disabled="isMaxDisabled" @click="increment" @mousedown="startIncrementHold" @mouseup="stopHold" @mouseleave="stopHold">+</button>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue'

export default defineComponent({
	name: 'Pedometer',
	props: {
		modelValue: {
			type: [Number, String],
			default: 0
		},
		min: {
			type: Number,
			default: -Infinity
		},
		max: {
			type: Number,
			default: Infinity
		},
		step: {
			type: Number,
			default: 1
		},
		precision: {
			type: Number,
			default: 1,
			validator: (value: number) => value >= 0 && value <= 10
		}
	},
	emits: ['update:modelValue', 'change'],
	setup(props, { emit }) {
		const inputRef = ref<HTMLInputElement | null>(null)
		const holdInterval = ref<number | null>(null)
		const isManualInput = ref(false)
		const displayValue = ref('')

		// 键盘配置
		const keyboardOptions = computed(() => ({
			min: props.min,
			max: props.max,
			precision: props.precision,
			onChange: (value: string) => {
				handleKeyboardChange(value)
			}
		}))

		// 当前值
		const currentValue = computed({
			get: () => {
				if (isManualInput.value) {
					return parseFloat(displayValue.value) || 0
				}
				return typeof props.modelValue === 'number' ? props.modelValue : parseFloat(props.modelValue) || 0
			},
			set: (value) => {
				emit('update:modelValue', value)
				emit('change', value)
			}
		})

		// 是否达到最小值
		const isMinDisabled = computed(() => {
			return currentValue.value <= props.min
		})

		// 是否达到最大值
		const isMaxDisabled = computed(() => {
			return currentValue.value >= props.max
		})

		// 初始化显示值
		const initDisplayValue = () => {
			if (typeof props.modelValue === 'number') {
				displayValue.value = formatValue(props.modelValue)
			} else {
				const numValue = parseFloat(props.modelValue)
				displayValue.value = isNaN(numValue) ? '' : formatValue(numValue)
			}
		}

		// 获取当前值的小数位数
		const getDecimalPlaces = (value: number | string) => {
			const strValue = value.toString()
			const decimalIndex = strValue.indexOf('.')
			return decimalIndex === -1 ? 0 : strValue.length - decimalIndex - 1
		}

		// 格式化值
		const formatValue = (value: number) => {
			if (isNaN(value)) return ''

			// 获取当前值的小数位数
			const decimalPlaces = getDecimalPlaces(value)

			// 如果小数位数小于等于精度限制，直接返回
			if (decimalPlaces <= props.precision) {
				return value.toString()
			}

			// 否则按照精度限制格式化
			return value.toFixed(props.precision)
		}

		// 处理键盘输入变化
		const handleKeyboardChange = (value: string) => {
			displayValue.value = value
			isManualInput.value = true
			// 如果是空值或'-'，暂时不处理
			if (value === '' || value === '-') {
				return
			}

			const numValue = parseFloat(value)
			if (!isNaN(numValue)) {
				const clampedValue = clampValue(numValue)
				if (clampedValue !== numValue) {
					displayValue.value = formatValue(clampedValue)
				}
				currentValue.value = clampedValue
			}
		}

		// 限制数值范围
		const clampValue = (value: number) => {
			return Math.min(Math.max(value, props.min), props.max)
		}

		// 增加数值
		const increment = () => {
			const current = currentValue.value
			const decimalPlaces = getDecimalPlaces(displayValue.value)
			const step = decimalPlaces > 0 ? parseFloat(props.step.toFixed(decimalPlaces)) : props.step
			const newValue = parseFloat((current + step).toFixed(decimalPlaces))
			const clampedValue = clampValue(newValue)
			displayValue.value = formatValue(clampedValue)
			currentValue.value = clampedValue
			isManualInput.value = false
		}

		// 减少数值
		const decrement = () => {
			const current = currentValue.value
			const decimalPlaces = getDecimalPlaces(displayValue.value)
			const step = decimalPlaces > 0 ? parseFloat(props.step.toFixed(decimalPlaces)) : props.step
			const newValue = parseFloat((current - step).toFixed(decimalPlaces))
			const clampedValue = clampValue(newValue)
			displayValue.value = formatValue(clampedValue)
			currentValue.value = clampedValue
			isManualInput.value = false
		}

		// 开始长按增加
		const startIncrementHold = () => {
			holdInterval.value = window.setInterval(increment, 200)
		}

		// 开始长按减少
		const startDecrementHold = () => {
			holdInterval.value = window.setInterval(decrement, 200)
		}

		// 停止长按
		const stopHold = () => {
			if (holdInterval.value) {
				clearInterval(holdInterval.value)
				holdInterval.value = null
			}
		}

		// 监听modelValue变化
		watch(
			() => props.modelValue,
			(newVal) => {
				if (!isManualInput.value) {
					if (typeof newVal === 'number') {
						displayValue.value = formatValue(newVal)
					} else {
						const numValue = parseFloat(newVal)
						displayValue.value = isNaN(numValue) ? '' : formatValue(numValue)
					}
				}
			}
		)

		// 初始化
		initDisplayValue()

		return {
			inputRef,
			displayValue,
			isMinDisabled,
			isMaxDisabled,
			keyboardOptions,
			increment,
			decrement,
			startIncrementHold,
			startDecrementHold,
			stopHold
		}
	}
})
</script>

<style scoped>
.stepper-container {
	display: flex;
	align-items: center;
	border-radius: 4px;
	overflow: hidden;
}

.stepper-button {
	width: 84px;
	height: 84px;
	background: #f5f7fa;
	border: none;
	color: #0d867f;
	font-size: 60px;
	font-weight: 300;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	user-select: none;
	&:nth-child(1) {
		border-radius: 6px 0 0 6px;
	}
	&:nth-child(2) {
		border-radius: 0 6px 6px 0;
	}
}

.stepper-button:disabled {
	color: #c0c4cc;
	cursor: not-allowed;
	background-color: #f5f7fa;
}

.stepper-button:active:not(:disabled) {
	background-color: #d9ecff;
}

.stepper-input-wrapper {
	flex: 1;
}

.stepper-input {
	width: 196px;
	height: 84px;
	background: #f5f7fa;
	border: none;
	text-align: center;
	font-size: 14px;
	font-size: 45px;
	color: #333333;
	outline: none;
	padding: 0 5px;
	margin: 0 6px;
}
</style>
