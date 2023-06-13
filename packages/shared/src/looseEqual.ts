import { isArray, isDate, isObject, isSymbol } from './general'

/**
 * 循环对比两个数组的每一项是否相等
 * @param a 
 * @param b 
 * @returns 
 */
function looseCompareArrays(a: any[], b: any[]) {
	if (a.length !== b.length) return false
	let equal = true
	// 只有equal 为真时候才进行下一项元素的对比，否则跳过剩下的元素对比，直接返回 false
	for (let i = 0; equal && i < a.length; i++) {
		equal = looseEqual(a[i], b[i])
	}
	return equal
}

/**
 * 对比两个值是否相等
 * @param a 
 * @param b 
 * @returns 
 */
export function looseEqual(a: any, b: any): boolean {
	if (a === b) return true
	//  Date 类型对比
	let aValidType = isDate(a)
	let bValidType = isDate(b)
	if (aValidType || bValidType) {
		// 同时存在并且 getTime 相等
		return aValidType && bValidType ? a.getTime() === b.getTime() : false
	}
	// Symbol 类型对比
	aValidType = isSymbol(a)
	bValidType = isSymbol(b)
	if (aValidType || bValidType) {
		return a === b
	}
	// 数组类型对比
	aValidType = isArray(a)
	bValidType = isArray(b)
	if (aValidType || bValidType) {
		// 调用 looseCompareArrays 进行对比
		return aValidType && bValidType ? looseCompareArrays(a, b) : false
	}
	aValidType = isObject(a)
	bValidType = isObject(b)
	if (aValidType || bValidType) {
		/* istanbul ignore if: this if will probably never be called */
		if (!aValidType || !bValidType) {
			return false
		}
		const aKeysCount = Object.keys(a).length
		const bKeysCount = Object.keys(b).length
		// 对比对象中键的数量是否相同，不同则返回 false
		if (aKeysCount !== bKeysCount) {
			return false
		}
		// 循环对比对象中的每一项是否相等
		for (const key in a) {
			const aHasKey = a.hasOwnProperty(key)
			const bHasKey = b.hasOwnProperty(key)
			if (
				(aHasKey && !bHasKey) ||
				(!aHasKey && bHasKey) ||
				!looseEqual(a[key], b[key])
			) {
				return false
			}
		}
	}
	return String(a) === String(b)
}

/**
 * 查找元素所在的索引
 * @param arr 
 * @param val 
 * @returns 
 */
export function looseIndexOf(arr: any[], val: any): number {
	return arr.findIndex(item => looseEqual(item, val))
}
