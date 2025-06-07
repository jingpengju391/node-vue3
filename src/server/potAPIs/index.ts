import { formatDateTime } from '@util/index'
import { getPreviousNDays } from '@/utils'
import { DaysWidth } from '@shared/dataModelTypes/helpers'
import { $http } from '@service/httpClient/http'
import DBClient from '@service/db/dbClient'
import chineseToPinyin from 'chinese-to-pinyin'
import TCPClient from '@service/socket'
import { getModelWindow } from '../../main/configWindows'
import { ModelWindowKey } from '../../shared/dataModelTypes/windows'

// 定义 _weather_data 中单个元素的类型
interface WeatherItem {
	dictCode: string
	dictValue: string
	dictLabel: string
	dictSort: number
}
// 定义 _weather_dto 的类型
export interface WeatherDTO {
	dataType: 'weather_info'
	dictCode: string
	dictValue: string
	dictLabel: string
	dictSort: number
}
interface PotDeviceResp {
	potDeviceId: string
	potDeviceName: string
	potDeviceCode: string
	potDeviceType: string
	potDeviceModel: string
	potDeviceCompany: string
	potDataDetailList: potDataDetail[]
}

interface potDataDetail {
	attributeId: string
	attributeName: string
	attributeDataUnit: string
}

export interface PotDevice {
	dataType: string
	userId: string
	potDeviceId: string
	potDeviceName: string
	potDeviceCode: string
	potDeviceType: string
	potDeviceModel: string
	potDeviceCompany: string
}

interface PotAttributeInfo {
	dataType: string
	userId: string
	potDeviceId: string
	attributeId: string
	attributeName: string
	attributeDataUnit: string
}

interface deptUserResp {
	userId: string
	userNick: string
}

export interface deptUser {
	dataType: string
	userId: string
	userNick: string
	deptUserId: string
}

interface potWorkResp {
	workId: string
	workName: string
	substationName: string
	potBeginTime: string
	potEndTime: string
	potDeviceNames: string
	potItemCns: string
	status: number
}

export interface potWork {
	dataType: string
	userId: string
	workId: string
	workName: string
	substationName: string
	potBeginTime: string
	potEndTime: string
	potDeviceNames: string
	potItemCns: string
	status: number
}

export interface potWorkReq {
	status?: number | undefined
	name?: string | undefined
	userId: string
	deviceCode: string
}

