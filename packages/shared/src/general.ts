import { makeMap } from './makeMap'

export const EMPTY_OBJ: { readonly [key: string]: any } = __DEV__
    ? Object.freeze({})
    : {}
export const EMPTY_ARR = __DEV__ ? Object.freeze([]) : []

// 返回空对象
export const NOOP = () => { }

/**
 * Always return false.
 */
export const NO = () => false

const onRE = /^on[^a-z]/
/**
 * 判断是否 on 绑定 ： onChange ...
 * @param key 
 * @returns 
 */
export const isOn = (key: string) => onRE.test(key)

/**
 * 判断是否model更新绑定事件，判断依据：以onUpdate: 开头
 * @param key 
 * @returns 
 */
export const isModelListener = (key: string) => key.startsWith('onUpdate:')

/**
 * Object.assign 浅扩展对象属性
 */
export const extend = Object.assign

/**
 * 移除数组中某一项，数组中不存在则无效果
 * @param arr 
 * @param el 
 */
export const remove = <T>(arr: T[], el: T) => {
    const i = arr.indexOf(el)
    if (i > -1) {
        arr.splice(i, 1)
    }
}

/**
 * Object.prototype.hasOwnProperty
 */
const hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * 判断对象 val 中是否存在 key 的属性
 * 判断依据 hasOwnProperty
 * @param val 
 * @param key 
 * @returns 
 */
export const hasOwn = (
    val: object,
    key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

/**
 * Array.isArray 判断是否数组
 */
export const isArray = Array.isArray
/**
 * 判断是否 Map 类型 
 * 判断依据：Object.prototype.toString === '[object Map]'
 * @param val 
 * @returns 
 */
export const isMap = (val: unknown): val is Map<any, any> =>
    toTypeString(val) === '[object Map]'

/**
 * 判断是否 Set 类型
 * 判断依据： Object.prototype.toString === '[object Set]'
 * @param val 
 * @returns 
 */
export const isSet = (val: unknown): val is Set<any> =>
    toTypeString(val) === '[object Set]'

/**
 * 判断是否 Date 类型
 * 判断依据： Object.prototype.toString === '[object Date]'
 * @param val 
 * @returns 
 */
export const isDate = (val: unknown): val is Date =>
    toTypeString(val) === '[object Date]'

/**
 * 判断是否 RegExp 正则
 * 判断依据： Object.prototype.toString === '[object RegExp]'
 * @param val 
 * @returns 
 */
export const isRegExp = (val: unknown): val is RegExp =>
    toTypeString(val) === '[object RegExp]'

/**
 * 判断是否函数 
 * 判断依据：typeof val === 'function'
 * @param val 
 * @returns 
 */
export const isFunction = (val: unknown): val is Function =>
    typeof val === 'function'

export const isString = (val: unknown): val is string => typeof val === 'string'
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'

/**
 *  val !== null && typeof val === 'object'
 * @param val 
 * @returns 
 */
export const isObject = (val: unknown): val is Record<any, any> =>
    val !== null && typeof val === 'object'

/**
 * 判断是否 Promise 类型
 * 判断依据： isObject(val) && isFunction(val.then) && isFunction(val.catch)
 * @param val 
 * @returns 
 */
export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}
/**
 * Object.prototype.toString
 */
export const objectToString = Object.prototype.toString
/**
 * 获取数据类型字符串
 * @param value unknown
 * @returns [object Type]
 */
export const toTypeString = (value: unknown): string =>
    objectToString.call(value)

/**
 * 获取数据类型
 * @param value 
 * @returns "RawType" from strings like "[object RawType]"
 */
export const toRawType = (value: unknown): string => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1)
}

export const isPlainObject = (val: unknown): val is object =>
    toTypeString(val) === '[object Object]'

/**
 * 判断是否整数键
 * @param key 
 * @returns 
 */
export const isIntegerKey = (key: unknown) =>
    isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key

/**
 * 判断是否内置的保留属性
 */
export const isReservedProp = /*#__PURE__*/ makeMap(
    // the leading comma is intentional so empty string "" is also included
    ',key,ref,ref_for,ref_key,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'
)

/**
 * 判断是否内置的指令
 */
export const isBuiltInDirective = /*#__PURE__*/ makeMap(
    'bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo'
)

/**
 * 缓存函数执行结果
 * @param fn 
 * @returns 
 */
const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
    const cache: Record<string, string> = Object.create(null)
    return ((str: string) => {
        const hit = cache[str]
        return hit || (cache[str] = fn(str))
    }) as T
}

// 匹配所有以 - 开头的单词，并缓存结果
const camelizeRE = /-(\w)/g
/**
 * 破折线单词转驼峰单词
 * @private
 */
export const camelize = cacheStringFunction((str: string): string => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

// 匹配在单词内部（即不在单词的开头或结尾）并且由一个大写字母组成的字符   \B 表示非单词边界
const hyphenateRE = /\B([A-Z])/g
/**
 * 驼峰单词转破折线单词 并缓存结果
 * @private
 */
export const hyphenate = cacheStringFunction((str: string) =>
    str.replace(hyphenateRE, '-$1').toLowerCase()
)

/**
 * 首字母大写，并缓存执行结果
 * @private
 */
export const capitalize = cacheStringFunction(
    (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
)

/**
 * 添加 on 前缀，并缓存执行结果 change => onChange
 * @private
 */
export const toHandlerKey = cacheStringFunction((str: string) =>
    str ? `on${capitalize(str)}` : ``
)

// compare whether a value has changed, accounting for NaN.
/**
 * 通过 Object.is 判断两个值是否相同
 * @param value 
 * @param oldValue 
 * @returns 
 */
export const hasChanged = (value: any, oldValue: any): boolean =>
    !Object.is(value, oldValue)

/**
 * 将arg作为参数依次调用fns中的函数
 * @param fns 
 * @param arg 
 */
export const invokeArrayFns = (fns: Function[], arg?: any) => {
    for (let i = 0; i < fns.length; i++) {
        fns[i](arg)
    }
}

/**
 * 在对象中添加不可枚举的属性
 * @param obj 
 * @param key 
 * @param value 
 */
export const def = (obj: object, key: string | symbol, value: any) => {
    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: false,
        value
    })
}

/**
 * "123-foo" will be parsed to 123
 * This is used for the .number modifier in v-model
 */
export const looseToNumber = (val: any): any => {
    const n = parseFloat(val)
    return isNaN(n) ? val : n
}

/**
 * Only conerces number-like strings
 * "123-foo" will be returned as-is
 */
export const toNumber = (val: any): any => {
    const n = isString(val) ? Number(val) : NaN
    return isNaN(n) ? val : n
}

// 全局对象
let _globalThis: any
export const getGlobalThis = (): any => {
    return (
        _globalThis ||
        (_globalThis =
            typeof globalThis !== 'undefined'
                ? globalThis
                : typeof self !== 'undefined'
                    ? self
                    : typeof window !== 'undefined'
                        ? window
                        : typeof global !== 'undefined'
                            ? global
                            : {})
    )
}

const identRE = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/

export function genPropsAccessExp(name: string) {
    return identRE.test(name)
        ? `__props.${name}`
        : `__props[${JSON.stringify(name)}]`
}
