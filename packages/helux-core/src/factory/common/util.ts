import { getVal, isDebug, isFn, isObj, isProxyAvailable, prefixValKey } from '@helux/utils';
import { immut, IOperateParams } from 'limu';
import { KEY_SPLITER, STATE_TYPE } from '../../consts';
import { createOb } from '../../helpers/obj';
import type { Dict, ISetStateOptions, NumStrSymbol, TriggerReason } from '../../types/base';
import { DepKeyInfo } from '../../types/inner';
import type { TInternal } from '../creator/buildInternal';

const { USER_STATE } = STATE_TYPE;

export interface IMutateCtx {
  /**
   * 为 shared 记录一个第一层的 key 值，用于刷新 immut 生成的 代理对象，
   * 刷新时机和具体解释见 factory/creator/commitState 逻辑
   */
  level1Key: string;
  depKeys: string[];
  triggerReasons: TriggerReason[];
  ids: NumStrSymbol[];
  globalIds: NumStrSymbol[];
  writeKeys: Dict;
  arrKeyDict: Dict;
  writeKeyPathInfo: Dict<TriggerReason>;
  /**
   * default: true
   * 是否处理 atom setState((draft)=>xxx) 返回结果xxx，
   * 目前规则是修改了 draft 则 handleAtomCbReturn 被会置为 false，
   * 避免无括号写法 draft=>draft.xx = 1 隐式返回的结果 1 被写入到草稿，
   * 备注：安全写法应该是draft=>{draft.xx = 1}
   */
  handleAtomCbReturn: boolean;
  /**
   * TODO ：记录变化值的路径，用于异步执行环境合并到 rawState 时，仅合并变化的那一部分节点，避免数据脏写
   * 但异步执行环境直接修改 draft 本身就是很危险的行为，该特性需要慎重考虑是否要实现
   */
  keyPathValue: Map<string[], any>;
  /** 为 atom 记录的 draft.val 引用 */
  draftVal: any;
}

// for hot reload of buildShared
export function tryGetLoc(moduleName: string, startCutIdx = 4) {
  let loc = '';
  if (isDebug() && moduleName) {
    try {
      throw new Error('loc');
    } catch (err: any) {
      const arr = err.stack.split('\n');
      const pureArr = arr.map((codeLoc: string) => {
        return codeLoc.substring(0, codeLoc.indexOf('(')).trim();
      });
      loc = pureArr.slice(startCutIdx, 8).join(' -> ');
    }
  }
  return loc;
}

export function newMutateCtx(options: ISetStateOptions): IMutateCtx {
  const { ids = [], globalIds = [] } = options; // 用户 setState 可能设定了 ids globalIds
  return {
    level1Key: '',
    depKeys: [],
    triggerReasons: [],
    ids,
    globalIds,
    writeKeys: {},
    arrKeyDict: {}, // 记录读取过程中遇到的数组key
    writeKeyPathInfo: {},
    keyPathValue: new Map(),
    handleAtomCbReturn: true,
    draftVal: null,
  };
}

export function newOpParams(key: string, value: any, isChange = true): IOperateParams {
  return { isChange, op: 'set', key, value, parentType: 'Object', keyPath: [], fullKeyPath: [key], isBuiltInFnKey: false };
}

export function getDepKeyInfo(depKey: string): DepKeyInfo {
  const [sharedKey, rest] = depKey.split('/');
  const keyPath = rest.split(KEY_SPLITER);
  return { sharedKey: Number(sharedKey), keyPath, depKey };
}

export function getDepKeyByPath(fullKeyPath: string[], sharedKey: number) {
  return prefixValKey(fullKeyPath.join(KEY_SPLITER), sharedKey);
}

export function isValChanged(internal: TInternal, depKey: string) {
  const { snap, prevSnap, stateType, rootValKey } = internal;
  // 非用户状态，都返回 true（伴生状态有自己的key规则）
  if (USER_STATE !== stateType) {
    return true;
  }

  if (depKey === rootValKey) {
  }

  const { keyPath } = getDepKeyInfo(depKey);
  try {
    const currVal = getVal(snap, keyPath);
    const prevVal = getVal(prevSnap, keyPath);
    return currVal !== prevVal;
  } catch (err: any) {
    // 结构变异，出现了 read property of undefined 错误，返回值已变更，
    // 让函数执行报错且此错误由用户自己承担
    return true;
  }
}

export function createImmut(obj: Dict, onOperate: (op: IOperateParams) => void) {
  if (isProxyAvailable()) {
    return immut(obj, { onOperate });
  }

  return createOb(obj, {
    get(target, key) {
      const val = target[key];
      const op = newOpParams(key, val, false);
      onOperate(op);
      return val;
    },
  });
}

/**
 * 区分是 atom 还是 shared 返回的部分状态，atom 返回要自动装箱为 { val: T }
 */
export function wrapPartial(forAtom: boolean, val: any) {
  if (val === undefined) return; // undefined 丢弃，如真需要赋值 undefined，对 draft 操作即可
  if (forAtom) return { val };
  if (isObj(val)) return val;
}

/**
 * 处理 setState(()=>({...})) 和 setState({...}) 两种情况返回的部分状态
 */
export function runPartialCb(forAtom: boolean, mayCb: any, draft: any) {
  const val = !isFn(mayCb) ? mayCb : mayCb(draft);
  return wrapPartial(forAtom, val);
}
