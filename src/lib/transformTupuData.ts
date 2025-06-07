/**
 * Format PRPS data for Zhuhai Huawei Network
 * @param prps - Sensor sampling data as a JSON string
 * @param cycleCount - Number of cycles
 * @param phaseCount - Number of phases
 * @param ampMin - Minimum amplitude (hardware side value)
 * @param ampMax - Maximum amplitude (hardware side value)
 * @returns Formatted PRPS data as a JSON string
 */
export function formatPrpsData(prps: string | string[], cycleCount: number | string, phaseCount: number | string, ampMin: number | string, ampMax: number | string): string {
	prps = typeof prps === 'string' ? JSON.parse(prps) : prps
	cycleCount = Number(cycleCount)
	phaseCount = Number(phaseCount)
	ampMin = Number(ampMin)
	ampMax = Number(ampMax)
	let result = ''
	const step = 360 / phaseCount

	const prpsList: [number, number, number][] = []

	try {
		const ampList: string[] = prps as string[]
		let currentCycle = 0
		let currentPhase = 0

		if (ampList?.length === cycleCount * phaseCount) {
			for (let i = 0; i < ampList.length; i++) {
				const amp = ampList[i]

				let prpsItemList: [number, number, number] = [0, 0, 0]

				if (currentPhase > 0 && currentPhase % phaseCount === 0) {
					prpsItemList = [0, 0, 0]
					currentCycle++
					currentPhase = 0
				}

				const ampValue = parseFloat(amp)

				// Check if amp is within valid range
				if (ampValue < 0 || ampValue > 100) {
					result = JSON.stringify([])
					break
				} else {
					prpsItemList[0] = currentCycle
					prpsItemList[1] = currentPhase

					// Convert normalized value to actual amplitude
					prpsItemList[2] = getRealAmpData(ampValue, ampMin, ampMax)

					prpsList.push(prpsItemList)
					currentPhase += step
				}
			}
		} else {
			result = JSON.stringify([])
			console.error(`format prps data failed: prps size not allowed, prosSize: ${ampList.length}`)
		}
	} catch (e) {
		result = JSON.stringify([])
		// console.error(`format prps data failed: parse prps to array error, prps: ${prps}`, e)
	}

	if (!result) {
		result = JSON.stringify(prpsList)
	}

	return result
}

/**
 * Convert normalized amplitude value to actual amplitude
 * @param ampData - Normalized amplitude value (percentage)
 * @param ampMin - Minimum amplitude (hardware side value)
 * @param ampMax - Maximum amplitude (hardware side value)
 * @returns Actual amplitude value
 */
export function getRealAmpData(ampData: number, ampMin: number, ampMax: number): number {
	if (ampData !== null && ampMax !== null && ampMin !== null) {
		ampData = ampMin + (ampData / 100) * (ampMax - ampMin)
		// @ts-ignore todo ts number
		ampData = parseInt((ampData as number) * 100) / 100 // rounding to two decimal places
	}
	return ampData
}