export async function getPotWorkList(paramReq: potWorkReq): Promise<potWork[]> {
	const endTime = formatDateTime()
	const beginTime = getPreviousNDays(endTime, DaysWidth)
	const userId = paramReq.userId
	const deviceCode = paramReq.deviceCode
	const status = paramReq.status
	const name = paramReq.name
	const _dict_data_param = { userId: userId, dictType: 'weather' }
	const _weather_result = await $http('/v1/mt/dict/dataList', 'POST', _dict_data_param)
	if (_weather_result.code !== 200) {
		console.log('天气信息获取失败')
		return []
	}
	const _weather_data: WeatherItem[] = _weather_result.data
	const _weather_do_array: WeatherDTO[] = _weather_data.map((_weather: WeatherItem) => ({
		dataType: 'weather_info',
		dictCode: _weather.dictCode,
		dictValue: _weather.dictValue,
		dictLabel: _weather.dictLabel,
		dictSort: _weather.dictSort
	}))
	await DBClient.getInstance('')('weather_info').where('dataType', 'weather_info').delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const weather of _weather_do_array) {
			await trx('weather_info').insert(weather)
		}
	})

	const param = { userId: String(userId), mtCode: deviceCode }
	const potDeviceResult = await $http('/v1/mt/potdevice/list', 'POST', param)
	if (potDeviceResult.code !== 200) {
		console.log('设备信息获取失败')
		return []
	}
	const _pot_device_data: PotDeviceResp[] = potDeviceResult.data
	const PotDeviceList: PotDevice[] = []
	const PotAttributeList: PotAttributeInfo[] = []
	for (const pot_device of _pot_device_data) {
		const PotDevice: PotDevice = {
			dataType: 'pot_device',
			userId: userId,
			potDeviceId: pot_device.potDeviceId.toString(),
			potDeviceName: pot_device.potDeviceName,
			potDeviceCode: pot_device.potDeviceCode,
			potDeviceType: pot_device.potDeviceType,
			potDeviceModel: pot_device.potDeviceModel,
			potDeviceCompany: pot_device.potDeviceCompany
		}
		PotDeviceList.push(PotDevice)

		const _pot_attribute_list = pot_device.potDataDetailList
		for (const attribute_info of _pot_attribute_list) {
			const attributeInfo: PotAttributeInfo = {
				dataType: 'pot_attribute_info',
				userId: userId,
				potDeviceId: pot_device.potDeviceId,
				attributeId: attribute_info.attributeId,
				attributeName: attribute_info.attributeName,
				attributeDataUnit: attribute_info.attributeDataUnit
			}
			PotAttributeList.push(attributeInfo)
		}
	}
	await DBClient.getInstance('')('pot_device').where('dataType', 'pot_device').delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const potDevice of PotDeviceList) {
			await trx('pot_device').insert(potDevice)
		}
	})
	await DBClient.getInstance('')('pot_attribute_info').where('dataType', 'pot_attribute_info').delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const potAttributeInfo of PotAttributeList) {
			await trx('pot_attribute_info').insert(potAttributeInfo)
		}
	})

	const deptUserResult = await $http('/v1/mt/user/deptuserlist', 'POST', param)
	if (deptUserResult.code !== 200) {
		console.log('用户信息获取失败')
		return []
	}
	const _dept_user_data: deptUserResp[] = deptUserResult.data
	const _dept_user_do_array: deptUser[] = _dept_user_data.map((dept_user: deptUserResp) => ({
		userId: dept_user.userId,
		userNick: dept_user.userNick,
		dataType: 'pot_dept_user_info',
		deptUserId: dept_user.userId
	}))
	await DBClient.getInstance('')('pot_dept_user_info').where('dataType', 'pot_dept_user_info').delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const deptUser of _dept_user_do_array) {
			await trx('pot_dept_user_info').insert(deptUser)
		}
	})

	const params = { userId: userId, status: status, mtCode: deviceCode, beginTime: beginTime, endTime: endTime }
	console.log(JSON.stringify(params))
	const potWorkRespData = await $http('/v1/mt/potwork/list', 'POST', params)
	console.log(JSON.stringify(potWorkRespData))
	if (potWorkRespData.code !== 200) {
		console.log('工单信息获取失败')
		return []
	}
	const _pot_work_data: potWorkResp[] = potWorkRespData.data
	const _pot_work_do_array: potWork[] = _pot_work_data.map((pot_work: potWorkResp) => ({
		workId: pot_work.workId,
		workName: pot_work.workName,
		substationName: pot_work.substationName,
		potBeginTime: pot_work.potBeginTime,
		potEndTime: pot_work.potEndTime,
		potDeviceNames: pot_work.potDeviceNames,
		potItemCns: pot_work.potItemCns,
		status: pot_work.status,
		userId: userId,
		dataType: 'pot_work'
	}))
	await DBClient.getInstance('')('pot_work').where('dataType', 'pot_work').delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const potWork of _pot_work_do_array) {
			await trx('pot_work').insert(potWork)
		}
	})

	if (name !== undefined && name !== null && name !== '') {
		const potWorkDbData = await DBClient.getInstance('')('pot_work').where('dataType', 'pot_work').andWhere('userId', userId).select('*')
		const filteredPotWorks: potWork[] = potWorkDbData.filter((work) => work.workName.includes(name))
		if (status !== undefined && status !== null) {
			const _filter_result = filteredPotWorks.filter((v) => v.status === status)
			const _workName_result = _filter_result.filter((v) => v.workName === name)

			if (_workName_result.length === 0) {
				return _filter_result.filter((v) => v.substationName === name)
			} else {
				return _workName_result
			}
		}
		return filteredPotWorks
	} else {
		const _db_result: potWork[] = await DBClient.getInstance('')('pot_work')
			.where('dataType', 'pot_work')
			.andWhere('userId', userId)
			.select('*')
			.orderBy('status', 'asc')
			.orderBy('potBeginTime', 'desc')
			.orderBy('workId', 'desc')
		_db_result.sort((star, next) => {
			if (star.status !== next.status) {
				if (star.status === 1) return -1
				if (next.status === 1) return 1
				if (star.status === 0) return -1
				if (next.status === 0) return 1
			}
			// 按 potBeginTime 的指定顺序排序
			const starTime = Date.parse(star.potBeginTime)
			const nextTime = Date.parse(next.potBeginTime)
			if (starTime < nextTime) return 1
			if (starTime > nextTime) return -1
			return star.status - next.status
		})

		if (status !== undefined && status !== null) {
			return _db_result.filter((v) => v.status === status)
		} else {
			return _db_result.filter((v) => v.status !== 10)
		}
	}
}

interface testUserReq {
	userId: string
}
interface potWorkDeviceReq {
	potWorkDeviceId: string
	potResult: string
	potDeviceRemark: string
}

export interface submitPotWorkReq {
	userId: string
	workId: string
	adoptUserId: string
	testUserList: testUserReq[]
	temperature: number
	humidity: number
	weather: string
	potWorkDeviceList: potWorkDeviceReq[]
	mtCode: string
}
export async function submitPotWork(param: submitPotWorkReq): Promise<number> {
	console.log(JSON.stringify(param))
	const potWorkRespData = await $http('/v1/mt/potwork/submitwork', 'POST', param)
	console.log(JSON.stringify(potWorkRespData))
	if (potWorkRespData.code !== 200) {
		console.log('工单提交失败')
	}
	return potWorkRespData.code
}

export interface potDetailWorkReq {
	workId: string
	userId: string
	mtCode: string
}

interface pot_detail_work_resp {
	workId: string
	workName: string
	substationName: string
	potBeginTime: string
	potEndTime: string
	potNature: string
	potNatureCn: string
	status: string
	workRemark: string
	sysDeptId: string
	sysDeptName: string
	sysCenterId: string
	sysCenterName: string
	sysTeamId: string
	sysTeamName: string
	createUserId: string
	createUserName: string
	adoptUserId: string
	adoptUserName: string
	testUserList: test_User_resp[]
	temperature: string
	humidity: string
	weather: string
	weatherCn: string
	potWorkDeviceList: pot_Work_Device_Resp[]
}

interface test_User_resp {
	userId: string
	userName: string
}
interface pot_Work_Device_Resp {
	potWorkDeviceId: string
	deviceName: string
	dispatchNumber: string
	potResult: string
	potDeviceRemark: string
	deviceType: string
	potWorkItemList: pot_Work_Item_Resp[]
}
interface pot_Work_Item_Resp {
	potWorkItemId: string
	potItem: string
	potItemCn: string
	potResult: string
	oilTemp: string
	potDeviceId: string
	potDeviceName: string
	potDeviceRemark: string

