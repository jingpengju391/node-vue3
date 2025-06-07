import { $http } from '@service/httpClient/http'
const { MAIN_VITE_TEMP_FILE_CONFIG } = import.meta.env

export const readInfraredFileCofing = () => $http(MAIN_VITE_TEMP_FILE_CONFIG, 'GET', undefined, undefined, undefined, true)

export const fetchDirectoryContents = (url: string) => $http(url, 'GET', undefined, undefined, undefined, true)

export const queryDirectoryFiles = (url: string) => $http(url, 'GET', undefined, undefined, undefined, true)
