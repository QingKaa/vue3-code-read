import { makeMap } from './makeMap'

// 全局可用的属性
const GLOBALS_ALLOWED =
    'Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' +
    'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' +
    'Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt,console'

/**
 * 判断是否全局可以属性
 */
export const isGloballyAllowed = /*#__PURE__*/ makeMap(GLOBALS_ALLOWED)