	potDeviceCode: string
	potWorkDetailList: pot_Work_Detail_resp[]
}

interface pot_Work_Detail_resp {
	potWorkDetailId: string
	potPositionId: string
	potPositionName: string
	orderNumber: string
	potDataDetailList: pot_Data_Detail_resp[]
}
interface pot_Data_Detail_resp {
	attributeId: string
	attributeName: string
	attributeDataUnit: string
	dataValue: string
}
interface potDetailWorkDO {
	dataType: 'pot_work_detail_basic_info'
	userId: string
	workId: string
	workName: string
	substationName: string
	potBeginTime: string
	potEndTime: string
	potNature: string
	potNatureCn: string
	status: string
	workRemark: string
	sysDeptId: string
	sysDeptName: string
	sysCenterId: string
	sysCenterName: string
	sysTeamId: string
	sysTeamName: string
}
export interface deviceInfoDO {
	dataType: 'pot_work_detail_device_info'
	workId: string
	userId: string
	potWorkDeviceId: string
	deviceName: string
	dispatchNumber: string
	potResult: string
	potDeviceRemark: string
	adoptUserId: string
	adoptUserName: string
	deviceType: string
}

export interface itemInfoDO {
	dataType: 'pot_work_detail_item_info'
	workId: string
	userId: string
	potWorkDeviceId: string
	potWorkItemId: string
	potItem: string
	potItemCn: string
	potResult: string
	oilTemp: string
	potDeviceId: string
	potDeviceName: string
	potDeviceCode: string
	createUserId: string
	createUserName: string
	adoptUserId: string
	adoptUserName: string
	potDeviceRemark: string
}

interface positionInfoDO {
	dataType: string
	workId: string
	potWorkDeviceId: string
	potWorkItemId: string
	potWorkDetailId: string
	potPositionId: string
	potPositionName: string
	orderNumber: string
}

interface attributeInfoDO {
	dataType: string
	workId: string
	potWorkItemId: string
	potWorkDetailId: string
	potPositionId: string
	attributeId: string
	attributeName: string
	attributeDataUnit: string
	dataValue: string
	temperature: string
	humidity: string
	weather: string
	weatherCn: string
	oilTemp: string
	potBeginTime: string
	potDeviceId: string
}

export interface potDetailWorkVO {
	deviceInfoDO: deviceInfoDO
	itemInfoList: itemInfoDO[]
}

