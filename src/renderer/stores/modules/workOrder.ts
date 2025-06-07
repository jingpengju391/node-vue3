import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import { ModuleOption } from '../definition'
import {
	CompleteGroup,
	DetectClimate,
	DetectConclusion,
	DetectMode,
	PointFile,
	SimplifiedGroup,
	SubWork,
	SubWorkOrderPoint,
	SubWorkOrderPointBasics,
	SubWorkStatus,
	WorkOrder,
	WorkOrderStatus,
	PointFileTypeEnum,
	DetectTypeCooperateWith,
	PointFileStatus,
	UploadFileInfo,
	PointFileType
} from '@shared/dataModelTypes/WorkOrder'
import { db, http, isDev, process } from '@hooks/api'
import workOrderDataSource, { getTTStext } from './workOrderDataSource'
import useLoginStore from './login'
import { useRootStore } from '../index'
import loginDataSource from './loginDataSource'
import { deepClone, formatDateTime, splitNumber } from '@util/index'
import { DaysWidth, IdDelimiter, KeyIdDelimiter } from '@shared/dataModelTypes/helpers'
import { getPreviousNDays, ringTraverse } from '@/utils'
import Scheduler from '@util/scheduler'
import { extractIpPort } from '@/utils/regex'

export interface State {
	currentWorkOrder: WorkOrder | undefined
	workOrders: WorkOrder[]
	currentSubWorkOrder: SubWork | undefined
	subWorkOrders: SubWork[]
	currentGroup: CompleteGroup | undefined
	groups: SimplifiedGroup[]
	points: SubWorkOrderPoint[]
	pointBasics: SubWorkOrderPointBasics[]
	currentMode: DetectMode | undefined
	currentModeIPMap: { [K in DetectMode]: string } | object
	currentDetectClimate: DetectClimate
	currentFileGroupId: string | undefined
	currentFilesGroup: { [propsName: string]: PointFile[] }
	pendingUploadCount: number
	socketIdConnected: { [propsName: string]: boolean }
	voiceGuide: boolean
	bluetoothMacs: string[]
	completePointCount: number
	deviceTypeName: string
	voltageLevel: string
	searchValue: string
}

export type Getters = {
	getPercentWithSubWorkOrders: (state: State) => number
}
export interface Actions {
	recoverDefaultWorkspaceFromDB: (workspackId: number) => Promise<void>
	syncWorkOrderFromPlatform: (isForce?: boolean) => Promise<void>
	assignWorkOrderToPlatform: () => Promise<void>
	updatedCurrentWorkOrder: (currentWorkOrder: WorkOrder | undefined) => void
	syncSubWorkOrderFromPlatform: () => Promise<void>
	updatedSubWorkOrdersByCurrentWork: () => void
	assignSubWorkOrderToPlatform: () => Promise<void>
	syncSubOrderPointsAndGroupsFromPlatform: (isForce?: boolean) => Promise<void>
	updatedCurrentGroup: (workId: string, suWorkId: string, groupId: string) => void
	updatedCurrentSubWorkOrder: (currentSubWorkOrder: SubWork | undefined) => void
	createdTemporaryFileGroup: (isCreated?: boolean) => void
	updatedCurrentMode: (mode: DetectMode | undefined) => void
	syncSubOrderPointReasonFromPlatform: () => Promise<void>
	submitWorkOrderWidthPointReasonToPlatform: () => Promise<void>
	prepareGroupedDetectionPoints: () => void
	updateCurrentInfraredFileStatusAndValue: (vi: string, ir: string) => void
	updatedCurrentInfraredFileStatusAndValue: (idMap: Map<number, number>, status: PointFileStatus) => Promise<void>
	updatedSocketIdConnectedStatus: (ip: string, isConnected: boolean) => void
	updatedCurrentModeIpMap: (ip: string) => void
	transmitDetectDataToServer: (groupIds?: string[]) => Promise<void>
	transmitDetectPointDataToServer: (point: SubWorkOrderPoint) => Promise<void>
	updatedFileStatusAndValue: (filesInfo: UploadFileInfo[]) => void
	updatedBluetoothMacs: (mac: string, isConnected: boolean) => void
	taskDispatcherSuccess: (points: SubWorkOrderPoint[]) => Promise<void>
	clearSearchValue: () => void
	updatedGroupsBySearch: () => void
}

