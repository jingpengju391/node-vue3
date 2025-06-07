import { WorkOrder, SubWork, SubWorkOrderPoint, DetectMode, DetectMethodToMainTaskTypeCode } from '@shared/dataModelTypes/WorkOrder'
import { groupByWithKeyExtractor } from '@shared/functional'
import { convertNumberString, splitNumber } from '@util/index'

export default class BuilderBusiness {
	/**
	 * Builds a task description XML structure for a given work order, sub-work, and points.
	 * The clearance is determined based on the mode.
	 *
	 * @param work The work order to process.
	 * @param subwork The sub-work order details.
	 * @param points A Map of workDetailId to SubWorkOrderPoint array.
	 * @param mode The detection mode (used to determine how clearance is handled).
	 * @returns The task description in XML format.
	 */
	static buildTaskDescription(work: WorkOrder, subwork: SubWork, points: SubWorkOrderPoint[], mode: DetectMode) {
		return {
			version: ['1.0'], // Version of the task description schema
			main_task: [
				{
					$: {
						id: convertNumberString(`${work.workId}`, 'hex'), // Work order ID (hexadecimal string)
						name: work.workName, // Name of the work order
						type: DetectMethodToMainTaskTypeCode[subwork.detectMethod] // Detection method for the sub-work
					},
					sub_task: [
						{
							$: {
								id: convertNumberString(`${subwork.subWorkId}`, 'hex'), // Sub-work order ID (hexadecimal string)
								name: subwork.detectMethodCn // Name of the detection method in Chinese
							},
							clearance: this.#getClearanceByMode(mode)?.call(this, points, mode) ?? [] // Clearance based on the mode
						}
					]
				}
			]
		}
	}

	// A map that associates detection modes with their corresponding clearance building functions
	static readonly #modeHandlerMap: Map<number, (points: SubWorkOrderPoint[], mode: DetectMode) => any[]> = new Map([
		[1, BuilderBusiness.#buildClearanceMode_1],
		[2, BuilderBusiness.#buildClearanceMode_2],
		[3, BuilderBusiness.#buildClearanceMode_3]
	] as readonly [number, (points: SubWorkOrderPoint[], mode: DetectMode) => any[]][])

	/**
	 * Gets the appropriate clearance building function based on the mode.
	 *
	 * @param mode The detection mode.
	 * @returns The function responsible for building clearance for the given mode.
	 */
	static #getClearanceByMode(mode: number) {
		return this.#modeHandlerMap.get(mode) // Retrieves the corresponding function from the mode handler map
	}

	/**
	 * Builds the clearance data for mode 1.
	 *
	 * @param points A Map of workDetailId to SubWorkOrderPoint array.
	 * @returns An array of clearance data for mode 1.
	 */
	static #buildClearanceMode_1(points: SubWorkOrderPoint[], mode: DetectMode) {
		const types = ['GIS', '开关柜', '主变', '其他'] // Predefined point types
		const pointMap = this.#categorizepointsForXml(points, types, mode) // Categorize the points based on the types
		return types.map((type, index) => ({
			$: { id: String(index + 1), name: type, sn: String(index + 1) }, // Clearance info (id, name, sn)
			test_point: pointMap[type] // point points for the current type
		}))
	}

	/**
	 * Builds the clearance data for mode 2.
	 *
	 * @param points A Map of workDetailId to SubWorkOrderPoint array.
	 * @returns An array of clearance data for mode 2.
	 */
	static #buildClearanceMode_2(points: SubWorkOrderPoint[], _mode: DetectMode) {
		const groupMap = groupByWithKeyExtractor(points, (point) => point.groupId)
		return Object.keys(groupMap).map((groupId) => {
			return {
				$: { id: groupId, name: `${groupMap[groupId][0].deviceName}${groupMap[groupId][0].detectPositionName}`, sn: groupMap[groupId][0].groupOrder }, // Clearance info (id, name, sn)
				test_point: groupMap[groupId].map((point) => {
					const [_pointCode, _mode, _workDetailType, workDetailIndex] = splitNumber(point.workDetailId, [18, 1, 1, 0])
					const name = workDetailIndex === 1 ? point.deviceName : `第${workDetailIndex - 1}(次)增测${point.deviceName}`
					return {
						$: {
							id: convertNumberString(`${point.workDetailId}`, 'hex'),
							name,
							part: point.detectPositionName,
							sn: point.orderNumber
						}
					}
				})
			}
		})
	}

	/**
	 * Builds the clearance data for mode 3.
	 *
	 * @param points A Map of workDetailId to SubWorkOrderPoint array.
	 * @returns An array of clearance data for mode 3.
	 */
	static #buildClearanceMode_3(points: SubWorkOrderPoint[], _mode: DetectMode) {
		return [
			{
				$: { id: '1', name: 'temp', sn: '1' }, // Clearance info (id, name, sn)
				test_point: points.map((point, index) => {
					return {
						$: {
							id: convertNumberString(`${point.workDetailId}`, 'hex'),
							name: point.deviceName,
							part: point.detectPositionName,
							sn: index + 1,
							device_type_id: point.deviceType,
							device_type_name: point.deviceTypeName,
							status: point.status
						}
					}
				})
			}
		]
	}

	/**
	 * Categorizes the points for XML output based on their device type.
	 * points are classified into predefined types and categorized accordingly.
	 *
	 * @param points A Map of workDetailId to SubWorkOrderPoint array.
	 * @param types A list of types to categorize the points into.
	 * @returns A Map of types to an array of test points for each type.
	 */
	static #categorizepointsForXml(points: SubWorkOrderPoint[], types: string[], _mode: DetectMode) {
		const typeMap = new Map<string, any[]>([...types, '其他'].map((type) => [type, []]))
		let sn = 0

		for (const point of points) {
			const deviceType = point.deviceTypeName
			const key = typeMap.has(deviceType) ? deviceType : '其他'

			const testPoint = {
				$: {
					id: convertNumberString(`${point.workDetailId}`, 'hex'),
					name: point.deviceName,
					part: point.detectPositionName,
					sn: sn++
				}
			}

			typeMap.get(key)?.push(testPoint)
		}

		return Object.fromEntries(typeMap)
	}
}
