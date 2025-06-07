import { singleton } from '.'

export default class Scheduler {
	private maxLength: number
	private counter: number
	private tasks: (() => Promise<void>)[]
	private idleCallbackDelay: number
	private idleCallbackTimer: NodeJS.Timeout | null = null
	private callback: (() => Promise<void>) | null = null

	constructor(limit: number) {
		this.maxLength = limit
		this.counter = 0
		this.tasks = []
		this.idleCallbackDelay = 0
	}

	/**
	 * Adds a new task to the scheduler.
	 * @param task - A function that returns a Promise to be executed.
	 */
	add(task: () => Promise<void>) {
		if (typeof task !== 'function') {
			throw new Error('Task must be a function returning a Promise')
		}

		if (this.idleCallbackTimer) {
			clearTimeout(this.idleCallbackTimer)
			this.idleCallbackTimer = null
		}

		this.tasks.push(task)
		this.run()
	}

	/**
	 * Runs the next available task if there is capacity.
	 */
	private run() {
		if (!this.tasks.length) {
			if (this.idleCallbackDelay > 0 && !this.idleCallbackTimer && this.callback) {
				this.addIdleCallback()
			}
			return
		}

		if (this.maxLength <= this.counter) return
		this.counter++

		const task = this.tasks.shift()!

		task()
			.finally(() => {
				this.counter--
				this.run()
			})
			.catch((error) => {
				this.counter--
				this.run()
				throw new Error(`Task execution failed: ${error}`)
			})
	}

	/**
	 * Adds the idle callback task to the task queue after the idle time delay.
	 */
	private addIdleCallback() {
		if (!this.callback) return
		this.idleCallbackTimer = setTimeout(() => {
			this.idleCallbackTimer = null
			this.idleCallbackDelay = 3 * 60 * 1000
			if (this.tasks.length === 0 && this.counter === 0 && this.callback) {
				const idleTask = this.callback
				this.add(idleTask)
			}
		}, this.idleCallbackDelay)
	}

	/**
	 * Executes the callback when the system is idle.
	 * @param callback - A function returning a Promise to be executed when idle.
	 */
	executeIdleCallback(callback: () => Promise<void>) {
		this.callback = callback
		this.addIdleCallback()
	}

	/**
	 * Cancels any pending idle callback timer.
	 */
	cancelIdleCallback() {
		if (this.idleCallbackTimer) {
			clearTimeout(this.idleCallbackTimer)
			this.idleCallbackTimer = null
		}
		this.callback = null
	}
}

export class DataProcessor {
	// Queue to store asynchronous tasks
	private queue: (() => Promise<void>)[]
	// Flag to check if data is being processed
	private processing: boolean

	constructor() {
		this.queue = [] // Initialize the queue
		this.processing = false // Initially no task is being processed
	}

	// Add an asynchronous processing function to the queue
	addProcessingFunction(processData: () => Promise<void>): void {
		this.queue.push(processData) // Add the asynchronous function to the queue
		this.startProcessing() // Start processing the queue
	}

	// Start processing tasks in the queue
	private async startProcessing(): Promise<void> {
		// Prevent multiple tasks from being processed simultaneously
		if (this.processing) return
		this.processing = true

		// Process each task in the queue sequentially
		while (this.queue.length > 0) {
			const processData = this.queue.shift() // Get and process the first task in the queue
			if (processData) {
				await this.processData(processData) // Wait for the task to complete
			}
		}

		this.processing = false // Mark processing as completed when the queue is empty
	}

	// Execute the provided asynchronous processing function
	private async processData(processData: () => Promise<void>): Promise<void> {
		await processData() // Execute the given asynchronous function
	}
}

const SingScheduler = singleton(Scheduler)
export const singScheduler = new SingScheduler(1)
