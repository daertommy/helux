import { delListItem, isDebug, isFn, isObj, nodupPush, safeMapGet } from '@helux/utils';
import { EXPIRE_MS, FN_KEY, NOT_MOUNT, SIZE_LIMIT, UNMOUNT } from '../../consts';
import { injectHeluxProto } from '../../helpers/obj';
import type { Dict, IFnCtx, ScopeType } from '../../types/base';
import { genFnKey } from '../common/key';
import { getFnScope } from './speedup';

export function getCtxMap(scopeKeyOrFnKey: string) {
  const { FNKEY_STATIC_CTX_MAP, FNKEY_HOOK_CTX_MAP } = getFnScope();
  const map = scopeKeyOrFnKey[0] === 's' ? FNKEY_STATIC_CTX_MAP : FNKEY_HOOK_CTX_MAP;
  return map;
}

export function putComputingFnKey(depKey: string, fnKey: string) {
  const { DEPKEY_COMPUTING_FNKEYS_MAP } = getFnScope();
  const fnKeys = safeMapGet(DEPKEY_COMPUTING_FNKEYS_MAP, depKey, [] as string[]);
  fnKeys.push(fnKey);
}

export function delComputingFnKey(depKey: string, fnKey: string) {
  const { DEPKEY_COMPUTING_FNKEYS_MAP } = getFnScope();
  const fnKeys = DEPKEY_COMPUTING_FNKEYS_MAP.get(depKey);
  if (fnKeys) {
    delListItem(fnKeys, fnKey);
  }
}

/**
 * 删除已记录的相关依赖数据
 */
export function delFnDepData(fnCtx: IFnCtx) {
  const { DEPKEY_FNKEYS_MAP } = getFnScope();
  const { depKeys, fnKey } = fnCtx;
  depKeys.forEach((key) => {
    const fnKeys = DEPKEY_FNKEYS_MAP.get(key) || [];
    delListItem(fnKeys, fnKey);
  });
}

/**
 * 对当前 fnKey 在上游的记录做操作（删除、新增）
 */
export function opUpstreamFnKey(fnCtx: IFnCtx, isAdd?: boolean) {
  const { FNKEY_STATIC_CTX_MAP } = getFnScope();
  const { fnKey, prevLevelFnKeys } = fnCtx;
  prevLevelFnKeys.forEach((upFnKey) => {
    const next = FNKEY_STATIC_CTX_MAP.get(upFnKey)?.nextLevelFnKeys;
    if (next) {
      isAdd ? nodupPush(next, fnKey) : delListItem(next, fnKey);
    }
  });
}

export function delHistoryUnmoutFnCtx() {
  const { FNKEY_HOOK_CTX_MAP } = getFnScope();
  // works for strict mode
  if (FNKEY_HOOK_CTX_MAP.size >= SIZE_LIMIT) {
    const now = Date.now();
    FNKEY_HOOK_CTX_MAP.forEach((fnCtx) => {
      const { mountStatus, createTime, fnKey } = fnCtx;
      if ([NOT_MOUNT, UNMOUNT].includes(mountStatus) && now - createTime > EXPIRE_MS) {
        delFnDepData(fnCtx);
        opUpstreamFnKey(fnCtx);
        // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
        // deleting item in map.forEach is doable
        FNKEY_HOOK_CTX_MAP.delete(fnKey);
      }
    });
  }
}

/**
 * for hot reload
 * see window.__HELUX__.help.fnDep.FNKEY_HOOK_CTX_MAP
 */
export function markFnExpired() {
  const { FNKEY_HOOK_CTX_MAP } = getFnScope();
  if (isDebug()) {
    // for hot reload working well
    FNKEY_HOOK_CTX_MAP.forEach((item) => {
      item.isExpired = true;
    });
  }
}

export function markFnKey(fnOrObj: Dict, scopeType: ScopeType, fnKey?: string) {
  const fnKeyStr = fnKey || genFnKey(scopeType);
  if (isFn(fnOrObj)) {
    // @ts-ignore
    fnOrObj[FN_KEY] = fnKeyStr;
  } else {
    injectHeluxProto(fnOrObj);
    fnOrObj.__proto__[FN_KEY] = fnKeyStr;
  }
  return fnKeyStr;
}

export function getFnKey<T = Dict>(fnOrObj: T): string {
  if (isFn(fnOrObj)) {
    // @ts-ignore
    return fnOrObj[FN_KEY] || '';
  }
  if (isObj(fnOrObj)) {
    // @ts-ignore
    return fnOrObj.__proto__[FN_KEY] || '';
  }
  return '';
}

export function getFnCtx(fnKey: string) {
  const map = getCtxMap(fnKey);
  return map.get(fnKey);
}

export function getFnCtxByObj<T = Dict>(obj: T) {
  const fnKey = getFnKey(obj);
  return getFnCtx(fnKey) || null;
}

export function getRunninFn() {
  const { runningFnKey, depKeys, isTaskRunning, runningSharedKey, isIgnore } = getFnScope();
  const fnCtx = !runningFnKey ? null : getFnCtx(runningFnKey);
  return { fnCtx, depKeys, isTaskRunning, isIgnore, runningSharedKey };
}