export interface potDetailWorkResultVO {
	potDetailWorkDO: potDetailWorkDO
	potDetailWorkVOList: potDetailWorkVO[]
}
export async function getPotWorkDetailList(param: potDetailWorkReq): Promise<potDetailWorkResultVO> {
	const potWorkDetailRespData = await $http('/v1/mt/potwork/detail', 'POST', param)
	console.log(JSON.stringify(potWorkDetailRespData))
	if (potWorkDetailRespData.code !== 200) {
		console.log('工单详情获取失败')
		return {
			potDetailWorkDO: {
				dataType: 'pot_work_detail_basic_info',
				userId: param.userId,
				workId: param.workId,
				workName: '',
				substationName: '',
				potBeginTime: '',
				potEndTime: '',
				potNature: '',
				potNatureCn: '',
				status: '',
				workRemark: '',
				sysDeptId: '',
				sysDeptName: '',
				sysCenterId: '',
				sysCenterName: '',
				sysTeamId: '',
				sysTeamName: ''
			},
			potDetailWorkVOList: []
		}
	}
	const userId = param.userId
	const workId = param.workId

	const _pot_work_detail_data: pot_detail_work_resp = potWorkDetailRespData.data
	const PotWorkDetailList: potDetailWorkDO[] = []
	const PotWorkDetailDeviceInfoList: deviceInfoDO[] = []
	const PotWorkDetailItemList: itemInfoDO[] = []
	const PotWorkDetailPositionList: positionInfoDO[] = []
	const PotWorkDetailAttributeList: attributeInfoDO[] = []

	const potWorkDetailDO: potDetailWorkDO = {
		dataType: 'pot_work_detail_basic_info',
		userId: userId,
		workId: _pot_work_detail_data.workId.toString(),
		workName: _pot_work_detail_data.workName,
		substationName: _pot_work_detail_data.substationName,
		potBeginTime: _pot_work_detail_data.potBeginTime,
		potEndTime: _pot_work_detail_data.potEndTime,
		potNature: _pot_work_detail_data.potNature,
		potNatureCn: _pot_work_detail_data.potNatureCn,
		status: _pot_work_detail_data.status,
		workRemark: _pot_work_detail_data.workRemark,
		sysDeptId: _pot_work_detail_data.sysDeptId.toString(),
		sysDeptName: _pot_work_detail_data.sysDeptName,
		sysCenterId: _pot_work_detail_data.sysCenterId.toString(),
		sysCenterName: _pot_work_detail_data.sysCenterName,
		sysTeamId: _pot_work_detail_data.sysTeamId.toString(),
		sysTeamName: _pot_work_detail_data.sysTeamName
	}
	PotWorkDetailList.push(potWorkDetailDO)
	const _pot_device_data: pot_Work_Device_Resp[] = _pot_work_detail_data.potWorkDeviceList
	for (const pot_device of _pot_device_data) {
		const deviceInfo: deviceInfoDO = {
			dataType: 'pot_work_detail_device_info',
			workId: workId,
			userId: userId,
			potWorkDeviceId: pot_device.potWorkDeviceId,
			deviceName: pot_device.deviceName,
			dispatchNumber: pot_device.dispatchNumber,
			potResult: pot_device.potResult,
			potDeviceRemark: pot_device.potDeviceRemark,
			adoptUserId: _pot_work_detail_data.adoptUserId,
			adoptUserName: _pot_work_detail_data.adoptUserName,
			deviceType: pot_device.deviceType
		}
		PotWorkDetailDeviceInfoList.push(deviceInfo)

		const _pot_item_data: pot_Work_Item_Resp[] = pot_device.potWorkItemList
		for (const pot_item of _pot_item_data) {
			const itemInfo: itemInfoDO = {
				dataType: 'pot_work_detail_item_info',
				workId: workId,
				userId: userId,
				potWorkDeviceId: pot_device.potWorkDeviceId.toString(),
				potWorkItemId: pot_item.potWorkItemId.toString(),
				potItem: pot_item.potItem,
				potItemCn: pot_item.potItemCn,
				potResult: pot_item.potResult,
				oilTemp: pot_item.oilTemp,
				potDeviceId: pot_item.potDeviceId,
				potDeviceName: pot_item.potDeviceName,
				potDeviceCode: pot_item.potDeviceCode,
				createUserId: _pot_work_detail_data.createUserId,
				createUserName: _pot_work_detail_data.createUserName,
				adoptUserId: _pot_work_detail_data.adoptUserId,
				adoptUserName: _pot_work_detail_data.adoptUserName,
				potDeviceRemark: pot_device.potDeviceRemark
			}
			PotWorkDetailItemList.push(itemInfo)
			const _pot_position_data: pot_Work_Detail_resp[] = pot_item.potWorkDetailList
			for (const pot_position of _pot_position_data) {
				const positionInfo: positionInfoDO = {
					dataType: 'pot_work_detail_position_info',
					workId: workId,
					potWorkDeviceId: pot_device.potWorkDeviceId,
					potWorkItemId: pot_item.potWorkItemId,
					potWorkDetailId: pot_position.potWorkDetailId,
					potPositionId: pot_position.potPositionId,
					potPositionName: pot_position.potPositionName,
					orderNumber: pot_position.orderNumber
				}
				PotWorkDetailPositionList.push(positionInfo)

				const _pot_attribute_data: pot_Data_Detail_resp[] = pot_position.potDataDetailList
				if (_pot_attribute_data.length > 0) {
					for (const potAttributeDatum of _pot_attribute_data) {
						const attributeInfo: attributeInfoDO = {
							dataType: 'pot_work_detail_attribute_info',
							workId: workId,
							potWorkItemId: pot_item.potWorkItemId,
							potWorkDetailId: pot_position.potWorkDetailId,
							potPositionId: pot_position.potPositionId,
							attributeId: potAttributeDatum.attributeId,
							attributeName: potAttributeDatum.attributeName,
							attributeDataUnit: potAttributeDatum.attributeDataUnit,
							dataValue: potAttributeDatum.dataValue,
							temperature: _pot_work_detail_data.temperature,
							humidity: _pot_work_detail_data.humidity,
							weather: _pot_work_detail_data.weather,
							weatherCn: _pot_work_detail_data.weatherCn,
							oilTemp: pot_item.oilTemp,
							potBeginTime: _pot_work_detail_data.potBeginTime,
							potDeviceId: pot_item.potDeviceId
						}
						PotWorkDetailAttributeList.push(attributeInfo)
					}
				} else {
					const attributeDeviceInfoDrz: PotAttributeInfo[] = await DBClient.getInstance('')('pot_attribute_info')
						.where('dataType', 'pot_attribute_info')
						.andWhere('attributeName', '电容值')
						.select('*')
					const attributeDeviceInfoJsz: PotAttributeInfo[] = await DBClient.getInstance('')('pot_attribute_info')
						.where('dataType', 'pot_attribute_info')
						.andWhere('attributeName', '介损tgδ')
						.select('*')

					if (attributeDeviceInfoDrz.length > 0 && attributeDeviceInfoJsz.length > 0) {
						const _attributeDeviceInfoDrz: PotAttributeInfo = attributeDeviceInfoDrz[0]
						const attributeInfoDrz: attributeInfoDO = {
							dataType: 'pot_work_detail_attribute_info',
							workId: workId,
							potWorkItemId: pot_item.potWorkItemId,
							potWorkDetailId: pot_position.potWorkDetailId,
							potPositionId: pot_position.potPositionId,
							attributeId: _attributeDeviceInfoDrz.attributeId,
							attributeName: _attributeDeviceInfoDrz.attributeName,
							attributeDataUnit: _attributeDeviceInfoDrz.attributeDataUnit,
							dataValue: '',
							temperature: _pot_work_detail_data.temperature,
							humidity: _pot_work_detail_data.humidity,
							weather: _pot_work_detail_data.weather,
							weatherCn: _pot_work_detail_data.weatherCn,
							oilTemp: pot_item.oilTemp,
							potBeginTime: _pot_work_detail_data.potBeginTime,
							potDeviceId: pot_item.potDeviceId
						}
						const _attributeDeviceInfoJsz: PotAttributeInfo = attributeDeviceInfoJsz[0]
						const attributeInfoJsz: attributeInfoDO = {
							dataType: 'pot_work_detail_attribute_info',
							workId: workId,
							potWorkItemId: pot_item.potWorkItemId,
							potWorkDetailId: pot_position.potWorkDetailId,
							potPositionId: pot_position.potPositionId,
							attributeId: _attributeDeviceInfoJsz.attributeId,
							attributeName: _attributeDeviceInfoJsz.attributeName,
							attributeDataUnit: _attributeDeviceInfoJsz.attributeDataUnit,
							dataValue: '',
							temperature: _pot_work_detail_data.temperature,
							humidity: _pot_work_detail_data.humidity,
							weather: _pot_work_detail_data.weather,
							weatherCn: _pot_work_detail_data.weatherCn,
							oilTemp: pot_item.oilTemp,
							potBeginTime: _pot_work_detail_data.potBeginTime,
							potDeviceId: pot_item.potDeviceId
						}
						PotWorkDetailAttributeList.push(attributeInfoDrz)
						PotWorkDetailAttributeList.push(attributeInfoJsz)
					}
				}
			}
		}
	}
	await DBClient.getInstance('')('pot_work_detail_basic_info').where('dataType', 'pot_work_detail_basic_info').andWhere('userId', userId).andWhere('workId', workId).delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const potDetailWorkDO of PotWorkDetailList) {
			await trx('pot_work_detail_basic_info').insert(potDetailWorkDO)
		}
	})
	await DBClient.getInstance('')('pot_work_detail_device_info').where('dataType', 'pot_work_detail_device_info').andWhere('workId', workId).delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const deviceInfoDO of PotWorkDetailDeviceInfoList) {
			await trx('pot_work_detail_device_info').insert(deviceInfoDO)
		}
	})
	await DBClient.getInstance('')('pot_work_detail_item_info').where('dataType', 'pot_work_detail_item_info').andWhere('workId', workId).delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const itemInfoDO of PotWorkDetailItemList) {
			await trx('pot_work_detail_item_info').insert(itemInfoDO)
		}
	})
	await DBClient.getInstance('')('pot_work_detail_position_info').where('dataType', 'pot_work_detail_position_info').andWhere('workId', workId).delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const positionInfoDO of PotWorkDetailPositionList) {
			await trx('pot_work_detail_position_info').insert(positionInfoDO)
		}
	})
	await DBClient.getInstance('')('pot_work_detail_attribute_info').where('dataType', 'pot_work_detail_attribute_info').andWhere('workId', workId).delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const attributeInfoDO of PotWorkDetailAttributeList) {
			await trx('pot_work_detail_attribute_info').insert(attributeInfoDO)
		}
	})

	const _pot_work_detail_basic_info: potDetailWorkDO[] = await DBClient.getInstance('')('pot_work_detail_basic_info')
		.where('dataType', 'pot_work_detail_basic_info')
		.andWhere('userId', userId)
		.andWhere('workId', workId)
		.select('*')
	if (_pot_work_detail_basic_info.length > 0) {
		const deviceInfoList: potDetailWorkVO[] = []
		const deviceInfoArray: deviceInfoDO[] = await DBClient.getInstance('')('pot_work_detail_device_info')
			.where('dataType', 'pot_work_detail_device_info')
			.andWhere('userId', userId)
			.andWhere('workId', workId)
			.orderBy('deviceName', 'asc')
		if (deviceInfoArray.length > 0) {
			for (const _deviceInfo of deviceInfoArray) {
				const itemInfoDOArray: itemInfoDO[] = await DBClient.getInstance('')('pot_work_detail_item_info')
					.where('dataType', 'pot_work_detail_item_info')
					.andWhere('potWorkDeviceId', _deviceInfo.potWorkDeviceId)
				const potDetailWorkVO: potDetailWorkVO = {
					deviceInfoDO: _deviceInfo,
					itemInfoList: itemInfoDOArray
				}
				deviceInfoList.push(potDetailWorkVO)
			}
		}
		return {
			potDetailWorkDO: _pot_work_detail_basic_info[0],
			potDetailWorkVOList: deviceInfoList
		}
	} else {
		return {
			potDetailWorkDO: {
				dataType: 'pot_work_detail_basic_info',
				userId: param.userId,
				workId: param.workId,
				workName: '',
				substationName: '',
				potBeginTime: '',
				potEndTime: '',
				potNature: '',
				potNatureCn: '',
				status: '',
				workRemark: '',
				sysDeptId: '',
				sysDeptName: '',
				sysCenterId: '',
				sysCenterName: '',
				sysTeamId: '',
				sysTeamName: ''
			},
			potDetailWorkVOList: []
		}
	}
}

