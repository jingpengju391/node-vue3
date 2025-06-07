import { KeyIdDelimiter } from './helpers'
import { reverseMap } from './util'

export type WorkOrderStatus = 0 | 1 | 2 | 10

export const WorkOrderStatusMap: Record<WorkOrderStatus, string> = {
	0: '待执行',
	1: '执行中',
	2: '已完成',
	10: '已逾期'
}

export type WorkOrderRange = 1 | 2

export const WorkOrderRangeMap: Record<WorkOrderRange, string> = {
	1: '全部设备',
	2: '部分设备'
}

export interface WorkOrderParams {
	userId: string // 用户ID，必填
	mtCode: string // 移动终端编码，必填
	status?: WorkOrderStatus // 工单状态，可选
	beginTime?: string // 开始时间，可选，格式：yyyy-MM-dd HH:mm:ss
	endTime?: string // 结束时间，可选，格式：yyyy-MM-dd HH:mm:ss
}

export interface WorkOrderResponse {
	code: number // 结果码
	msg: string // 结果描述
	data: WorkOrder[] // 工单信息集合
}

interface WorkOrderBasics {
	workId: string // 工单ID，必填
	workName: string // 工单名称，必填
	substationName: string // 检测站点，必填
	detectRange: WorkOrderRange // 检测范围，1: 全部; 2: 部分
	detectBeginTime: string // 检测开始时间，格式：yyyy-MM-dd HH:mm:ss
	detectEndTime: string // 检测结束时间，格式：yyyy-MM-dd HH:mm:ss
	detectMethodsCn: string // 检测方法中文集合
	status: WorkOrderStatus // 工单状态
	sysDeptId: string // 所在公司ID
	sysDeptName: string // 所在公司名称
	sysCenterId: string // 所在中心ID
	sysCenterName: string // 所在中心名称
	sysTeamId: string // 所在班组/运维队ID
	sysTeamName: string // 所在班组/运维队名称
	createUserId: number // 建单人ID
	createUserName: string // 建单人
	adoptUserId: string // 认领人ID
	adoptUserName: string // 认领人
	temperature: number // 环境温度
	humidity: number // 环境湿度
	substationId: string
	workRemark: string
	adoptAt?: number
}

export interface WorkOrder extends WorkOrderBasics {
	detectMethods: string[] // 检测方法集合
}

export interface AnchorWorkOrder extends WorkOrderBasics {
	detectMethods: string // 检测方法集合
}

export interface AssignParams {
	userId: string // 用户ID，必填
	workId: string // 工单ID，必填
}

export type WorkOrderWithRequiredId = Partial<Omit<WorkOrder, 'workId'>> & { workId: string }

export type SubWorkStatus = 0 | 1 | 2 | 10

export type AdoptStatus = 0 | 1 | 2

export type DetectMethod = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 // 检测方法：1-特高频局放，2-高频检测，3-超声检测，4-TEV检测，5-气体检测，6-红外，7-紫外，8-可视化超声，9-采油，10-非接触式超声

export const DetectMethodToMainTaskTypeCode: Record<DetectMethod, MainTaskTypeCode> = {
	1: 0x06, // 特高频局放 → 开关柜特高频局放检测
	2: 0x08, // 高频检测 → 变压器高频局放
	3: 0x04, // 超声检测 → 开关柜超声波局放
	4: 0x05, // TEV检测 → 开关柜暂态地局放
	5: 0x11, // 气体检测 → 油中溶解气体
	6: 0x01, // 红外 → 红外测温
	7: 0x07, // 紫外 → 紫外检测
	8: 0x04, // 可视化超声 → 开关柜超声波局放
	9: 0x0a, // 采油/振动 → 振动检测
	10: 0x04 // 非接触式超声 → 开关柜超声波局放
}

export const MaintenanceEnum: Partial<Record<DetectMethod, string>> = {
	1: 'UHFDDJC',
	2: 'EXTRA_HIGH',
	3: 'AEDDJC',
	4: 'TEV',
	6: 'INFRARED_DETECTION',
	10: 'NON_CONTACT_ULTRASOUND'
}

