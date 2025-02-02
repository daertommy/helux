import { isFn, isSymbol, prefixValKey, warn } from '@helux/utils';
import { immut } from 'limu';
import { EXPIRE_MS, IS_DERIVED_ATOM, KEY_SPLITER, NOT_MOUNT, RENDER_END, RENDER_START } from '../consts';
import { genInsKey } from '../factory/common/key';
import { cutDepKeyByStop, recordArrKey } from '../factory/common/stopDep';
import type { InsCtxDef } from '../factory/creator/buildInternal';
import { mapGlobalId } from '../factory/creator/globalId';
import type { Dict, Ext, IFnCtx, IUseSharedOptions } from '../types/base';
import type { DepKeyInfo } from '../types/inner';
import { recordBlockDepKey } from './blockDep';
import * as fnDep from './fnDep';
import { clearDep } from './insDep';
import { createOb } from './obj';
import { getInternal } from './state';

export function runInsUpdater(insCtx: InsCtxDef | undefined) {
  if (!insCtx) return;
  const { updater, mountStatus, createTime } = insCtx;
  if (mountStatus === NOT_MOUNT && Date.now() - createTime > EXPIRE_MS) {
    return clearDep(insCtx);
  }

  updater();
}

export function attachInsProxyState(insCtx: InsCtxDef) {
  const { internal, recordDep } = insCtx;
  const { rawState, isDeep, level1ArrKeys, sharedKey } = internal;

  const collectDep = (info: DepKeyInfo, value: any) => {
    if (!insCtx.canCollect) {
      // 无需收集依赖
      return;
    }
    if (Array.isArray(value)) {
      recordArrKey(level1ArrKeys, info.depKey);
    }
    recordDep(info);
  };

  if (isDeep) {
    insCtx.proxyState = immut(rawState, {
      onOperate: ({ isBuiltInFnKey, fullKeyPath, value }) => {
        if (isBuiltInFnKey) return;
        const depKey = prefixValKey(fullKeyPath.join(KEY_SPLITER), sharedKey);
        collectDep({ depKey, keyPath: fullKeyPath, sharedKey }, value);
      },
      compareVer: true,
    });
  } else {
    insCtx.proxyState = createOb(rawState, {
      set: () => {
        warn('changing shared state is invalid');
        return true;
      },
      get: (target: Dict, key: string) => {
        if (isSymbol(key)) {
          return target[key];
        }
        const depKey = prefixValKey(key, sharedKey);
        const value = target[key];
        collectDep({ depKey, keyPath: [key], sharedKey }, value);
        return value;
      },
    });
  }
}

export function buildInsCtx(options: Ext<IUseSharedOptions>): InsCtxDef {
  const { updater, sharedState, id = '', globalId = '', collectType = 'every', deps } = options;
  const internal = getInternal(sharedState);
  if (!internal) {
    throw new Error('ERR_OBJ_NOT_SHARED: input object is not a result returned by share api');
  }

  const insKey = genInsKey();
  const { rawState, isDeep, ver, ruleConf, level1ArrKeys } = internal;
  const { stopDepInfo } = ruleConf;
  const insCtx: InsCtxDef = {
    readMap: {},
    readMapPrev: {},
    readMapStrict: null,
    isDeep,
    insKey,
    internal,
    rawState,
    sharedState,
    proxyState: {},
    updater,
    mountStatus: NOT_MOUNT,
    renderStatus: RENDER_START,
    createTime: Date.now(),
    ver,
    id,
    globalId,
    collectType,
    // 设定了 no，才关闭依赖收集功能，此时依赖靠 deps 函数提供
    canCollect: collectType !== 'no',
    isFirstRender: true,
    subscribe: (cb) => {
      // call insDep subscribe after snap changed
      cb();
    },
    /** 记录一些需复用的中间生成的数据 */
    extra: {},
    renderInfo: {
      sn: 0,
      getDeps: () => Object.keys(insCtx.readMap),
    },
    recordDep: (depKeyInfo: DepKeyInfo) => {
      let depKey = depKeyInfo.depKey;
      // depKey 可能因为配置了 rules[]stopDep 的关系被 recordCb 改写
      cutDepKeyByStop(depKeyInfo, {
        stopDepInfo,
        level1ArrKeys,
        recordCb: (key) => {
          depKey = key;
        },
      });
      recordBlockDepKey([depKey]);

      if (insCtx.readMap[depKey] !== 1) {
        insCtx.readMap[depKey] = 1;
        if (insCtx.renderStatus !== RENDER_END) {
          internal.recordDep(depKey, insCtx.insKey);
        }
        // record derive/watch dep
        fnDep.recordFnDepKeys([depKey], {});
      }
    },
  };
  globalId && mapGlobalId(globalId, insKey);
  attachInsProxyState(insCtx);
  internal.mapInsCtx(insCtx, insKey);
  internal.recordId(id, insKey);

  // 首次渲染执行一次依赖项补充函数
  if (isFn(deps)) {
    deps(insCtx.proxyState);
  }

  return insCtx;
}

export function attachInsDerivedResult(fnCtx: IFnCtx) {
  const { result, forAtom } = fnCtx;

  // MARK: 此计算结果不具备依赖收集特性，如需要此特性可使用 share接口 的 watch 加 mutate 配置完成
  // LABEL: proxyResult
  fnCtx.proxyResult = createOb(result, {
    set: () => {
      warn('changing derived result is invalid');
      return false;
    },
    get: (target: Dict, resultKey: string) => {
      if (IS_DERIVED_ATOM === resultKey) {
        return forAtom;
      }
      if (RENDER_START === fnCtx.renderStatus) {
        fnDep.ensureFnDepData(fnCtx);
      }
      return result[resultKey];
    },
  });
}