export async function getPotDevice(): Promise<PotDevice[]> {
	return await DBClient.getInstance('')('pot_device').where('dataType', 'pot_device').select('*')
}

export interface potPositionHisParam {
	potPositionId: string
	mtCode: string
	userId: string
}

export interface potPositionHisMoreParam {
	mtCode: string
	userId: string
	workId: string
	potWorkItemId: string
}
export async function getPotPositionHisList(param: potPositionHisParam): Promise<[]> {
	return await $http('/v1/mt/potposition/historylist', 'POST', param)
}

export async function getPotPositionHisMore(param: potPositionHisMoreParam): Promise<[]> {
	return await $http('/v1/mt/potposition/historymore', 'POST', param)
}

export interface potExecParam {
	potWorkItemId: string
	potDeviceId: string
}
interface pot_exec_data {
	positionInfoDO: positionInfoDO
	potDataDetailList: attributeInfoDO[]
}

export interface potExecResultVO {
	oilTemp: string
	potResult: string
	potDeviceId: string
	potDeviceName: string
	potDeviceRemark: string
	deviceType: string | undefined
	potDeviceCode: string | undefined
	data: pot_exec_data[]
}
export async function getPotExecList(param: potExecParam): Promise<potExecResultVO> {
	const itemInfoDoArray: itemInfoDO[] = await DBClient.getInstance('')('pot_work_detail_item_info')
		.where('dataType', 'pot_work_detail_item_info')
		.andWhere('potWorkItemId', param.potWorkItemId)
		.select('*')
	if (itemInfoDoArray.length > 0) {
		const _itemInfoDo = itemInfoDoArray[0]
		const potWorkDeviceId = _itemInfoDo.potWorkDeviceId
		const positionInfoList: positionInfoDO[] = await DBClient.getInstance('')('pot_work_detail_position_info')
			.where('dataType', 'pot_work_detail_position_info')
			.andWhere('potWorkItemId', param.potWorkItemId)
			.select('*')
		const data: pot_exec_data[] = []
		if (positionInfoList.length > 0) {
			for (const _position_info of positionInfoList) {
				const potPositionId = _position_info.potPositionId
				const attributeInfoList: attributeInfoDO[] = await DBClient.getInstance('')('pot_work_detail_attribute_info')
					.where('dataType', 'pot_work_detail_attribute_info')
					.andWhere('potPositionId', potPositionId)
					.andWhere('potWorkItemId', param.potWorkItemId)
					.andWhere('potWorkDetailId', _position_info.potWorkDetailId)
					.select('*')
					.orderBy('attributeId', 'asc')
				if (attributeInfoList.length <= 0) {
					const val: pot_exec_data = {
						positionInfoDO: _position_info,
						potDataDetailList: attributeInfoList
					}
					data.push(val)
				} else {
					const val: pot_exec_data = {
						positionInfoDO: _position_info,
						potDataDetailList: attributeInfoList
					}
					data.push(val)
				}
			}
		}

		const deviceInfoArray: deviceInfoDO[] = await DBClient.getInstance('')('pot_work_detail_device_info')
			.where('dataType', 'pot_work_detail_device_info')
			.andWhere('potWorkDeviceId', potWorkDeviceId)
			.select('*')

		let deviceInfoDo: deviceInfoDO | undefined
		if (deviceInfoArray.length > 0) {
			deviceInfoDo = deviceInfoArray[0]
		}
		const _deviceInfoArray: PotDevice[] = await DBClient.getInstance('')('pot_device').where('dataType', 'pot_device').andWhere('potDeviceId', _itemInfoDo.potDeviceId).select('*')
		let deviceCode: string | undefined
		if (_deviceInfoArray.length > 0) {
			deviceCode = _deviceInfoArray[0].potDeviceCode
		}

		return {
			oilTemp: _itemInfoDo.oilTemp,
			potResult: _itemInfoDo.potResult,
			potDeviceId: _itemInfoDo.potDeviceId,
			potDeviceName: _itemInfoDo.potDeviceName,
			potDeviceRemark: _itemInfoDo.potDeviceRemark,
			deviceType: deviceInfoDo?.deviceType,
			potDeviceCode: deviceCode,
			data: data
		}
	} else {
		// 当 itemInfoDoArray 为空时，返回默认值
		return {
			oilTemp: '',
			potResult: '',
			potDeviceId: '',
			potDeviceName: '',
			potDeviceRemark: '',
			deviceType: undefined,
			potDeviceCode: undefined,
			data: []
		}
	}
}