export const PointFileTypeEnum = {
	[`1${KeyIdDelimiter}1${KeyIdDelimiter}2`]: 'uhfDataFile',
	[`1${KeyIdDelimiter}2${KeyIdDelimiter}2`]: 'uhfBgDataFile',

	[`2${KeyIdDelimiter}1${KeyIdDelimiter}2`]: 'hfctDataFile',
	[`2${KeyIdDelimiter}2${KeyIdDelimiter}2`]: 'hfctBgDataFile',

	[`3${KeyIdDelimiter}1${KeyIdDelimiter}2`]: 'aeDataFile',
	[`3${KeyIdDelimiter}2${KeyIdDelimiter}2`]: 'aeBgDataFile',

	[`4${KeyIdDelimiter}1${KeyIdDelimiter}2`]: 'tevDataFile',
	[`4${KeyIdDelimiter}2${KeyIdDelimiter}2`]: 'tevBgDataFile',

	[`6${KeyIdDelimiter}1${KeyIdDelimiter}1`]: 'camFileName',
	[`6${KeyIdDelimiter}2${KeyIdDelimiter}1`]: 'firFileName',

	[`6${KeyIdDelimiter}1${KeyIdDelimiter}0`]: 'camFileName',
	[`6${KeyIdDelimiter}2${KeyIdDelimiter}0`]: 'firFileName',

	[`10${KeyIdDelimiter}1${KeyIdDelimiter}2`]: 'aeDataFile',
	[`10${KeyIdDelimiter}2${KeyIdDelimiter}2`]: 'aeBgDataFile',

	[`1${KeyIdDelimiter}*${KeyIdDelimiter}3`]: 'dmsFileName',
	[`2${KeyIdDelimiter}*${KeyIdDelimiter}3`]: 'uhfFileName'
} as const

export type PointFileType = keyof typeof PointFileTypeEnum

export type FileKey = (typeof PointFileTypeEnum)[PointFileType]

export type DetectMode = 0 | 1 | 2 | 3 // 检测模式：0-协同，1-任务，2-t95，3-dms

export type DetectTypeCooperateWith = 1 | 2 // 1-可见光，2-红外

export const SubWorkStatusMap: Record<DetectMethod, DetectMode[]> = {
	1: [2, 3],
	2: [2, 3],
	3: [2],
	4: [2],
	5: [],
	6: [0, 1],
	7: [],
	8: [],
	9: [],
	10: [2]
}

export interface SubWorkBasics {
	subWorkId: string // 子工单ID
	subWorkUserId?: string // 子工单认领人ID（可选）
	detectMethod: DetectMethod // 检测方法
	detectMethodCn: string // 检测方法中文
	detectPositionTotal: number // 检测部位总数
	detectPositionComplete: number // 检测部位完成数
	status: SubWorkStatus // 子工单状态
}

export const SubWorkModeMap: Record<SubWorkStatus, string> = {
	0: '待执行',
	1: '执行中',
	2: '已完成',
	10: '部分完成'
}

export interface SubWork extends SubWorkBasics {
	workId: string // 工单ID
	mode?: DetectMode[] // 检测模式
}

export type SubWorkOrderWithRequiredId = Partial<Omit<SubWork, 'workId' | 'subWorkId'>> & { workId: string; subWorkId: string }

export interface DetectRequestParams {
	userId: string // 用户 ID，必传
	workId: string // 工单 ID，必传
	routeType: number // 路径类型：0 是平台，1 是个人，必传
	detectMethod?: DetectMethod // 检测方法，选传
}

// 检测任务同步 - 响应结构
export interface DetectResponse {
	code: number // 结果码，0 表示成功
	msg: string // 结果说明，比如 "操作成功"
	data: DetectGroup[] // 检测部位组列表
}

export interface DetectGroup {
	detectMethod: DetectMethod // 检测方法
	detectMethodCn: string // 检测方法中文名称
	orderNumber: number // 顺序号
	groupId: string // 检测部位组 ID
	detectPositionList: DetectPositionBasics[] // 检测部位列表
}

export interface DetectPosition extends DetectPositionBasics {
	workId: string // 工单ID
	subWorkId: string // 子工单ID
}

export interface DetectPositionBasics {
	detectMethod: DetectMethod // 检测方法
	detectMethodCn: string // 检测方法中文名
	deviceType: string // 主设备类型（数值型）
	deviceTypeName: string // 主设备类型名称
	voltageLevel: string // 电压等级，比如 "10kV"
	detectPositionId: string // 检测部位 ID
	detectPositionName: string // 检测部位名称
	orderNumber: number // 顺序号
	deviceId: string // 主设备 ID
	deviceName: string // 主设备名称
	dispatchNumber: string // 调度号
	blockName: string // 间隔单元（间隔设备名称）
}

