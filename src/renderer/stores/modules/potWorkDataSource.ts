import { PotWork } from '../../../shared/dataModelTypes/pot'
import { getPreviousNDays, isTimeBetween } from '@/utils'
import { DaysWidth } from '@shared/dataModelTypes/helpers'
import { getCurrentDateTime } from '@util/index'
export class potWorkDataSource {
	#PotWorkMap = new Map<string, PotWork>()
	#sortOrderMap = [1, 0, 2, 10]
	addNewEntriesToPotWorkMap(newEntries: PotWork[]) {
		newEntries.forEach((entry) => {
			this.#PotWorkMap.set(<string>entry.workId, entry)
		})
	}

	getWorkOrders(): PotWork[] {
		const beginTime = getCurrentDateTime()
		const endTime = getPreviousNDays(beginTime, DaysWidth)
		const PotWorks: PotWork[] = []
		this.#PotWorkMap.forEach((order) => {
			console.log(order.workId)
			if (isTimeBetween(order.potBeginTime, endTime, beginTime)) {
				PotWorks.push(order)
			}
		})
		return this.sortPotWorkOrders(PotWorks)
	}

	sortPotWorkOrders(workOrders: PotWork[]): PotWork[] {
		return workOrders.sort((a, b) => {
			const statusComparison = this.#sortOrderMap.indexOf(a.status) - this.#sortOrderMap.indexOf(b.status)

			if (statusComparison !== 0) {
				return statusComparison
			} else {
				return new Date(b.potBeginTime).getTime() - new Date(a.potBeginTime).getTime()
			}
		})
	}

	getPotWorkByWorkId(workId: string): PotWork | undefined {
		return this.#PotWorkMap.get(workId)
	}
}
export default new potWorkDataSource()
