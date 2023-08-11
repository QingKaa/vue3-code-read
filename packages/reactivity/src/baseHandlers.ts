import {
  reactive,
  readonly,
  toRaw,
  ReactiveFlags,
  Target,
  readonlyMap,
  reactiveMap,
  shallowReactiveMap,
  shallowReadonlyMap,
  isReadonly,
  isShallow
} from './reactive'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import {
  track,
  trigger,
  ITERATE_KEY,
  pauseTracking,
  resetTracking
} from './effect'
import {
  isObject,
  hasOwn,
  isSymbol,
  hasChanged,
  isArray,
  isIntegerKey,
  extend,
  makeMap
} from '@vue/shared'
import { isRef } from './ref'
import { warn } from './warning'

/**
 * 不跟踪响应变化的属性 __proto__,__v_isRef,__isVue
 */
const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)

/**
 * Symbol中除了 arguments 与 caller 之外的 内置通用的属性（symbols 类型）
 * Symbol(Symbol.asyncIterator)，Symbol(Symbol.hasInstance)，
 * Symbol(Symbol.isConcatSpreadable)，Symbol(Symbol.iterator)，Symbol(Symbol.match)，Symbol(Symbol.matchAll)，
 * Symbol(Symbol.replace)，Symbol(Symbol.search)，Symbol(Symbol.species)，Symbol(Symbol.split)，Symbol(Symbol.toPrimitive)，
 * Symbol(Symbol.toStringTag)，Symbol(Symbol.unscopables)
 */
const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

// 四种响应式类型的 getter 定义
const get = /*#__PURE__*/ createGetter()
const shallowGet = /*#__PURE__*/ createGetter(false, true)
const readonlyGet = /*#__PURE__*/ createGetter(true)
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)

// 数组方法的代理处理
const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations()

/**
 * 创建数组方法的代理处理
 * @returns
 */
function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  // instrument identity-sensitive Array methods to account for possible reactive
  // values
  ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      // 获取原始数组(this指向代理对象)
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        // 遍历数组，对每个元素进行依赖收集
        track(arr, TrackOpTypes.GET, i + '')
      }
      // we run the method using the original args first (which may be reactive)
      // 直接使用原始参数运行方法（可能是响应式的）
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        // 如果没有找到，将参数转换为原始值再次运行
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })

  // 导致数组长度改变的方法处理：触发时候避免对 .length 的跟踪（会导致无限循环）
  // instrument length-altering mutation methods to avoid length being tracked
  // which leads to infinite loops in some cases (#2137)
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      //   暂停依赖收集
      pauseTracking()
      //   调用原始方法获得执行结果
      const res = (toRaw(this) as any)[key].apply(this, args)
      //   恢复依赖收集
      resetTracking()
      //   返回结果
      return res
    }
  })
  return instrumentations
}

/**
 * 在读取 hasOwnProperty 属性值时候需要触发依赖收集
 * @param this
 * @param key
 * @returns
 */
function hasOwnProperty(this: object, key: string) {
  const obj = toRaw(this)
  track(obj, TrackOpTypes.HAS, key)
  return obj.hasOwnProperty(key)
}

/**
 * getter 属性读取操作代理：
 * 对象： object.key
 * 数组： array[index], array.length
 *  array[index],
 * @param isReadonly 是否只读
 * @param shallow 是否浅层代理
 * @returns getter
 */
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    // 对Vue中Reactive定义的相关Flag读取时的处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      //  读取的值是 ReactiveFlags.IS_REACTIVE=__v_isReactive
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      // 读取的值是 __v_isReadonly
      return isReadonly
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      // 读取的值是 __v_isShallow
      return shallow
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      return target
    }

    // 判断代理目标是否为数组
    const targetIsArray = isArray(target)

    if (!isReadonly) {
      // 非只读
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        // 目标是数组, 且key在定义在 arrayInstrumentations 中重新的数组方法，则返回重新定义的数组方法
        // 这里的 receiver 是代理对象
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    }

    // 通过Reflect读取值
    const res = Reflect.get(target, key, receiver)

    // 如果是 Symbol 类型中内置的symbol属性，或者是不跟踪响应变化的属性(__proto__,__v_isRef,__isVue)，直接返回值
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    if (!isReadonly) {
      // 收集依赖
      track(target, TrackOpTypes.GET, key)
    }

    // 浅层代理，直接返回
    if (shallow) {
      return res
    }

    if (isRef(res)) {
      // ref 类型的 返回解包后的内容
      // ref unwrapping - skip unwrap for Array + integer key.
      return targetIsArray && isIntegerKey(key) ? res : res.value
    }

    // 如果 target[key] 的值是对象类型，返回响应式对象
    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}

