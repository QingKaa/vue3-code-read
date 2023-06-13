import { isArray, isString, isObject, hyphenate } from './general'

export type NormalizedStyle = Record<string, string | number>

/**
 * 规范化 style
 * @param value 
 * @returns 
 */
export function normalizeStyle(
	value: unknown
): NormalizedStyle | string | undefined {
	if (isArray(value)) {
		// 数组类型的 Style 处理
		const res: NormalizedStyle = {}
		// 遍历数组中的每一项进行处理
		for (let i = 0; i < value.length; i++) {
			const item = value[i]
			// 根据 item 的类型判断使用哪种方式进行处理
			// parseStringStyle css 字符串类型处理
			// 其他类型则调用半函数 normalizeStyle 处理
			const normalized = isString(item)
				? parseStringStyle(item)
				: (normalizeStyle(item) as NormalizedStyle)
			if (normalized) {
				for (const key in normalized) {
					res[key] = normalized[key]
				}
			}
		}
		return res
	} else if (isString(value)) {
		// 字符串类型返回
		return value
	} else if (isObject(value)) {
		// 对象类型之间返回
		return value
	}
}

// 分隔符正则表达式
const listDelimiterRE = /;(?![^(]*\))/g
// 属性分隔符正则表达式
const propertyDelimiterRE = /:([^]+)/
// 注释正则表达式
const styleCommentRE = /\/\*[^]*?\*\//g

/**
 * css 字符串处理成对象形式
 * @param cssText 
 * @returns 
 */
export function parseStringStyle(cssText: string): NormalizedStyle {
	const ret: NormalizedStyle = {}
	cssText
		.replace(styleCommentRE, '')
		.split(listDelimiterRE)
		.forEach(item => {
			if (item) {
				const tmp = item.split(propertyDelimiterRE)
				tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim())
			}
		})
	return ret
}

/**
 * css 对象形式转换成字符串形式
 */
export function stringifyStyle(
	styles: NormalizedStyle | string | undefined
): string {
	let ret = ''
	if (!styles || isString(styles)) {
		return ret
	}
	for (const key in styles) {
		const value = styles[key]
		const normalizedKey = key.startsWith(`--`) ? key : hyphenate(key)
		if (isString(value) || typeof value === 'number') {
			// only render valid values
			ret += `${normalizedKey}:${value};`
		}
	}
	return ret
}


/**
 * 规范化 class
 * 将数组、对象形式的class转换成字符串形式
 * @export
 * @param {unknown} value
 * @return {*}  {string}
 */
export function normalizeClass(value: unknown): string {
	let res = ''
	if (isString(value)) {
		// 字符串类型之间返回
		res = value
	} else if (isArray(value)) {
		// 数组类型遍历递归调用 normalizeClass 处理
		for (let i = 0; i < value.length; i++) {
			const normalized = normalizeClass(value[i])
			if (normalized) {
				res += normalized + ' '
			}
		}
	} else if (isObject(value)) {
		// 对象类型遍历拼接
		for (const name in value) {
			if (value[name]) {
				res += name + ' '
			}
		}
	}
	// 去除前后空格
	return res.trim()
}


/**
 * 规范化 props 处理 class 、 style 将其规范化后覆盖原props的class、style
 *
 * @export
 * @param {(Record<string, any> | null)} props
 * @return {*} 
 */
export function normalizeProps(props: Record<string, any> | null) {
	if (!props) return null
	let { class: klass, style } = props
	if (klass && !isString(klass)) {
		props.class = normalizeClass(klass)
	}
	if (style) {
		props.style = normalizeStyle(style)
	}
	return props
}