export async function getWeatherInfo(): Promise<WeatherDTO[]> {
	return await DBClient.getInstance('')('weather_info').where('dataType', 'weather_info').select('*').orderBy('dictCode', 'desc')
}

export async function getPotSyncCount(): Promise<number> {
	return await DBClient.getInstance('')('pot_work_detail_ing').where('dataType', 'pot_work_detail_ing').count('*')
}

export async function getTestUserList(): Promise<deptUser[]> {
	const dept_user_do_array: deptUser[] = await DBClient.getInstance('')('pot_dept_user_info').where('dataType', 'pot_dept_user_info').select('*')
	console.log('dept_user_do_array: ' + JSON.stringify(dept_user_do_array))
	dept_user_do_array.forEach((deptUser) => {
		deptUser.userNick = chineseToPinyin(deptUser.userNick, { removeTone: true })
	})
	dept_user_do_array.sort((a, b) => a.userNick.localeCompare(b.userNick))
	return dept_user_do_array
}

export interface potItemParam {
	submitTime: string
	mtCode: string
	userId: string
	workId: string
	potWorkItemId: string
	potResult: string
	oilTemp: string
	potDeviceId: string
	potWorkDetailList: potWorkDetailIng[]
}

interface potWorkDetailIng {
	potWorkItemId: string
	potPositionId: string
	potWorkDetailId: string
	potDataDetailList: potDataDetailAttr[]
}

interface potDataDetailAttr {
	attributeId: string
	dataValue: string

	potDeviceId: string
}

