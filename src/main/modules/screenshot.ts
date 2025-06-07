import { desktopCapturer, screen } from 'electron'
import { getModelWindow } from '../configWindows'
import { ModelWindowKey } from '@shared/dataModelTypes/windows'

export async function getDesktopCapturer(): Promise<string> {
	const primaryDisplay = screen.getPrimaryDisplay()
	const { scaleFactor } = primaryDisplay
	const { width, height } = primaryDisplay.bounds
	try {
		const res = await desktopCapturer.getSources({
			types: ['screen'],
			thumbnailSize: {
				width: width * scaleFactor,
				height: height * scaleFactor
			}
		})
		return res[0].thumbnail.toDataURL({ scaleFactor })
	} catch (error) {
		logger.error(`capture ${error}`)
		return ''
	}
}

export async function showScreenshotWindow() {
	// await createWindow(shotWindow())
	const shotWindow = getModelWindow(ModelWindowKey.shotWindow)
	shotWindow?.show()
}

export async function closeScreenshotWindow() {
	const shotWindow = getModelWindow(ModelWindowKey.shotWindow)
	const mainWindow = getModelWindow(ModelWindowKey.mainWindow)
	mainWindow?.focus()
	shotWindow?.hide()
	mainWindow?.setFullScreen(false)
	mainWindow?.restore()
}
