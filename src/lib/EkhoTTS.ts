import { spawn, exec, ChildProcessWithoutNullStreams } from 'child_process'
import { singleton, sleep } from '@util'
import { isLinux, isWin } from '@util/process'

/**
 * EkhoTTS provides text-to-speech functionality using Ekho on Linux
 * and PowerShell + System.Speech.Synthesis on Windows.
 */
class EkhoTTS {
	private ekhoPath: string = '/usr/local/bin/ekho' // Path to Ekho binary on Linux
	private voiceGuide: boolean = false // Control whether voice guide is enabled
	private currentTxt: string = '' // Current text to be spoken
	private speechProcess: ChildProcessWithoutNullStreams | null = null // Currently running speech process
	private isPlaying: boolean = false // Whether speech is currently playing
	private loopToken: number = 0

	/**
	 * Public method to trigger TTS for given text.
	 * Uses debounced wrapper to prevent overlapping or spamming.
	 * @param text Text to speak
	 */
	speak = this._debounceQueue(async (text: string) => {
		text = this.stringToCN(text) || '' // Convert text to Chinese if needed
		if (text !== this.currentTxt) {
			this.currentTxt = text
			this.isPlaying = true
			this.loopToken++
			await this.playLoop(this.loopToken)
		}
	})

	/**
	 * Stops any ongoing speech playback and disables voice guide.
	 * Uses debounce to limit rapid repeated stop calls.
	 */
	stop = this._debounceQueue(async () => {
		this.currentTxt = ''
		this.isPlaying = false
		await this.killEkho()
	})

	/**
	 * Updates the voice guide toggle.
	 * @param voiceGuide Boolean flag to enable/disable repeating voice guide
	 */
	updatedVoiceGuide(voiceGuide: boolean) {
		this.voiceGuide = voiceGuide
	}

	/**
	 * Main loop for repeating speech playback while guide is enabled.
	 * Will continue speaking `currentTxt` every 5 seconds until stopped.
	 */
	private async playLoop(token: number) {
		while (this.voiceGuide && this.isPlaying === true && token === this.loopToken) {
			await this.killEkho() // Stop previous playback if any
			await this.playSpeech(this.currentTxt) // Speak current text
			if (!this.isPlaying || token !== this.loopToken) break // Check for stop signal
			await sleep(20000) // Wait before repeating
		}
	}

	/**
	 * Plays the given text using platform-specific TTS engine.
	 * On Windows, uses PowerShell with System.Speech.Synthesis.
	 * On Linux, invokes ekho binary.
	 * @param text Text to speak
	 * @returns Resolves when speech completes
	 */
	private playSpeech(text: string): Promise<void> {
		return new Promise((resolve, reject) => {
			let cmd: string
			let args: string[]

			if (isWin) {
				// Use PowerShell to invoke Windows built-in speech
				cmd = 'powershell.exe'
				args = [
					'-Command',
					`Add-Type -AssemblyName System.speech;` +
						`$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;` +
						`$speak.Volume = 100;` +
						`$speak.Rate = 0;` +
						`$speak.Speak('${text.replace(/'/g, "''")}')`
				]
			} else {
				// Use Ekho for speech synthesis on Linux
				cmd = this.ekhoPath
				args = ['-a', '100', '-s', '-10', text]
			}

			// Launch speech process
			this.speechProcess = spawn(cmd, args)

			// Handle error in spawning
			this.speechProcess.on('error', (err) => {
				logger.error(`Speech playback error: ${err}`)
				reject(err)
			})

			// Handle process exit
			this.speechProcess.on('exit', () => {
				logger.log('Speech playback finished')
				resolve()
			})
		})
	}

	/**
	 * Kills any currently running Ekho (or speech) process.
	 * Ensures no overlapping speech happens.
	 * @returns Resolves after kill completes
	 */
	private killEkho(): Promise<void> {
		return new Promise((resolve) => {
			if (isLinux) {
				// Kill all Ekho processes on Linux
				exec('killall ekho', (err, _stdout, _stderr) => {
					if (err) {
						logger.warn(`Error stopping ekho: ${err.message}`)
					} else {
						logger.log('Previous ekho playback terminated')
					}
					resolve()
				})
			} else {
				// Kill PowerShell-based speech process on Windows
				if (this.speechProcess) {
					this.speechProcess.kill()
					this.speechProcess = null
				}
				resolve()
			}
		})
	}

	/**
	 * Utility method to debounce and queue async function calls.
	 * Useful for controlling repeated triggers of speak/stop.
	 * @param fn The target function to debounce
	 * @param delay Delay in milliseconds (default 600ms)
	 * @returns Wrapped function with debounce logic
	 */
	private _debounceQueue<T extends (...args: any[]) => void>(fn: T, delay: number = 600): (...args: Parameters<T>) => void {
		const timers = new Map<string, NodeJS.Timeout>() // Timer map per unique args

		const getKey = (args: Parameters<T>): string => JSON.stringify(args) // Generate key

		return (...args: Parameters<T>): void => {
			const key = getKey(args)
			if (timers.has(key)) clearTimeout(timers.get(key)!)

			timers.set(
				key,
				setTimeout(() => {
					fn(...args)
					timers.delete(key)
				}, delay)
			)
		}
	}

	private stringToCN(outputStr: string | null): string | null {
		if (outputStr == null) return null

		const str = outputStr.replace(/k[vV]|K[Vv]/g, '千伏').replace(/相/g, '象')
		return str.replace(/\d+/g, (match: string) => this.numberToCN(match))
	}

	private numberToCN(numberStr: string): string {
		const digitArr = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
		return numberStr
			.split('')
			.map((char) => digitArr[parseInt(char, 10)])
			.join('')
	}
}

// Export singleton instance
const tts = singleton(EkhoTTS)
export default new tts()