export interface SubWorkPointRequestParams {
	userId: string // 用户 ID，必传
	workId: string // 工单 ID，必传
	subWorkId: string // 子工单 ID，必传
}
export interface AdopSubWorkRequestParams {
	userId: string // 用户 ID，必传
	workId: string // 工单 ID，必传
	subWorkId: string // 子工单 ID，必传
}

export interface SubWorkPointStatusResponse {
	code: number // 结果码，0 表示成功
	msg: string // 结果说明，比如 "操作成功"
	data: SubWorkOrderPoint[] // 工单信息列表
}

export interface SubWorkOrderPoint extends SubWorkOrderPointBasics {
	workId: string // 工单ID
	subWorkId: string // 子工单ID
	groupId: string // 检测部位组 ID
	deviceType: string // 主设备类型（数值型）
	deviceId: string // 主设备 ID
	blockName: string // 间隔单元（间隔设备名称）
	orderNumber: number // 顺序号
	groupOrder: number // 组顺序号
}

export type PointDetectStatus = 0 | 1 // 检测状态：0-未检测，1-已检测
export const PointDetectStatusEnum: Record<PointDetectStatus, string> = {
	0: '待标记',
	1: '已标记'
}

export interface SubWorkOrderPointBasics {
	subWorkId: string // 子工单 ID
	workDetailId: string // 工单明细 ID
	detectPositionId: string // 检测部位 ID
	status: PointDetectStatus // 检测状态：0-未检测，1-已检测
	reasonNotDetect: string // 未检出原因（参考字典）
	detectMethod: DetectMethod // 检测方法
	detectMethodCn: string // 检测方法中文名称
	deviceTypeName: string // 主设备类型名称
	voltageLevel: string // 电压等级
	detectPositionName: string // 检测部位名称
	deviceName: string // 主设备名称
	dispatchNumber: string // 调度号
}

export type SubWorkOrdePointrWithRequiredId = Partial<Omit<SubWork, 'workId' | 'subWorkId' | 'workDetailId'>> & { workId: string; subWorkId: string; workDetailId: string }

export enum DetectConclusion {
	NoAbnormality = '未见异常',
	AbnormalFound = '发现异常'
}

export type GS = { [K in PointFileStatus]?: number }

export interface SimplifiedGroup {
	workId: string // 工单ID
	subWorkId: string // 子工单ID
	groupId: string // 检测部位组 ID
	status: GS
	detectPositionName: string // 检测部位名称
	deviceTypeName: string // 主设备类型名称
	detectMethod: DetectMethod // 检测方法
	voltageLevel: string // 电压等级
	deviceName: string // 主设备名称
	deviceType: string // 主设备类型（数值型）
	groupOrder: number // 组顺序号
}

export interface CompleteGroup extends SubWorkOrderPoint {}

export interface DetectClimate {
	userId: string // 用户ID
	workId: string // 工单ID
	temperature: number // 环境温度
	humidity: number // 环境湿度
	reasonNotDetectList?: ReasonNotDetect[] // 可选，未检原因列表
	subWorkList?: DetectSubWork[] // 可选，子工单检测结论列表
}

export interface DetectWorkData extends DetectClimate {}

export interface ReasonNotDetect {
	workDetailId: string // 工单明细ID
	reasonNotDetect: string // 未检出原因（字典值）
}

export interface DetectSubWork {
	subWorkId: string // 子工单ID
	detectConclusion: string // 检测结论
}

export type PointFileStatus = 0 | 1 | 2 | 10 | 500

export const FileTypeEnum: Record<PointFileStatus, string> = {
	0: '待执行',
	1: '执行中',
	2: '已完成',
	10: '待上传',
	500: '上传失败'
}

// export const FileKeyToType: Record<FileKey, PointFileType> = Object.fromEntries(Object.entries(PointFileTypeEnum).map(([k, v]) => [v, Number(k)])) as Record<FileKey, PointFileType>

export type WorkDetailType = 1 | 2 // 1:重测；2:增测;
export interface PointFile {
	id: number
	workId: string
	subWorkId: string
	groupId: string
	fileGroup: string
	workDetailId: string
	status: PointFileStatus
	detectMethod: DetectMethod
	type?: PointFileType
	flieKey?: FileKey
	fileValue?: string
	workspaceId: number
	updatedAt?: number
	createdAt?: string
	idCode?: string
	workDetailType: WorkDetailType
	workDetailIndex: number
	userId?: string
	mode?: DetectMode
}

