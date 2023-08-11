// using literal strings instead of numbers so that it's easier to inspect
// debugger events

/**
 * GET = 'get',   
 * HAS = 'has',   
 * ITERATE = 'iterate'  
 */
export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

/**
 * SET = 'set',  
 * ADD = 'add',  
 * DELETE = 'delete',  
 * CLEAR = 'clear'  
 */
export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}
