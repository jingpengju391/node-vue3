import { v4 as uuid } from 'uuid'
import { process } from '@hooks/api'
import { KeyIdDelimiter } from '@shared/dataModelTypes/helpers'
import { User } from '@shared/dataModelTypes/login'
import {
	AdoptStatus,
	AnchorWorkOrder,
	SimplifiedGroup,
	SubWork,
	SubWorkBasics,
	SubWorkOrderPoint,
	SubWorkOrderWithRequiredId,
	WorkOrder,
	WorkOrderWithRequiredId,
	SubWorkStatusMap,
	CompleteGroup,
	SubWorkOrdePointrWithRequiredId,
	DBPointFile,
	PointFile,
	PointFileStatus,
	PointFileType,
	WorkDetailType,
	GS,
	DetectMode,
	PointFileWithoutId,
	FileKey,
	UploadFileInfo,
	PointFileTypeEnum,
	PointDetectStatus,
	FileType,
	WorkOrderStatus
} from '@shared/dataModelTypes/WorkOrder'
import { groupByWithKeyExtractor, omit } from '@shared/functional'
import { quickSort } from '@util/index'

export class workOrderDataSource {
	#workOrderMap = new Map<string, WorkOrder>()
	#subWorkOrderMap = new Map<string, SubWork>()
	#subWorkOrderWithWUIdMap = new Map<string, Map<string, SubWork>>()
	#sortOrderMap = [1, 0, 2, 10]
	#pointMap = new Map<string, SubWorkOrderPoint>()
	#pointWithWUIdMap = new Map<string, Map<string, SubWorkOrderPoint[]>>()
	#files = new Map<number, PointFile>()
	#filesGroup = new Map<string, PointFile[]>()
	#fileUpload = new Map<number, PointFile>()
	#fileError = new Map<number, PointFile>()
	#temporaryInfrared = new Map<string, number[]>()

