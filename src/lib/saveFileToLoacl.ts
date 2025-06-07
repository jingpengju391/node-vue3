import { writeFileSync, unlinkSync } from 'fs'
import { generateFullPathUsingRelativePath } from './file'

export function savePhotoToLoaclTemp(photoData: string) {
	const filePath = generateFullPathUsingRelativePath('./temp/character_recognition.jpg')
	const data = photoData.replace(/^data:image\/png;base64,/, '')
	writeFileSync(filePath, data, 'base64')
}

export function deletePhotoToLoaclTemp() {
	try {
		const filePath = generateFullPathUsingRelativePath('./temp/character_recognition.jpg')
		unlinkSync(filePath)
	} catch (err) {
		logger.error('delete file character recognition:', err)
	}
}
