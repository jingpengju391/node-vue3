// remove some unused languages and optimize the size of the electron package
exports.default = async function (context) {
	const fs = require('fs')
	const localeDir = context.appOutDir + '/locales/'
	fs.readdir(localeDir, function (err, files) {
		//files is array of filenames (basename form)
		if (!(files && files.length)) return
		for (let i = 0, len = files.length; i < len; i++) {
			if (!(files[i].startsWith('en') || files[i].startsWith('zh'))) {
				fs.unlinkSync(localeDir + files[i])
			}
		}
	})
}
