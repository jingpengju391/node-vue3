import { parseStringPromise, Builder } from 'xml2js'
import type { BuilderOptions, convertableToString, ParserOptions } from 'xml2js'
import { singleton } from '@util'

class XmlParser {
	private static readonly parser_options: ParserOptions = {
		explicitArray: false, // Prevents wrapping of single elements in arrays
		trim: true // Removes extra spaces
	}

	private static readonly builder_options: BuilderOptions = {
		attrkey: '@', // Key used for attributes in the XML (default is '@')
		charkey: '#text', // Key used for character data in the XML (default is '#text')
		rootName: 'IDescription', // The root element name for the XML (default is 'root')
		renderOpts: {
			pretty: true, // Whether to prettify the XML (default is true)
			indent: '  ', // The indentation string (default is two spaces)
			newline: '\n' // The newline character used between elements (default is '\n')
		},
		xmldec: {
			version: '1.0.0', // The version of the XML declaration (default is '1.0')
			encoding: 'UTF-8', // The encoding used in the XML declaration (default is 'UTF-8')
			standalone: false // Whether the XML is standalone (default is false)
		},
		doctype: undefined, // Document type declaration (optional, default is undefined)
		headless: true, // Whether to omit the XML declaration header (default is false)
		allowSurrogateChars: false, // Whether to allow surrogate characters (default is false)
		cdata: false // Whether to wrap text in CDATA sections (default is false)
	}

	/**
	 * Converts an XML string to a JavaScript object.
	 * @param xml The XML string to parse.
	 * @returns The resulting JavaScript object.
	 */
	public static async parseXmlToObject(xml: convertableToString, options?: ParserOptions): Promise<any> {
		try {
			options = Object.assign({}, this.parser_options, options)
			// Use xml2js to parse the XML string to a JavaScript object.
			return await parseStringPromise(xml, options)
		} catch (err) {
			logger.error('Error parsing XML to object:', err)
			throw new Error('Invalid XML format')
		}
	}

	/**
	 * Converts a JavaScript object to an XML string.
	 * @param obj The JavaScript object to convert to XML.
	 * @param options Options for the XML builder (e.g., formatting, root element).
	 * @returns The resulting XML string.
	 */
	public static objectToXml(obj: any, options?: BuilderOptions): string {
		try {
			options = Object.assign({}, this.builder_options, options)
			// Use xml2js Builder to convert object to XML string.
			const builder = new Builder(options)
			return builder.buildObject(obj)
		} catch (err) {
			logger.error('Error converting object to XML:', err)
			throw new Error('Failed to convert object to XML')
		}
	}

	/**
	 * Prettify the XML string by adding indentation.
	 * @param xml The XML string to prettify.
	 * @returns The prettified XML string.
	 */
	public static prettifyXml(xml: string, options?: BuilderOptions): string {
		options = Object.assign({}, this.builder_options, options)
		// Convert XML string into a JavaScript object
		const jsonObject = this.parseXmlToObject(xml)
		// Convert the JavaScript object back into an indented XML string
		return this.objectToXml(jsonObject, options)
	}

	/**
	 * Converts a string in the format "key1:value1,key2:value2,...,keyN:valueN" to a JavaScript object.
	 * @param str The input string to parse.
	 * @returns The resulting JavaScript object.
	 */
	public static parseStringToObject(str: string): { [key: string]: string } {
		const result: { [key: string]: string } = {}
		// Split the string by commas to get key-value pairs
		const pairs = str.split(',')
		pairs.forEach((pair) => {
			// Split each pair by the first colon to separate key and value
			const [key, ...args] = pair.split(':')
			if (key) {
				result[key] = args.length ? args.join(':') : key // Add the key-value pair to the result object
			}
		})

		return result
	}
}

const xmlParser = singleton(XmlParser)
export default xmlParser