export type PointFileWithoutId = Omit<PointFile, 'id'> & { id?: number }

export type PartialPointFile = Partial<Omit<PointFile, 'id'>> & { id: number }

export type DBPointFile = Omit<PointFile, 'id' | 'workspaceId'>

export interface UploadFileDataItem {
	purpose?: string // 文件用途
	fileName: string // 文件名
	fileType: string // 文件类型
	fileData: string // 文件数据（Base64）
}

export type UploadFileDataItemString = string & { __type__: 'UploadFileDataItemString' }

export interface UploadRequestPayload {
	mtCode: string // 移动终端编码（mtCode）
	idCode: string // 仪器设备编码（idCode）
	data: UploadFileDataItem[] // 要上传的文件数组
}

export type PartialFileKey = Partial<Record<FileKey, string>>
export interface SensorData extends PartialFileKey {
	sensorCode: string // 传感器编码，例如："09984d170002300"
	timestamp: string // 数据时间，例如："2020-08-06 19:40:29"
}

export interface ParamPayload {
	data: SensorData // 传感器业务数据
	cmd?: string // 可选，数据类型
}

export interface SensorUploadRequest {
	mid: string | number // 请求 ID（可能为字符串 UUID，也可能是数字）
	deviceId?: string // 可选，汇聚设备唯一标识
	timestamp: number // 消息发送时间戳（秒）
	type: string // 消息类型，例如：CMD_REPORTDATA
	workDetailId?: string // 可选，工单明细 ID（你示例中没出现，但描述中存在）
	userId?: string // 可选，用户 ID
	workDetailType?: WorkDetailType // 可选，工单明细数据类型
	workDetailIndex?: number // 可选，工单明细数据序号
	param: ParamPayload // 报文内容
}

export interface ParserAcceptDetectPoint {
	id: string
	fileName: string
}

export interface ParserAcceptDetect {
	workId: string
	subWorkId: string
	detectMethod: DetectMethod
	files: ParserAcceptDetectPoint[]
}

export interface IDescriptionXML {
	IDescription: {
		version: string
		main_task: MainTaskXML
	}
}

export interface MainTaskXML {
	$: {
		type: string
		id: string
		name: string
	}
	file_count: string
	file_type: string
	sub_task: SubTaskXML
}

export interface SubTaskXML {
	$: {
		id: string
		name: string
	}
	clearance: ClearanceXML | ClearanceXML[]
}

export interface ClearanceXML {
	$: {
		sn: string
		id: string
		name: string
	}
	test_point: TestPoint | TestPoint[]
}

export interface TestPoint {
	$: {
		filename: string
		id: string
		part: string
		fault_nature: string
		name: string
		phase: string
		fullscrean_max: string
		fullscrean_min: string
		bgfilename: string
		device_type_id: string
		device_type_name?: string
		voltage_level: string
		status?: number
	}
}

export type MainTaskTypeCode = 0x01 | 0x02 | 0x03 | 0x04 | 0x05 | 0x06 | 0x07 | 0x08 | 0x09 | 0x0a | 0x0b | 0x0c | 0x0d | 0x0e | 0x0f | 0x10 | 0x11 | 0x12

export const MainTaskTypeCodeToDetectMethod = reverseMap(DetectMethodToMainTaskTypeCode)

export interface UploadFileInfo {
	workId: string
	subWorkId: string
	workDetailId: string
	filePath: string
	fileGroup: string
	mode: DetectMode
	detectMethod: DetectMethod
	type: PointFileType
	idCode?: string
	workDetailType?: WorkDetailType
	workDetailIndex?: number
	status?: PointFileStatus
}

export interface ILogService {
	log(message: any, ...options: any[]): void
	warn(message: any, ...options: any[]): void
	error(message: any, ...options: any[]): void
}

export interface ITerminable {
	terminate(): void
}

// Custom return type to include fileBuffers
export interface IOpenDialogWithBuffersReturnValue extends Electron.OpenDialogReturnValue {
	fileBuffers: Buffer[] // Add fileBuffers as an array of Buffer objects
}

export enum FileType {
	VI = 'vi',
	IR = 'ir',
	DMS = 'dms',
	STD = 'std',
	BKG = 'bkg'
}