	addNewAnchorEntriesToWorkOrderMap(newEntries: AnchorWorkOrder[]) {
		newEntries.forEach((entry) => {
			this.#workOrderMap.set(<string>entry.workId, {
				...entry,
				detectMethods: JSON.parse(entry.detectMethods)
			})
		})
	}

	addNewEntriesToWorkOrderMap(newEntries: WorkOrder[]) {
		newEntries.forEach((entry) => {
			this.#workOrderMap.set(<string>entry.workId, entry)
		})
	}

	addNewSubWorksEntriesToUserMap(newEntries: SubWork[]) {
		newEntries.forEach((entry) => {
			entry.mode = SubWorkStatusMap[entry.detectMethod]
			const keys = [entry.workId, entry.subWorkId]
			const keyString = keys.join(KeyIdDelimiter)
			if (this.#subWorkOrderMap.has(keyString)) {
				const subWork = this.#subWorkOrderMap.get(keyString)!
				Object.assign(subWork, entry)
			} else {
				this.#subWorkOrderMap.set(keyString, entry)
			}

			this.addNewSubWorkWUEntriesToUserMap(this.#subWorkOrderMap.get(keyString)!)
		})
	}

	addNewSubWorkWUEntriesToUserMap(entry: SubWork) {
		const keys = [entry.workId]
		const keyString = keys.join(KeyIdDelimiter)
		if (!this.#subWorkOrderWithWUIdMap.has(keyString)) {
			this.#subWorkOrderWithWUIdMap.set(keyString, new Map<string, SubWork>())
		}
		this.#subWorkOrderWithWUIdMap.get(keyString)?.set(entry.subWorkId, entry)
	}

	addNewSubWorkPointsEntriesToUserMap(newEntries: SubWorkOrderPoint[]) {
		newEntries.forEach((entry) => {
			const keys = [entry.workId, entry.subWorkId, entry.groupId, entry.workDetailId]
			const keyString = keys.join(KeyIdDelimiter)
			if (this.#pointMap.has(keyString)) {
				const point = this.#pointMap.get(keyString)!
				Object.assign(point, entry)
			} else {
				this.#pointMap.set(keyString, entry)
			}
			this.addNewSubWorkPointWUEntriesToUserMap(this.#pointMap.get(keyString)!)
		})
	}

	addNewSubWorkPointWUEntriesToUserMap(entry: SubWorkOrderPoint) {
		const keys = [entry.workId, entry.subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		const entryWork = this.#pointWithWUIdMap.get(keyString)
		if (!entryWork) {
			this.#pointWithWUIdMap.set(keyString, new Map<string, SubWorkOrderPoint[]>())
		}

		const findResult = this.#pointWithWUIdMap
			.get(keyString)
			?.get(entry.groupId)
			?.find((point) => point.workDetailId === entry.workDetailId)

		if (findResult) {
			Object.assign(findResult, entry)
		} else {
			if (!this.#pointWithWUIdMap.get(keyString)?.has(entry.groupId)) {
				this.#pointWithWUIdMap.get(keyString)?.set(entry.groupId, [])
			}
			this.#pointWithWUIdMap.get(keyString)?.get(entry.groupId)?.push(entry)
		}
	}

	addNewFilesEntriesToUserMap(newEntries: PointFile[]) {
		newEntries.forEach((entry) => {
			if (this.#files.has(entry.id)) {
				const file = this.#files.get(entry.id)!
				Object.assign(file, entry)
			} else {
				this.#files.set(entry.id, entry)
			}

			const file = this.#files.get(entry.id)!
			const keys = [entry.workId, entry.subWorkId, entry.groupId]
			const keyString = keys.join(KeyIdDelimiter)
			if (!this.#filesGroup.has(keyString)) {
				this.#filesGroup.set(keyString, [])
			}

			const fileGroup = this.#filesGroup.get(keyString)?.find((f) => f.id === entry.id)

			if (!fileGroup) {
				this.#filesGroup.get(keyString)!.push(file!)
			} else {
				fileGroup.fileValue = entry.fileValue
			}

			if (entry.status === 10 || entry.status === 500) {
				if (entry.status === 10) {
					this.#fileUpload.set(entry.id, file!)
				} else {
					this.#fileError.set(entry.id, file!)
				}
				const keyString = [entry.workId, entry.subWorkId, entry.groupId].join(KeyIdDelimiter)
				const ids = this.#temporaryInfrared.get(keyString)
				if (ids) {
					this.#temporaryInfrared.set(
						keyString,
						ids.filter((id) => id !== entry.id)
					)
				}
			}
		})
	}

	addDefultFilesEntriesToUserMap(newEntries: DBPointFile[], ids: number[], workspaceId: number) {
		newEntries.forEach((entry, index) => {
			this.#files.set(ids[index], { ...entry, id: ids[index], workspaceId })
			const file = this.#files.get(ids[index])!
			const keys = [entry.workId, entry.subWorkId, entry.groupId]
			const keyString = keys.join(KeyIdDelimiter)
			if (!this.#filesGroup.has(keyString)) {
				this.#filesGroup.set(keyString, [])
			}
			this.#filesGroup.get(keyString)?.push(file)
		})
	}

	getWorkOrdersByWorkIds(workIds: string[]): WorkOrder[] {
		const works = workIds.map((id) => this.#workOrderMap.get(id)).filter((work): work is WorkOrder => !!work)
		return this.sortWorkOrders(works)
	}

	getWorkOrderStatusByWorkId(workId: string): WorkOrderStatus | undefined {
		return this.#workOrderMap.get(workId)?.status
	}

	sortWorkOrders(workOrders: WorkOrder[]): WorkOrder[] {
		return workOrders
			.filter((a) => a.status !== 10)
			.sort((a, b) => {
				const statusComparison = this.#sortOrderMap.indexOf(a.status) - this.#sortOrderMap.indexOf(b.status)

				if (statusComparison !== 0) {
					return statusComparison
				} else {
					return new Date(b.detectBeginTime).getTime() - new Date(a.detectBeginTime).getTime()
				}
			})
	}

	updatePartialWorkOrder(order: WorkOrderWithRequiredId) {
		if (this.#workOrderMap.has(order.workId)) {
			const workOrder = this.#workOrderMap.get(order.workId)!
			Object.assign(workOrder, order)
		}
	}

	hasAnySubWorkOrderForWU(workId: string, subWorkId: string) {
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		return this.#subWorkOrderMap.has(keyString)
	}

	getSubWorkOrdersByWorkId(workId: string): SubWork[] {
		const keys = [workId]
		const keyString = keys.join(KeyIdDelimiter)
		return Array.from(this.#subWorkOrderWithWUIdMap.get(keyString)?.values() || [])
	}

	updatePartialSubWorkOrder(subWorkOrder: SubWorkOrderWithRequiredId) {
		const keys = [subWorkOrder.workId, subWorkOrder.subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		const subWork = this.#subWorkOrderMap.get(keyString)
		if (!subWork) return
		Object.assign(subWork, subWorkOrder)
	}

	getCompleteSubWorkOrder(workId: string, subWorkId: string): SubWork | undefined {
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		const subWork = this.#subWorkOrderMap.get(keyString)
		return subWork
	}

	hasAnySubWorkOrderPointsForUser(workId: string, subWorkId: string): boolean {
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		const groups = this.#pointWithWUIdMap.get(keyString)
		if (!groups) return false
		return !!Array.from(groups?.values()).length
	}

	getSimplifiedGroupsByCurrentGroup(
		workId: string | undefined,
		subWorkId: string | undefined,
		_mode?: DetectMode,
		_currentGroup?: CompleteGroup,
		deviceTypeName?: string,
		voltageLevel?: string,
		searchVaklue?: string
	): SimplifiedGroup[] {
		if (!workId || !subWorkId) return []
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)

		const groups = this.#pointWithWUIdMap.get(keyString)

		if (!groups) return []

		const simplifiedGroup: SimplifiedGroup[] = []
		for (const key of groups.keys()) {
			const point = groups.get(key)![0]
			const iSearch = !searchVaklue || point.deviceName.toLowerCase().includes(searchVaklue.toLowerCase())
			const isDeviceTypeName = deviceTypeName === '设备类型' || point.deviceTypeName === deviceTypeName
			const isVoltageLevel = voltageLevel === '电压等级' || point.voltageLevel === voltageLevel
			if (!iSearch || !isDeviceTypeName || !isVoltageLevel) continue
			simplifiedGroup.push({
				groupId: key,
				detectPositionName: point.detectPositionName,
				deviceTypeName: point.deviceTypeName,
				detectMethod: point.detectMethod,
				voltageLevel: point.voltageLevel,
				deviceName: point.deviceName,
				deviceType: point.deviceType,
				workId: point.workId,
				subWorkId: point.subWorkId,
				status: this.getFileStatusCountMap(workId, subWorkId, key),
				groupOrder: point.groupOrder
			})
		}
		return quickSort(simplifiedGroup, 'groupOrder')
	}

	clacPointCount(workId: string | undefined, subWorkId: string | undefined, groupId: string | undefined): number {
		if (!workId || !subWorkId || !groupId) return 0
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		const points = this.#pointWithWUIdMap.get(keyString)?.get(groupId)
		if (!points || !points.length) return 0
		return points.length
	}

	getCompleteGroupsByWorkIdAndSubWorkId(workId: string | undefined, subWorkId: string | undefined, groupId: string | undefined): CompleteGroup | undefined {
		if (!workId || !subWorkId || !groupId) return undefined
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		const points = this.#pointWithWUIdMap.get(keyString)?.get(groupId)
		if (!points || !points.length) return undefined
		return points[0]
	}

	getCompletePointsByWGroppIds(workId: string, subWorkId: string, groupIds: string[]): Map<string, SubWorkOrderPoint[]> | undefined {
		const keyString = [workId, subWorkId].join(KeyIdDelimiter)
		if (groupIds.length === 0) {
			return this.#pointWithWUIdMap.get(keyString)
		}

		const groupMap = new Map<string, SubWorkOrderPoint[]>()
		groupIds.forEach((key) => {
			const points = this.#pointWithWUIdMap.get(keyString)?.get(key)
			if (points) groupMap.set(key, points)
		})

		return groupMap.size > 0 ? groupMap : undefined
	}

	getCompletePointsByWorkIdAndSubWorkId(workId: string, subWorkId: string, groupId: string): SubWorkOrderPoint[] {
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)
		const points = this.#pointWithWUIdMap.get(keyString)?.get(groupId)
		return points || []
	}

	hasAnySubWorkOrderPonit(workId: string, subWorkId: string, groupId: string, workDetailId: string): boolean {
		const keys = [workId, subWorkId, groupId, workDetailId]
		const keyString = keys.join(KeyIdDelimiter)
		return this.#pointMap.has(keyString)
	}

	getPointCountOfSubWorkOrder(workId: string, subWorkId: string): number {
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)

		const groups = this.#pointWithWUIdMap.get(keyString)
		return groups ? [...groups.values()].flatMap((v) => v).length : 0
	}

	getPointStatusCountOfSubWorkOrder(workId: string, subWorkId: string, status: PointDetectStatus): number {
		const keys = [workId, subWorkId]
		const keyString = keys.join(KeyIdDelimiter)

		const groups = this.#pointWithWUIdMap.get(keyString)
		return groups ? [...groups.values()].flatMap((v) => v).filter((v) => v.status === status).length : 0
	}

	updatedSubWorkPointsByWorkIdAndSubWorkId(point: SubWorkOrdePointrWithRequiredId) {
		const keys = [point.workId, point.subWorkId, '*', point.workDetailId]
		const keyString = keys.join(KeyIdDelimiter)

		const regex = new RegExp('^' + keyString.replace(/\*/g, '[^\\-]+') + '$')
		for (const [key, value] of this.#pointMap.entries()) {
			if (regex.test(key)) {
				Object.assign(value, point)
				break
			}
		}
	}

	getCompletePointsByWorkId(workId: string): SubWorkOrderPoint[] {
		const keys = [workId, '*', '*', '*']
		const keyString = keys.join(KeyIdDelimiter)

		const points: SubWorkOrderPoint[] = []
		const regex = new RegExp('^' + keyString.replace(/\*/g, '[^\\-]+') + '$')
		for (const [key, value] of this.#pointMap.entries()) {
			if (regex.test(key)) {
				points.push(value)
			}
		}

		return points
	}

	getSubWorkPointByWorkIdAndSubWorkId(workId: string, subWorkId: string, groupId: string = '*', workDetailId: string): SubWorkOrderPoint | undefined {
		const keys = [workId, subWorkId, groupId, workDetailId]
		const keyString = keys.join(KeyIdDelimiter)

		const regex = new RegExp('^' + keyString.replace(/\*/g, '[^\\-]+') + '$')
		for (const [key, value] of this.#pointMap.entries()) {
			if (regex.test(key)) {
				return value
			}
		}
		return undefined
	}

	getFileStatusCountMap(workId: string, subWorkId: string, groupId: string): GS {
		const keys = [workId, subWorkId, groupId]
		const keyString = keys.join(KeyIdDelimiter)
		const files = this.#filesGroup.get(keyString) || []

		const key = [workId, subWorkId].join(KeyIdDelimiter)
		const detectMethod = this.#subWorkOrderMap.get(key)?.detectMethod
		const groups = this.#pointWithWUIdMap.get(key)

		const statusCountMap: { [K in PointFileStatus]?: number } = {
			0: detectMethod === 6 ? 1 : groups?.get(groupId)?.length || 1,
			1: 0,
			2: 0,
			10: 0,
			500: 0
		}

		const pointIds: string[] = []
		for (const file of files) {
			const status = file.status as PointFileStatus
			statusCountMap[status] = (statusCountMap[status] || 0) + 1
			if (!pointIds.includes(file.workDetailId)) {
				statusCountMap['0'] = Math.max(0, (statusCountMap['0'] || 0) - 1)
				pointIds.push(file.workDetailId)
			}
		}
		return statusCountMap
	}

	getGroupFileGroupsByWorkDetail(workId: string, subWorkId: string, groupId: string): { [propsName: string]: PointFile[] } {
		const keys = [workId, subWorkId, groupId]
		const keyString = keys.join(KeyIdDelimiter)
		const files = this.#filesGroup.get(keyString) || []
		return groupByWithKeyExtractor(files, (file) => file.fileGroup, {
			sortFn: quickSort,
			sortField: 'type'
		})
	}

	getNoDeleteFileGroupByWorkIdAndSubWorkId(workId: string, subWorkId: string, groupId: string): string | undefined | 1 {
		const keyString = [workId, subWorkId, groupId].join(KeyIdDelimiter)
		const files = this.#filesGroup.get(keyString)

		if (!files || files.length === 0) return undefined

		const iterator = files[Symbol.iterator]()
		let { value, done } = iterator.next()

		while (!done) {
			if (!value?.fileValue) {
				return value?.fileGroup
			}
			;({ value, done } = iterator.next())
		}
		return 1
	}

	batchUpdateSubWorkFileStatusToPending(workId: string, subWorkId: string) {
		const prefix = [workId, subWorkId].join(KeyIdDelimiter) + KeyIdDelimiter
		for (const [key, files] of this.#filesGroup.entries()) {
			if (key.startsWith(prefix)) {
				for (const file of files) {
					file.status = 0
				}
			}
		}
	}

	updateSubWorkFileStatus(id: number, status: PointFileStatus) {
		const file = this.#files.get(id)
		if (!file) return

		const keyString = [file.workId, file.subWorkId, file.groupId].join(KeyIdDelimiter)
		const files = this.#filesGroup.get(keyString) || []
		for (const f of files) {
			f.status = status
			if (f.status === 10) {
				this.#fileUpload.set(f.id, f)
			}
		}
	}

	updateFile(file: PointFile) {
		const f = this.#files.get(file.id)
		if (!f) return
		Object.assign(f, file)
		if (f.status === 10) {
			this.#fileUpload.set(f.id, f)
		}
	}

	getSameFileGroupFileById(id: number): Partial<Record<PointFileType, PointFile[]>> {
		const file = this.#files.get(id)
		if (!file) return {}

		const key = [file.workId, file.subWorkId, file.groupId].join(KeyIdDelimiter)
		const groupFiles = this.#filesGroup.get(key)
		if (!groupFiles) return {}

		const grouped: Partial<Record<PointFileType, PointFile[]>> = {}

		for (const f of groupFiles) {
			const type = f.type as PointFileType | undefined
			if (type) {
				if (!grouped[type]) {
					grouped[type] = []
				}
				grouped[type]!.push(f)
			}
		}

		return grouped
	}

	getAllUploadFiles(): PointFile[] {
		return [...Array.from(this.#fileUpload.values()), ...Array.from(this.#fileError.values())]
	}

	getAllAndTemporaryUploadFiles(): PointFileWithoutId[] {
		const files = [...this.#fileUpload.values(), ...this.#fileError.values()]

		return files.flatMap((file) => {
			const duplicatedFiles: PointFileWithoutId[] = []

			if (file.detectMethod === 6) {
				const relatedPoints = this.getCompletePointsByWorkIdAndSubWorkId(file.workId, file.subWorkId, file.groupId)

				duplicatedFiles.push(
					...relatedPoints
						.filter((point) => point.workDetailId !== file.workDetailId)
						.map((point) =>
							omit(['id'], {
								...file,
								workDetailId: point.workDetailId,
								fileGroup: file.fileGroup + point.workDetailId
							})
						)
				)
			}

			return [file, ...duplicatedFiles]
		})
	}

	getFileOfWorkDetailType(workId: string, subWorkId: string, groupId: string, fileGroyp?: string): WorkDetailType {
		const keys = [workId, subWorkId, groupId]
		const keyString = keys.join(KeyIdDelimiter)
		const files = (this.#filesGroup.get(keyString) || []).filter((f) => fileGroyp === f.fileGroup && f.fileValue && f.status === 2)
		return files.length ? 1 : 2
	}

	getFileOfWorkDetailIndex(workId: string, subWorkId: string, groupId: string, fileGroyp?: string): number {
		const type = this.getFileOfWorkDetailType(workId, subWorkId, groupId, fileGroyp)
		const keys = [workId, subWorkId, groupId]
		const keyString = keys.join(KeyIdDelimiter)
		const files = quickSort(this.#filesGroup.get(keyString) || [], 'workDetailIndex')
		if (type === 1) {
			const file = files.find((f) => f.fileGroup === fileGroyp)!
			return Math.floor(file.workDetailIndex)
		} else {
			const findResult = files.find((file) => !file.fileValue)
			return findResult ? findResult.workDetailIndex : Math.floor(files.length / 2) + 1
		}
	}

	getAllFilesOfPoint(point: SubWorkOrderPoint): PointFile[] {
		const keys = [point.workId, point.subWorkId, point.groupId]
		const keyString = keys.join(KeyIdDelimiter)
		return (this.#filesGroup.get(keyString) || []).filter((f) => point.workDetailId === f.workDetailId)
	}

	createdTemporaryFileForInfrared(workId: string, subWorkId: string, groupId: string, workDetailId: string, mode: DetectMode = 0, isCreated: boolean = false) {
		const keyString = [workId, subWorkId, groupId].join(KeyIdDelimiter)
		const files = this.#filesGroup.get(keyString)
		if (files?.length && !isCreated) return
		const ids: number[] = this.#temporaryInfrared.get(keyString) || []

		const tempFile = {
			workId,
			subWorkId,
			groupId,
			fileGroup: uuid(),
			workDetailId,
			status: 1,
			detectMethod: 6,
			workDetailType: 2,
			workDetailIndex: ids.length / 2 + 1,
			workspaceId: 1
		} as const

		const detectMethod = this.getCompleteSubWorkOrder(workId, subWorkId)?.detectMethod || '6'

		const id = Date.now()
		const vi = { ...tempFile, id: id + 1, type: `${detectMethod}-1-${mode}` as PointFileType }
		const ir = { ...tempFile, id: id + 2, type: `${detectMethod}-2-${mode}` as PointFileType }

		ids.push(...[id + 1, id + 2])
		this.#temporaryInfrared.set(keyString, ids)
		this.addNewFilesEntriesToUserMap([vi, ir])
	}

	deleteTemporaryFileForInfrared(workId?: string, subWorkId?: string, groupId?: string) {
		const currentId = !workId || !subWorkId || !groupId ? '' : [workId, subWorkId, groupId].join(KeyIdDelimiter)
		for (const [key, value] of this.#temporaryInfrared) {
			if (key !== currentId) {
				for (const id of value) {
					const tt = this.#files.get(id)
					this.#files.delete(id)
					if (tt) {
						const keyString = [tt.workId, tt.subWorkId, tt.groupId].join(KeyIdDelimiter)
						const files = this.#filesGroup.get(keyString)

						if (files && files.length) {
							const filteredFiles = files.filter((file) => !value.includes(file.id))
							this.#filesGroup.set(key, filteredFiles)
						}
					}
				}

				this.#temporaryInfrared.delete(key)
			}
		}
	}

	updatedCompleteDeleteFileIdAndStatus(idMap: Map<number, number>, status: PointFileStatus): { files: PointFile[]; points: SubWorkOrderPoint[] } {
		const files: PointFile[] = []
		const points: SubWorkOrderPoint[] = []
		for (const [key, value] of idMap.entries()) {
			const file = this.#files.get(key)
			// if (key === value && file?.status !== 1) continue
			if (file) {
				file.status = status
				file.id = value
				this.#files.set(value, file)
				files.push(file)
				if (key !== value) {
					this.#files.delete(key)
				}
				this.#fileUpload.delete(key)
				if (status === 500) {
					const errorFile = this.#files.get(value)
					this.#fileError.set(value, errorFile!)
				} else {
					this.#fileError.delete(value)
				}
				if (file.status === 2) {
					const ps = this.updatedCompleteStatusOfPoint(file)
					points.push(...ps)
				}
			}
		}

		return {
			files,
			points
		}
	}

	updatedCompleteStatusOfPoint(file: PointFile): SubWorkOrderPoint[] {
		const points: SubWorkOrderPoint[] = []
		if (file.detectMethod === 6) {
			this.getCompletePointsByWorkIdAndSubWorkId(file.workId, file.subWorkId, file.groupId).forEach((point) => {
				if (point.status === 0) {
					point.status = 1
					points.push(point)
				}
			})
		} else {
			const keys = [file.workId, file.subWorkId, file.groupId, file.workDetailId]
			const keyString = keys.join(KeyIdDelimiter)
			const point = this.#pointMap.get(keyString)
			if (point?.status === 0) {
				point.status = 1
				points.push(point)
			}
		}
		return points
	}

	async getWorkDetailToFileNames(workId: string, subWorkId: string): Promise<Record<string, string[]> | undefined> {
		const detailToFileNames: Record<string, string[]> = {}

		for (const file of this.#files.values()) {
			const isValid = file.workId !== workId || file.subWorkId !== subWorkId || !file.fileValue

			if (isValid) continue

			const detailId = file.workDetailId
			if (!detailToFileNames[detailId] && file.fileValue) {
				detailToFileNames[detailId] = []
			}

			if (file.fileValue) {
				const fileName = await process.getBasename(file.fileValue)
				const [name] = fileName.split('.')
				detailToFileNames[detailId].push(name)
			}
		}
		return Object.keys(detailToFileNames).length > 0 ? detailToFileNames : undefined
	}

	checkFileExecutionConflict(workId: string, subWorkId: string, groupId: string, workDetailId: string): boolean {
		const keyString = `${workId}${KeyIdDelimiter}${subWorkId}${KeyIdDelimiter}${groupId}`
		const files = this.#filesGroup.get(keyString) || []
		return !!files.find((file) => file.workDetailId === workDetailId && file.status === 1)
	}

	getPointAndGroupIdByWorkDetailId(workId: string, subWorkId: string, workDetailId: string): { point: SubWorkOrderPoint; groupId: string } {
		const key = [workId, subWorkId].join(KeyIdDelimiter)
		const groups = this.#pointWithWUIdMap.get(key)
		if (!groups) {
			throw Error('not font groups info at getPointAndGroupIdByWorkDetailId')
		}

		for (const [groupId, group] of groups.entries()) {
			for (const point of group.values()) {
				if (point.workDetailId === workDetailId) {
					return {
						groupId,
						point
					}
				}
			}
		}
		throw Error('not font groups info at getPointAndGroupIdByWorkDetailId')
	}

	getPointFilesByWorkDetailId(workId: string, subWorkId: string, groupId: string, workDetailId: string): PointFile[] {
		const keys = [workId, subWorkId, groupId]
		const keyString = keys.join(KeyIdDelimiter)
		const files = this.#filesGroup.get(keyString) || []
		return files.filter((f) => f.workDetailId === workDetailId)
	}

	getCompleteDeleteByWorkDetailIndex(workId: string, subWorkId: string, groupId: string, workDetailId: string, workDetailIndex: number, fileKey: FileKey): PointFile | undefined {
		const files: PointFile[] = this.getPointFilesByWorkDetailId(workId, subWorkId, groupId, workDetailId)
		return files.find((f) => f.workDetailIndex === workDetailIndex && f.flieKey === fileKey)
	}

	getClearanceByMode(mode: DetectMode) {
		return this.modeHandlerMap.get(mode) // Retrieves the corresponding function from the mode handler map
	}

	modeHandlerMap: Map<DetectMode, (info: UploadFileInfo, userId: string, workspaceId: number, sensorEid: { [k in DetectMode]: string } | object, id?: number) => any> = new Map([
		[1, this.buildDetectFileMode_1],
		[2, this.buildDetectFileMode_2],
		[3, this.buildDetectFileMode_3]
	])

	buildDetectFileMode_1(info: UploadFileInfo, userId: string, workspaceId: number, sensorEid: { [k in DetectMode]: string } | object, id = Date.now()): PointFile {
		const { workId, subWorkId, workDetailId, fileGroup, filePath, mode, detectMethod, type } = info
		const flieKey = PointFileTypeEnum[type]
		const { groupId } = this.getPointAndGroupIdByWorkDetailId(workId, subWorkId, workDetailId)
		const workDetailIndex = this.getFileOfWorkDetailIndex(workId, subWorkId, groupId, fileGroup)
		const f = this.getCompleteDeleteByWorkDetailIndex(workId, subWorkId, groupId, workDetailId, workDetailIndex, flieKey)
		const idCode = (f?.idCode || sensorEid[mode]) as string
		const tempId = f?.status === 1 ? f.id : id

		return {
			...f,
			id: tempId,
			workId,
			subWorkId,
			groupId,
			fileGroup,
			workDetailId,
			status: 10 as PointFileStatus,
			detectMethod,
			type,
			workDetailType: 2,
			workDetailIndex,
			userId,
			mode,
			workspaceId,
			updatedAt: Date.now(),
			flieKey,
			fileValue: filePath,
			idCode
		} as PointFile
	}

	buildDetectFileMode_2(info: UploadFileInfo, userId: string, workspaceId: number, _sensorEid: { [k in DetectMode]: string } | object, id = Date.now()) {
		const { workId, subWorkId, workDetailId, fileGroup, filePath, mode, detectMethod, type, idCode, workDetailIndex } = info
		const flieKey = PointFileTypeEnum[type]
		const { groupId } = this.getPointAndGroupIdByWorkDetailId(workId, subWorkId, workDetailId)
		const f = this.getCompleteDeleteByWorkDetailIndex(workId, subWorkId, groupId, workDetailId, workDetailIndex!, flieKey)

		return {
			...f,
			id: f?.id || id,
			workId,
			subWorkId,
			groupId,
			fileGroup,
			workDetailId,
			status: 10 as PointFileStatus,
			detectMethod,
			type,
			workDetailType: f?.fileValue ? 1 : 2,
			workDetailIndex,
			userId,
			mode,
			workspaceId,
			updatedAt: Date.now(),
			flieKey,
			fileValue: filePath,
			idCode
		} as PointFile
	}

	buildDetectFileMode_3(info: UploadFileInfo, userId: string, workspaceId: number, _sensorEid: { [k in DetectMode]: string } | object, id = Date.now()) {
		const { workId, subWorkId, workDetailId, fileGroup, filePath, mode, detectMethod, type, idCode, workDetailIndex } = info
		const flieKey = PointFileTypeEnum[type]
		const { groupId } = this.getPointAndGroupIdByWorkDetailId(workId, subWorkId, workDetailId)
		const f = this.getCompleteDeleteByWorkDetailIndex(workId, subWorkId, groupId, workDetailId, workDetailIndex!, flieKey)

		return {
			...f,
			id: f?.id || id,
			workId,
			subWorkId,
			groupId,
			fileGroup,
			workDetailId,
			status: 10 as PointFileStatus,
			detectMethod,
			type,
			workDetailType: f?.fileValue ? 1 : 2,
			workDetailIndex,
			userId,
			mode,
			workspaceId,
			updatedAt: Date.now(),
			flieKey,
			fileValue: filePath,
			idCode
		} as PointFile
	}
}

export default new workOrderDataSource()

export function getAdoptStatusBySubWorkBasics(user: User | undefined, subWork: SubWorkBasics | SubWork | undefined): AdoptStatus {
	let adoptStatus: AdoptStatus = 2
	if (!user || !subWork) {
		return adoptStatus
	}
	if (!subWork.subWorkUserId) {
		adoptStatus = 1
	} else if (subWork.subWorkUserId === user.userId) {
		adoptStatus = 0
	}
	return adoptStatus
}

export function getTTStext(points: SubWorkOrderPoint[], total: number): string | undefined {
	if (!points.length) return
	if (!points.filter((point) => !point.status).length) {
		return points.length < total ? '当前筛选条件下已检测完毕' : '全部检测完毕'
	}
	const pointNames = [`请检测${points[0].deviceName}${points[0].detectPositionName}`]
	if (points.length > 1) {
		pointNames.push(`${points.at(-1)!.deviceName}${points.at(-1)!.detectPositionName}`)
	}
	return pointNames.join('到')
}

export function isFileType(value: string, type: FileType): boolean {
	const fileName = value.split(/[\\/]/).pop()
	if (!fileName) return false

	const parts = fileName.split('.')
	if (parts.length >= 3) {
		return parts[parts.length - 2] === type
	}
	return false
}