// 根据是否shallow 类型的响应生成对应的 setter
const set = /*#__PURE__*/ createSetter()
const shallowSet = /*#__PURE__*/ createSetter(true)

/**
 * setter 操作代理
 * 对象： object.key = value, object[key] = value, Reflect.set()
 * 数组： array[index] = value, array.length = value
 * @param shallow
 * @returns
 */
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    // 获取旧值
    let oldValue = (target as any)[key]
    // 旧值是只读 && 旧值是Ref类型，&& 新值不是Ref类型
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false
    }

    // 深层响应的处理
    if (!shallow) {
      // 新值不是浅层代理并且不是只读，将值转换成原始值
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        // 对于对象属性是 ref 类型时的处理：
        // 设置的 oldValue 是 ref 类型，并且value不是 ref 类型，将value赋给oldValue.value
        oldValue.value = value
        return true
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    // 判断是否存在 key 属性
    // target 是数组并且key是整数键 ? key 是否在target长度范围内 ：对象target 是否存在key属性
    // 对于数组，如果key在数组长度范围内，视为 SET 操作，如果key在数组长度外，则视为 ADD 操作（会隐式改变数组的length属性）
    // 对于对象，如果key在对象中存在，视为 SET 操作，如果key在对象中不存在，则视为 ADD 操作
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)

    // 获取 setter 返回值
    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    // 如果目标是原始对象的原型链中的某个对象，则不触发依赖执行（避免原型链上proxy属性的Reflect.set触发）
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        // 不存在值则触发 TriggerOpTypes.ADD 操作
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        // 对比新旧值有变化则触发 TriggerOpTypes.SET 操作
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    // 正常返回 setter 的值
    return result
  }
}

/**
 * 设置操作，执行副作用函数
 * 删除属性事件代理：判断值存在键并且删除成功的情况下
 * @param target
 * @param key
 * @returns
 */
function deleteProperty(target: object, key: string | symbol): boolean {
  // 判断target 中是否存在 key 属性
  const hadKey = hasOwn(target, key)
  // 获取旧值
  const oldValue = (target as any)[key]
  // 删除属性
  const result = Reflect.deleteProperty(target, key)
  // 删除成功并且target中存在key
  if (result && hadKey) {
    // 执行副作用函数
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}

/**
 * 读取操作，触发依赖收集
 * has 操作代理，in操作符的捕捉器：
 * key in target
 * @param target
 * @param key
 * @returns
 */
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}

/**
 * 读取操作，触发依赖收集
 * 可以拦截以下操作：
 * Object.keys()、
 * Object.getOwnPropertyNames()、
 * Object.getOwnPropertySymbols()、
 * Reflect.ownKeys()--间接拦截for...in 循环
 * @param target
 * @returns
 */
function ownKeys(target: object): (string | symbol)[] {
  // 使用ITERATE_KEY：遍历操作不以具体键进行绑定，需要一个唯一的key作为标识
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}

/**
 * get, set, deleteProperty, has, ownKeys
 */
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}

/**
 * 只读代理配置
 */
export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  }
}

export const shallowReactiveHandlers = /*#__PURE__*/ extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet
  }
)

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
export const shallowReadonlyHandlers = /*#__PURE__*/ extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
)