interface pot_item_base_db_val {
	dataType: string
	userId: string
	workId: string
	potWorkItemId: string
	submitTime: string
	potResult: string
	oilTemp: string
	potDeviceId: string
}

interface por_work_detail_ing_val {
	dataType: string
	potWorkItemId: string
	potPositionId: string
	potWorkDetailId: string
}
interface por_attribute_ing_val {
	dataType: string
	potWorkItemId: string
	potPositionId: string
	attributeId: string
	dataValue: string
}
export async function submitPotItem(param: potItemParam): Promise<void> {
	const userId = param.userId
	const workId = param.workId
	const potWorkItemId = param.potWorkItemId
	const potResult = param.potResult
	const oilTemp = param.oilTemp
	const potDeviceId = param.potDeviceId
	const potWorkDetailList = param.potWorkDetailList
	await $http('/v1/mt/potwork/submititem', 'POST', param)
	const result: PotDevice[] = await DBClient.getInstance('')('pot_device').where('dataType', 'pot_device').andWhere('potDeviceId', potDeviceId).select('*')
	if (result.length > 0) {
		const device = result[0]
		await DBClient.getInstance('')('pot_work_detail_item_info')
			.where('dataType', 'pot_work_detail_item_info')
			.andWhere('workId', workId)
			.andWhere('potWorkItemId', potWorkItemId)
			.update({ potResult, oilTemp, potDeviceId, potDeviceName: device.potDeviceName })
	}

	for (const potWorkDetail of potWorkDetailList) {
		const potDataDetailAttrArr: potDataDetailAttr[] = potWorkDetail.potDataDetailList
		for (const potData of potDataDetailAttrArr) {
			const attributeId = potData.attributeId
			const dataValue = potData.dataValue
			const potDeviceId = potData.potDeviceId
			await DBClient.getInstance('')('pot_work_detail_attribute_info')
				.where('dataType', 'pot_work_detail_attribute_info')
				.andWhere('potWorkItemId', potWorkItemId)
				.andWhere('potPositionId', potWorkDetail.potPositionId)
				.andWhere('attributeId', attributeId)
				.andWhere('potDeviceId', potDeviceId)
				.andWhere('potWorkDetailId', potWorkDetail.potWorkDetailId)
				.update({ dataValue, potDeviceId })
		}
	}

	const _db_val: pot_item_base_db_val = {
		dataType: 'pot_item_base_ing',
		userId: userId.toString(),
		workId: workId.toString(),
		potWorkItemId: potWorkItemId.toString(),
		submitTime: param.submitTime,
		potResult: potResult,
		oilTemp: oilTemp,
		potDeviceId: potDeviceId
	}
	await DBClient.getInstance('')('pot_item_base_ing').where('dataType', 'pot_item_base_ing').andWhere('userId', userId).andWhere('potWorkItemId', potWorkItemId).delete()

	await DBClient.getInstance('')('pot_item_base_ing').insert(_db_val)

	const _db_pot_detail_list: por_work_detail_ing_val[] = []
	const _db_pot_attribute_list: por_attribute_ing_val[] = []

	for (let i = 0; i < potWorkDetailList.length; i++) {
		const _pot_work_detail = potWorkDetailList[i]
		const potPositionId = _pot_work_detail.potPositionId
		const potWorkDetailId = _pot_work_detail.potWorkDetailId

		const por_work_detail_ing_val: por_work_detail_ing_val = {
			dataType: 'pot_work_detail_ing',
			potWorkItemId: potWorkItemId.toString(),
			potPositionId: potPositionId.toString(),
			potWorkDetailId: potWorkDetailId.toString()
		}
		_db_pot_detail_list.push(por_work_detail_ing_val)
		const potDataDetailList = _pot_work_detail.potDataDetailList
		for (let j = 0; j < potDataDetailList.length; j++) {
			const potData = potDataDetailList[j]
			const attributeId = potData.attributeId
			const dataValue = potData.dataValue

			const por_attribute_ing_val = {
				dataType: 'pot_attribute_ing',
				potWorkItemId: potWorkItemId.toString(),
				potPositionId: potPositionId,
				attributeId: attributeId,
				dataValue: dataValue
			}
			_db_pot_attribute_list.push(por_attribute_ing_val)
		}
	}
	await DBClient.getInstance('')('pot_work_detail_ing').where('dataType', 'pot_work_detail_ing').andWhere('potWorkItemId', potWorkItemId).delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const por_work_detail_ing_val of _db_pot_detail_list) {
			await trx('pot_work_detail_ing').insert(por_work_detail_ing_val)
		}
	})

	await DBClient.getInstance('')('pot_attribute_ing').where('dataType', 'pot_attribute_ing').andWhere('potWorkItemId', potWorkItemId).delete()
	await DBClient.getInstance('').transaction(async (trx) => {
		for (const por_work_detail_ing_val of _db_pot_attribute_list) {
			await trx('pot_attribute_ing').insert(por_work_detail_ing_val)
		}
	})
}