type ModelsModule = ModuleOption<State, Getters, Actions>

const workOrderStoreOptions: ModelsModule = {
	persist: isDev
		? {
				storage: sessionStorage
			}
		: false,
	state: () => ({
		currentWorkOrder: undefined,
		workOrders: [],
		currentSubWorkOrder: undefined,
		subWorkOrders: [],
		groups: [],
		currentGroup: undefined,
		points: [],
		currentMode: undefined,
		currentModeIPMap: {},
		pointBasics: [],
		currentDetectClimate: {
			userId: '',
			workId: '',
			temperature: 20,
			humidity: 40
		},
		currentFileGroupId: undefined,
		currentFilesGroup: {},
		pendingUploadCount: 0,
		socketIdConnected: {},
		voiceGuide: true,
		bluetoothMacs: [],
		completePointCount: 0,
		deviceTypeName: '设备类型',
		voltageLevel: '电压等级',
		searchValue: ''
	}),
	getters: {
		getPercentWithSubWorkOrders: (state) => {
			const { total, completed } = state.subWorkOrders.reduce(
				(acc, element) => ({
					total: acc.total + (element?.detectPositionTotal || 0),
					completed: acc.completed + (element?.detectPositionComplete || 0)
				}),
				{ total: 0, completed: 0 }
			)

			return total === 0 ? 0 : Math.min(Math.round((completed / total) * 100), 100)
		}
	},
	actions: {
		async recoverDefaultWorkspaceFromDB(workspaceId) {
			const workOrders = await db.queryAllOrdersOfWorkspace(workspaceId)
			const subWorkOrders = await db.queryAllSubOrdersOfWorkspace(workspaceId)
			const points = await db.queryAllSubOrderPointsOfWorkspace(workspaceId)
			const files = await db.queryAllFilesPointsOfWorkspace(workspaceId)

			workOrderDataSource.addNewAnchorEntriesToWorkOrderMap(workOrders)
			workOrderDataSource.addNewSubWorksEntriesToUserMap(subWorkOrders)
			workOrderDataSource.addNewSubWorkPointsEntriesToUserMap(points)
			workOrderDataSource.addNewFilesEntriesToUserMap(files)
			this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length
			const modeIpCatch = localStorage.getItem('modeIpCatch')
			this.currentModeIPMap = modeIpCatch ? (JSON.parse(modeIpCatch) as { [K in DetectMode]: string }) : {}
		},
		async syncWorkOrderFromPlatform(isForce) {
			const { user } = useLoginStore()
			const { deviceInfo } = useRootStore()
			const mtCode = deviceInfo?.deviceCode
			const userId = user?.userId
			if (!mtCode || !userId || (!isForce && loginDataSource.hasAnyWorkOrderForUser(userId))) {
				if (!userId) return
				const workIds = loginDataSource.getWorkIdsByUserId(userId)
				this.workOrders = workOrderDataSource.getWorkOrdersByWorkIds(workIds)
				this.currentWorkOrder = this.currentWorkOrder ? this.workOrders.find((order) => order.workId === this.currentWorkOrder!.workId) : this.workOrders[0]
				return
			}
			const currentTime = formatDateTime()
			const beginTime = getPreviousNDays(currentTime, DaysWidth)
			const { data = [] } = await http.queryWorkOrders({ userId, mtCode, beginTime })
			const workIds: string[] = data.map((d) => d.workId)
			workOrderDataSource.addNewEntriesToWorkOrderMap(data)
			loginDataSource.updatedEntryToUserMap({ ...user, workIds: workIds.join(IdDelimiter) })
			this.workOrders = workOrderDataSource.getWorkOrdersByWorkIds(workIds)
			this.currentWorkOrder = this.currentWorkOrder ? this.workOrders.find((order) => order.workId === this.currentWorkOrder!.workId) : this.workOrders[0]
			await db.insertOrdersOfWorkspace(data)
			await db.updatedUserInfo({ userId, workIds: workIds.join(IdDelimiter) })
		},
		async assignWorkOrderToPlatform() {
			const { user } = useLoginStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId
			if (!userId || !workId) {
				throw new Error(`用户${user?.userName}/工单${this.currentWorkOrder?.workName}不存在！`)
			}
			await http.assignWorkOrder({ userId, workId })
			const workPartial = { workId, status: 1 as WorkOrderStatus, adoptUserName: user.userNick, adoptUserId: user.userId, adoptAt: Date.now() }
			workOrderDataSource.updatePartialWorkOrder(workPartial)
			const findResult = this.workOrders.find((work) => work.workId === workId)!
			Object.assign(findResult, workPartial)
			await db.updatePartialWorkOrder(workPartial)
		},
		updatedCurrentWorkOrder(currentWorkOrder) {
			this.currentWorkOrder = currentWorkOrder
		},
		async syncSubWorkOrderFromPlatform() {
			const { user } = useLoginStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId
			if (!userId || !workId) {
				throw new Error(`用户${user?.userName}/工单${this.currentWorkOrder?.workName}不存在！`)
			}
			const { data = [] } = await http.querySubWorkOrders({ userId, workId })
			for (const entry of data) {
				const subWork = { workId, ...entry }
				let subWorkAction = 'insertSubOrderOfWorkspace'
				if (workOrderDataSource.hasAnySubWorkOrderForWU(workId, entry.subWorkId)) {
					subWorkAction = 'updatePartialSubWorkOrder'
				}
				// update subWorkOrder data source map cache
				workOrderDataSource.addNewSubWorksEntriesToUserMap([subWork])
				// update subWorkOrder data to db
				await db[subWorkAction](subWork)
			}
		},
		updatedSubWorkOrdersByCurrentWork() {
			const { user } = useLoginStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId
			if (!userId || !workId) {
				throw new Error(`用户${user?.userName}/工单${this.currentWorkOrder?.workName}不存在！`)
			}

			const subWorkOrders = workOrderDataSource.getSubWorkOrdersByWorkId(workId)
			this.subWorkOrders = subWorkOrders
		},

		async assignSubWorkOrderToPlatform() {
			const { user } = useLoginStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			if (!userId || !workId || !subWorkId) {
				throw new Error(`用户${user?.userName}/子/工单${this.currentWorkOrder?.workName}不存在！`)
			}

			await http.adoptSubwork({ userId, workId, subWorkId })
			const subWorkPartial = { subWorkUserId: userId, status: 1 as SubWorkStatus, workId, subWorkId }
			workOrderDataSource.updatePartialSubWorkOrder(subWorkPartial)
			const findResult = this.subWorkOrders.find((work) => work.workId === workId)!
			Object.assign(findResult, subWorkPartial)

			await db.updatePartialSubWorkOrder(subWorkPartial)
		},

		async syncSubOrderPointsAndGroupsFromPlatform(isForce) {
			const { user } = useLoginStore()
			// const { workspack } = useRootStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId

			if (!userId || !workId || !subWorkId) {
				throw new Error(`用户${user?.userName}/子/工单${this.currentWorkOrder?.workName}不存在！`)
			}

			const detectMethod = workOrderDataSource.getCompleteSubWorkOrder(workId, subWorkId)?.detectMethod

			if (!detectMethod) {
				throw new Error(`检测方法不存在！`)
			}

			if (!isForce && workOrderDataSource.hasAnySubWorkOrderPointsForUser(workId, subWorkId)) {
				this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
				return
			}

			const { data: groups = [] } = await http.queryRouteplanDetaillist({ userId, workId, routeType: 0, detectMethod })
			const { data: points = [] } = await http.queryDetaillist({ userId, workId, subWorkId })
			// const files: DBPointFile[] = []

			const pointMap = new Map<string, SubWorkOrderPointBasics>()
			for (const point of points) {
				pointMap.set(point.detectPositionId, point)
			}

			for (const group of groups) {
				for (const position of group.detectPositionList) {
					if (pointMap.has(position.detectPositionId)) {
						const pt = pointMap.get(position.detectPositionId)!
						const point = { ...pt, ...position } as SubWorkOrderPoint
						point.subWorkId = subWorkId
						point.workId = workId
						point.groupId = group.groupId
						point.groupOrder = group.orderNumber
						let pointAction = 'updatePartialPointSubWorkOrder'
						if (!workOrderDataSource.hasAnySubWorkOrderPonit(point.workId, point.subWorkId, point.groupId, point.workDetailId)) {
							pointAction = 'insertSubOrderPointOfWorkspace'
							// files.push(workOrderDataSource.getDefultFileforDb(workId, subWorkId, point.groupId, point.workDetailId, this.currentSubWorkOrder!.detectMethod))
						}
						workOrderDataSource.addNewSubWorkPointsEntriesToUserMap([point])
						await db[pointAction](point)
					}
				}
			}
			// const ids = await db.insertFilesOfPoint(files)
			// workOrderDataSource.addDefultFilesEntriesToUserMap(files, ids, workspack.id)
			this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
		},
		async syncSubOrderPointReasonFromPlatform() {
			const { user } = useLoginStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId

			if (!userId || !workId) {
				throw new Error(`用户${user?.userName}/子/工单${this.currentWorkOrder?.workName}不存在！`)
			}
			const scheduler = new Scheduler(1)
			this.pointBasics.length = 0
			this.currentDetectClimate.userId = userId
			this.currentDetectClimate.workId = workId
			this.currentDetectClimate.subWorkList = []
			for (const subwork of this.subWorkOrders) {
				this.currentDetectClimate.subWorkList!.push({ subWorkId: subwork.subWorkId, detectConclusion: DetectConclusion.NoAbnormality })
				const { data: points = [] } = await http.queryDetaillist({ userId, workId, subWorkId: subwork.subWorkId })
				for (const point of points) {
					if (point.status) continue
					this.pointBasics.push({ ...point, subWorkId: subwork.subWorkId })
					workOrderDataSource.updatedSubWorkPointsByWorkIdAndSubWorkId({ ...point, workId, subWorkId: subwork.subWorkId })
					const completePoint = workOrderDataSource.getSubWorkPointByWorkIdAndSubWorkId(workId, subwork.subWorkId, undefined, point.workDetailId)
					completePoint &&
						scheduler.add(
							async () =>
								await new Promise((resolve, reject) => {
									;(async () => {
										try {
											await db.updatePartialPointSubWorkOrder(completePoint)
											resolve()
										} catch (error) {
											reject(error)
										}
									})()
								})
						)
				}
			}
		},
		updatedCurrentSubWorkOrder(currentSubWorkOrder) {
			this.currentSubWorkOrder = currentSubWorkOrder
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			if (!workId || !subWorkId) return
			this.completePointCount = workOrderDataSource.getPointStatusCountOfSubWorkOrder(workId, subWorkId, 1)
			this.deviceTypeName = '设备类型'
			this.voltageLevel = '电压等级'
		},
		updatedCurrentMode(mode) {
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			const groupId = this.currentGroup?.groupId
			this.currentMode = mode
			workOrderDataSource.deleteTemporaryFileForInfrared()
			if (workId && subWorkId) {
				this.completePointCount = workOrderDataSource.getPointStatusCountOfSubWorkOrder(workId, subWorkId, 1)
				this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
				if (groupId) {
					this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
					this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, groupId)
					const fileGroupId = workOrderDataSource.getNoDeleteFileGroupByWorkIdAndSubWorkId(workId, subWorkId, groupId)
					this.currentFileGroupId = fileGroupId && fileGroupId !== 1 ? fileGroupId : undefined
				}
			}
		},
		async submitWorkOrderWidthPointReasonToPlatform() {
			const { user } = useLoginStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId
			if (!userId || !workId) {
				throw new Error(`用户${user?.userName}/工单${this.currentWorkOrder?.workName}不存在！`)
			}

			this.currentDetectClimate.reasonNotDetectList = this.pointBasics.map((p) => ({ workDetailId: p.workDetailId, reasonNotDetect: p.reasonNotDetect }))
			await http.submitWorkOrder(deepClone(this.currentDetectClimate))

			Object.assign(this.currentWorkOrder!, { status: 2 })
			workOrderDataSource.updatePartialWorkOrder({ workId, status: 2, adoptUserName: user.userNick })
			const workIds = loginDataSource.getWorkIdsByUserId(userId)
			this.workOrders = workOrderDataSource.getWorkOrdersByWorkIds(workIds)
			await db.updatePartialWorkOrder({ workId, status: 2, adoptUserName: user.userNick })
		},
		updatedCurrentGroup(workId, subWorkId, groupId) {
			this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
			this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
			this.points = workOrderDataSource.getCompletePointsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
			this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, groupId)
			const fileGroupId = workOrderDataSource.getNoDeleteFileGroupByWorkIdAndSubWorkId(workId, subWorkId, groupId)
			this.currentFileGroupId = fileGroupId && fileGroupId !== 1 ? fileGroupId : undefined
			if (this.currentGroup && this.currentMode === 0) {
				const countMap = workOrderDataSource.getFileStatusCountMap(workId, subWorkId, this.currentGroup.groupId)
				if (countMap[0] === 0) return
				const total = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup).length
				const text = getTTStext(this.points, total)
				this.currentWorkOrder?.status !== 2 && text && process.startTTS(text)
			}
		},
		createdTemporaryFileGroup(isCreated) {
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			const groupId = this.currentGroup?.groupId
			const workDetailId = this.currentGroup?.workDetailId
			if (!workId || !subWorkId || !groupId || !workDetailId) {
				throw new Error(`工单${this.currentWorkOrder?.workName}不存在！`)
			}

			if (this.currentMode !== 0 || this.currentWorkOrder?.status === 2) {
				return
			}
			!isCreated && workOrderDataSource.deleteTemporaryFileForInfrared(workId, subWorkId, groupId)
			workOrderDataSource.createdTemporaryFileForInfrared(workId, subWorkId, groupId, workDetailId, this.currentMode, isCreated)
			this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
			this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, groupId)
			const fileGroupId = workOrderDataSource.getNoDeleteFileGroupByWorkIdAndSubWorkId(workId, subWorkId, groupId)
			this.currentFileGroupId = fileGroupId && fileGroupId !== 1 ? fileGroupId : undefined
			this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
		},
		prepareGroupedDetectionPoints() {
			const workOrder = this.currentWorkOrder
			const subWorkOrder = this.currentSubWorkOrder
			const groups = this.groups

			if (this.currentMode !== 0 || !this.voiceGuide) {
				return
			}

			if (!workOrder || !subWorkOrder || groups.length === 0) {
				throw new Error(`子/工单${workOrder?.workName || ''} 或分组信息不存在！`)
			}

			const { workId } = workOrder
			const { subWorkId } = subWorkOrder
			const findIndex = groups.findIndex((g) => g.groupId === this.currentGroup?.groupId)
			const startIndex = findIndex === -1 ? 0 : findIndex
			ringTraverse(groups, startIndex, (group) => {
				const fileGroupId = workOrderDataSource.getNoDeleteFileGroupByWorkIdAndSubWorkId(workId, subWorkId, group.groupId)
				if (fileGroupId !== 1) {
					this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, group.groupId)
					this.points = workOrderDataSource.getCompletePointsByWorkIdAndSubWorkId(workId, subWorkId, group.groupId)
					this.currentFileGroupId = fileGroupId
					this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, group.groupId)
					this.createdTemporaryFileGroup()
					this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(
						workId,
						subWorkId,
						this.currentMode,
						this.currentGroup,
						this.deviceTypeName,
						this.voltageLevel,
						this.searchValue
					)

					if (this.currentGroup && this.currentMode === 0) {
						const countMap = workOrderDataSource.getFileStatusCountMap(workId, subWorkId, this.currentGroup.groupId)
						if (countMap[0] !== 0) {
							const total = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup).length
							const text = getTTStext(this.points, total)
							this.currentWorkOrder?.status !== 2 && text && process.startTTS(text)
						}
					}
					return true
				}
				return false
			})
		},
		updateCurrentInfraredFileStatusAndValue(vi, ir) {
			const { user } = useLoginStore()
			const { sensorEid } = useRootStore()
			const { workspack } = useRootStore()
			const userId = user?.userId
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			const groupId = this.currentGroup?.groupId
			const mode = this.currentMode
			if (!userId || !workId || !subWorkId || !groupId || mode !== 0) {
				throw new Error(`用户${user?.userName}/工单${this.currentWorkOrder?.workName}不存在！`)
			}

			const targetTypes: DetectTypeCooperateWith[] = [1, 2]
			const valueMap: Record<DetectTypeCooperateWith, string> = {
				1: vi,
				2: ir
			}

			const fileGroup = this.currentFileGroupId || uuid()
			const files: PointFile[] = []
			const workDetailType = workOrderDataSource.getFileOfWorkDetailType(workId, subWorkId, groupId, this.currentFileGroupId)
			const workDetailIndex = workOrderDataSource.getFileOfWorkDetailIndex(workId, subWorkId, groupId, this.currentFileGroupId)
			const fgs = this.currentFilesGroup[fileGroup]

			for (const tt of targetTypes) {
				const type = [this.currentSubWorkOrder?.detectMethod, tt, this.currentMode].join(KeyIdDelimiter) as PointFileType
				const findResult = fgs.find((f) => f.type === type)

				files.push({
					id: Date.now() + tt,
					...findResult,
					workId,
					subWorkId,
					groupId,
					fileGroup,
					workDetailId: this.currentGroup!.workDetailId,
					status: 10,
					detectMethod: this.currentGroup!.detectMethod,
					type,
					flieKey: PointFileTypeEnum[type],
					fileValue: valueMap[tt],
					idCode: sensorEid[0],
					workDetailType,
					workDetailIndex,
					userId,
					mode: this.currentMode,
					workspaceId: workspack.id,
					updatedAt: Date.now()
				})
			}

			workOrderDataSource.addNewFilesEntriesToUserMap(files)
			this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length
			this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
			this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
			this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, groupId)
			const fileGroupId = workOrderDataSource.getNoDeleteFileGroupByWorkIdAndSubWorkId(workId, subWorkId, groupId)
			this.currentFileGroupId = fileGroupId && fileGroupId !== 1 ? fileGroupId : undefined
			this.prepareGroupedDetectionPoints()
		},
		async updatedCurrentInfraredFileStatusAndValue(idMap, status) {
			const { files, points } = workOrderDataSource.updatedCompleteDeleteFileIdAndStatus(idMap, status)
			await db.updatedFilesOfPoint(
				files.map((file) => ({
					id: file.id,
					status
				}))
			)

			for (const point of points) {
				await db.updatePartialPointSubWorkOrder({
					workId: point.workId,
					subWorkId: point.subWorkId,
					workDetailId: point.workDetailId,
					status: point.status
				})
			}

			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			const groupId = this.currentGroup?.groupId

			this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length
			if (workId && subWorkId) {
				this.completePointCount = workOrderDataSource.getPointStatusCountOfSubWorkOrder(workId, subWorkId, 1)
				this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
				if (groupId) {
					this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
					this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, groupId)
					const fileGroupId = workOrderDataSource.getNoDeleteFileGroupByWorkIdAndSubWorkId(workId, subWorkId, groupId)
					this.currentFileGroupId = fileGroupId && fileGroupId !== 1 ? fileGroupId : undefined
				}
			}
		},
		updatedSocketIdConnectedStatus(ip, isConnected) {
			this.socketIdConnected[ip] = isConnected
			if (isConnected) {
				localStorage.setItem(
					'modeIpCatch',
					JSON.stringify({
						[this.currentMode!]: ip
					})
				)
			}
		},
		updatedCurrentModeIpMap(ip) {
			if (this.currentMode || this.currentMode === 0) {
				this.currentModeIPMap[this.currentMode] = ip
			}
		},
		async transmitDetectDataToServer(groupIds = []) {
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			if (!workId || !subWorkId) {
				this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length
				throw new Error(`工单${this.currentWorkOrder?.workName}/子工单${this.currentSubWorkOrder?.detectMethodCn}/检测方法${this.currentMode}不存在！`)
			}

			if (this.currentMode === 2) {
				if (!this.bluetoothMacs.length) {
					throw new Error(`当前检测模式的mac地址或端口号不存在！`)
				}
			} else {
				const { ip, port } = extractIpPort(this.currentModeIPMap[this.currentMode!])!

				if ((!ip || !port) && !this.bluetoothMacs.length) {
					throw new Error(`当前检测模式的IP地址或端口号不存在！`)
				}
			}

			if (!this.currentWorkOrder || !this.currentSubWorkOrder || !this.currentMode) {
				this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length
				throw new Error(`工单${this.currentWorkOrder?.workName}/子工单${this.currentSubWorkOrder?.detectMethodCn}/检测方法${this.currentMode}不存在！`)
			}

			const pointMap = workOrderDataSource.getCompletePointsByWGroppIds(this.currentWorkOrder.workId, this.currentSubWorkOrder.subWorkId, groupIds)
			if (!pointMap) return

			const points: SubWorkOrderPoint[] = []
			const mode = this.currentMode

			for (const [_groupId, value] of pointMap) {
				if (!value || !value.length) continue
				if (mode === 1) {
					points.push({ ...value[0], workDetailId: `${value[0].workDetailId}${mode}${2}${1}` })
					continue
				}
				for (const v of value) {
					const workDetailId = v.workDetailId
					points.push({ ...v, workDetailId: `${workDetailId}${mode}${2}${1}` })
				}
			}
			await process.sendDetectData(deepClone(this.currentWorkOrder), deepClone(this.currentSubWorkOrder), points)
		},
		async transmitDetectPointDataToServer(point) {
			if (!this.bluetoothMacs.length) {
				throw new Error(`当前检测模式${this.currentMode}的mac地址或端口号不存在！`)
			}
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			const groupId = this.currentGroup?.groupId
			if (!workId || !subWorkId || !groupId) {
				this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length
				throw new Error(`工单${this.currentWorkOrder?.workName}/子工单${this.currentSubWorkOrder?.detectMethodCn}/检测方法${this.currentMode}不存在！`)
			}

			const files = workOrderDataSource.getAllFilesOfPoint(point)
			await process.sendDetectData(deepClone(this.currentWorkOrder!), deepClone(this.currentSubWorkOrder!), [
				{ ...point, workDetailId: `${point.workDetailId}${this.currentMode}2${files.length + 1}` }
			])
		},
		updatedFileStatusAndValue(filesInfo) {
			const { user } = useLoginStore()
			const { sensorEid } = useRootStore()
			const { workspack } = useRootStore()
			const userId = user!.userId
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			const groupId = this.currentGroup?.groupId
			let id = Date.now()
			for (let index = 0; index < filesInfo.length; index++) {
				id = id + index
				const info = filesInfo[index]
				const file = workOrderDataSource.getClearanceByMode(info.mode)?.call(workOrderDataSource, info, userId, workspack.id, sensorEid, id)
				workOrderDataSource.addNewFilesEntriesToUserMap([file])
			}

			this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length

			if (workId && subWorkId) {
				this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
				if (groupId) {
					this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
					this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, groupId)
					const fileGroupId = workOrderDataSource.getNoDeleteFileGroupByWorkIdAndSubWorkId(workId, subWorkId, groupId)
					this.currentFileGroupId = fileGroupId && fileGroupId !== 1 ? fileGroupId : undefined
				}
			}
		},
		async taskDispatcherSuccess(points) {
			const { user } = useLoginStore()
			const { workspack } = useRootStore()
			const { sensorEid } = useRootStore()
			const userId = user?.userId
			let tempIdCounter = Date.now()
			const files = points
				.map((point) => {
					const [workDetailId, mode, workDetailType, workDetailIndex] = splitNumber(point.workDetailId, [18, 1, 1, 0])
					const { workId, subWorkId } = point

					if (workOrderDataSource.checkFileExecutionConflict(workId, subWorkId, point.groupId, workDetailId)) {
						return null
					}

					const types: string[] = [mode === 3 ? '*' : '1']
					if (point.detectMethod === 6) types.push('2')

					const { groupId } = workOrderDataSource.getPointAndGroupIdByWorkDetailId(workId, subWorkId, workDetailId)

					return types.map((type) => {
						const typeKey = `${point.detectMethod}${KeyIdDelimiter}${type}${KeyIdDelimiter}${mode}`
						const flieKey = PointFileTypeEnum[typeKey]
						const f = workOrderDataSource.getCompleteDeleteByWorkDetailIndex(workId, subWorkId, groupId, workDetailId, workDetailIndex, flieKey)

						tempIdCounter++
						return {
							id: tempIdCounter,
							workId,
							subWorkId,
							groupId,
							fileGroup: '',
							workDetailId,
							status: 1 as PointFileStatus,
							detectMethod: point.detectMethod,
							type: typeKey as PointFileType,
							workDetailType,
							workDetailIndex,
							userId,
							mode,
							workspaceId: workspack.id,
							updatedAt: Date.now(),
							flieKey,
							fileValue: '',
							idCode: f?.idCode || sensorEid[mode],
							...f
						}
					})
				})
				.filter(Boolean)
				.flat() as PointFile[]

			const newId = await db.insertFilesOfPoint(files)

			for (let index = 0; index < files.length; index++) {
				const file = files[index]
				file.id = newId[index]
			}

			workOrderDataSource.addNewFilesEntriesToUserMap(files)

			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId

			if (workId && subWorkId) {
				this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)
				const groupId = this.currentGroup?.groupId
				if (groupId) {
					this.currentGroup = workOrderDataSource.getCompleteGroupsByWorkIdAndSubWorkId(workId, subWorkId, groupId)
					this.currentFilesGroup = workOrderDataSource.getGroupFileGroupsByWorkDetail(workId, subWorkId, groupId)
				}
			}
		},
		updatedBluetoothMacs(mac, isConnected) {
			const index = this.bluetoothMacs.indexOf(mac)
			if (isConnected && index === -1) {
				this.bluetoothMacs.push(mac)
			} else if (!isConnected && index !== -1) {
				this.bluetoothMacs.splice(index, 1)
			}
		},
		clearSearchValue() {
			this.searchValue = ''
		},
		updatedGroupsBySearch() {
			const workId = this.currentWorkOrder?.workId
			const subWorkId = this.currentSubWorkOrder?.subWorkId
			if (!workId || !subWorkId) {
				this.pendingUploadCount = workOrderDataSource.getAllUploadFiles().length
				throw new Error(`工单${this.currentWorkOrder?.workName}/子工单${this.currentSubWorkOrder?.detectMethodCn}/检测方法${this.currentMode}不存在！`)
			}
			this.groups = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup, this.deviceTypeName, this.voltageLevel, this.searchValue)

			if (this.currentGroup && this.currentMode === 0) {
				const countMap = workOrderDataSource.getFileStatusCountMap(workId, subWorkId, this.currentGroup.groupId)
				if (countMap[0] === 0) return
				const total = workOrderDataSource.getSimplifiedGroupsByCurrentGroup(workId, subWorkId, this.currentMode, this.currentGroup).length
				const text = getTTStext(this.points, total)
				this.currentWorkOrder?.status !== 2 && text && process.startTTS(text)
			}
		}
	}
}

export default defineStore('workOrder', workOrderStoreOptions)
