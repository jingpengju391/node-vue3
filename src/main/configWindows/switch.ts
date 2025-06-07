export const switchList = {
	scanCurrentwifi: true,
	scanAvailablewifi: false
}

export function updatedScanCurrentwifi(scanCurrentwifi: boolean) {
	switchList.scanCurrentwifi = scanCurrentwifi
}

export function updatedSwitchWithAvailablewifi(scanAvailablewifi: boolean) {
	switchList.scanAvailablewifi = scanAvailablewifi
}