export interface submitItemScheduledReq {
	userId: string
	deviceCode: string
}
export async function submitItemScheduled(param: submitItemScheduledReq): Promise<number> {
	const _db_item_base_ing: pot_item_base_db_val[] = await DBClient.getInstance('')('pot_item_base_ing').where('dataType', 'pot_item_base_ing').select('*')
	const userId = param.userId
	const deviceCode = param.deviceCode
	for (const _item_base_ing of _db_item_base_ing) {
		const _pot_item_ing_db: por_work_detail_ing_val[] = await DBClient.getInstance('')('pot_work_detail_ing')
			.where('dataType', 'pot_work_detail_ing')
			.andWhere('potWorkItemId', _item_base_ing.potWorkItemId)
			.select('*')

		const potWorkDetailList: potWorkDetailIng[] = []
		for (const _db_val of _pot_item_ing_db) {
			const potPositionId = _db_val.potPositionId
			const _pot_attribute_ing_db: por_attribute_ing_val[] = await DBClient.getInstance('')('pot_attribute_ing')
				.where('dataType', 'pot_attribute_ing')
				.andWhere('potPositionId', potPositionId)
				.select('*')
			const potDataDetailList: potDataDetailAttr[] = []
			for (const _val_attribute of _pot_attribute_ing_db) {
				const por_attribute_ing_item: potDataDetailAttr = {
					attributeId: _val_attribute.attributeId,
					dataValue: _val_attribute.dataValue,
					potDeviceId: _item_base_ing.potDeviceId
				}
				potDataDetailList.push(por_attribute_ing_item)
			}
			const por_work_detail_ing_val: potWorkDetailIng = {
				potWorkItemId: _db_val.potWorkItemId.toString(),
				potPositionId: _db_val.potPositionId.toString(),
				potWorkDetailId: _db_val.potWorkDetailId.toString(),
				potDataDetailList: potDataDetailList
			}
			potWorkDetailList.push(por_work_detail_ing_val)
		}
		const req = {
			userId: _item_base_ing.userId.toString(),
			workId: _item_base_ing.workId.toString(),
			potWorkItemId: _item_base_ing.potWorkItemId.toString(),
			submitTime: _item_base_ing.submitTime,
			potResult: _item_base_ing.potResult,
			oilTemp: _item_base_ing.oilTemp,
			potDeviceId: _item_base_ing.potDeviceId,
			mtCode: deviceCode,
			potWorkDetailList: potWorkDetailList
		}
		const res = await $http('/v1/mt/potwork/submititem', 'POST', req)
		if (res.code === 200) {
			await DBClient.getInstance('')('pot_item_base_ing').where('dataType', 'pot_item_base_ing').andWhere('potWorkItemId', _item_base_ing.potWorkItemId).delete()
			await DBClient.getInstance('')('pot_work_detail_ing').where('dataType', 'pot_work_detail_ing').andWhere('potWorkItemId', _item_base_ing.potWorkItemId).delete()
			await DBClient.getInstance('')('pot_attribute_ing').where('dataType', 'pot_attribute_ing').andWhere('potWorkItemId', _item_base_ing.potWorkItemId).delete()
		}
	}

	return await DBClient.getInstance('')('pot_work_detail_ing').where('dataType', 'pot_work_detail_ing').andWhere('userId', userId).count()
}

export interface potSocket {
	potPositionId?: string
}
export async function sendDeviceConnect(param: potSocket): Promise<void> {
	const id = param.potPositionId
	console.log('==========================sendDeviceConnect+id:' + id)
	TCPClient.connect('10.10.26.33', 9891)
	TCPClient.send('10.10.26.33', 9891, 'query_link' + '\n')
}
export async function sendPotDeviceQuery(param: potSocket): Promise<void> {
	console.log('==========================sendPotDeviceQuery===================:' + JSON.stringify(param))
	// TCPClient.connect('10.10.26.33', 9891)
	TCPClient.send('10.10.26.33', 9891, 'query_dlm' + ':' + param.potPositionId + '\n')
}

export async function disConnectPot(param: potSocket): Promise<void> {
	const id = param.potPositionId
	console.log('id:' + id)
	TCPClient.disconnect('10.10.26.33', 9891)
}

let mainWindow: Electron.CrossProcessExports.BrowserWindow | undefined

export async function receivePotDeviceVal(headJson): Promise<void> {
	console.log('==========================receivePotDeviceVal===================:')
	const val: string = headJson.data
	console.log('val:' + val)
	const parts: string[] = val.split(',')
	const status: string = parts[0]
	console.log('status:' + status)
	const _status: string[] = status.split(':')
	const _status_: string = _status[1]
	mainWindow = getModelWindow(ModelWindowKey.mainWindow)
	if (_status_ === 'complete') {
		console.log('complete')
		const _cap: string = parts[4]
		const _cap_s: string[] = _cap.split(':')
		const _cap_: string = _cap_s[1]
		const cap: string = _cap_.substring(0, _cap_.length - 2)

		const _dl: string = parts[5]
		const _dl_s: string[] = _dl.split(':')
		const _dl_: string = _dl_s[1]
		const dl: string = _dl_.substring(0, _dl_.length - 1)

		const _potPositionId: string = parts[5]
		const _potPositionId_s: string[] = _potPositionId.split(':')
		const potPositionId: string = _potPositionId_s[1]

		const pot_val = {
			method: 'pot_val',
			cap: cap,
			dl: dl,
			type: _status_,
			potPositionId: potPositionId.replace(/[\r\n]/g, '')
		}
		console.log('pot_val:' + JSON.stringify(pot_val))
		mainWindow?.webContents.send('pot_val', pot_val)
	} else {
		const pot_val = {
			method: 'pot_val',
			cap: '',
			dl: '',
			type: _status_,
			potPositionId: ''
		}
		console.log('pot_val:' + JSON.stringify(pot_val))
		mainWindow?.webContents.send('pot_val', pot_val)
	}
}
