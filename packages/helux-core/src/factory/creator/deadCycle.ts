/**
 * 本模块用于辅助处理 mutate 函数可能遇到的死循环问题
 */
import { nodupPush, safeMapGet, tryAlert } from '@helux/utils';
import { TInternal } from './buildInternal';

type Log = { sn: number; descs: string[]; timer: any; errs: any[]; cycle: string[] };
const logMap = new Map<string, Log>();

function newLog(sn = 0): Log {
  return { sn, descs: [], errs: [], timer: null, cycle: [] };
}

export function dcErr(usefulName: string, descs: string[], runDesc: string) {
  const err = new Error(`module(${usefulName}) found mutate fn(${runDesc}) in these dead cycle fns [${descs.join(',')}]`);
  err.cause = 'DeadCycle';
  // @ts-ignore
  err.data = descs;
  return err;
}

/**
 * hot reload 模式下，清理相关日志，让新配置的 mutate 函数也能够被检测到死循环依赖
 */
export function clearDcLog(usefulName: string) {
  logMap.delete(usefulName);
}

/**
 * 探测循环依赖存在的可能性，避免死循环卡死整个应用
 */
export function probeDeadCycle(sn: number, desc: string, internal?: TInternal) {
  if (internal && desc) {
    const { usefulName } = internal;
    const log = safeMapGet(logMap, usefulName, newLog(sn));

    // 执行批次已变更，重置 log
    if (log.sn !== sn) {
      log.descs = [];
      log.errs = [];
    }

    const { descs } = log;
    // found dead cycle
    // fn task 同时存在且设定了 immediate=true 时，fn 和 task 都会执行，
    // 判断 descs.length > 1 避免此处出现误判
    if (descs.length > 1 && descs[0] === desc) {
      const listCopy = descs.slice();
      log.cycle = listCopy; // 记录死循环desc列表
      descs.length = 0;
      throw dcErr(usefulName, listCopy, desc);
    }
    nodupPush(descs, desc);
  }
}

export function inDeadCycle(usefulName: string, desc: string) {
  const log = logMap.get(usefulName);
  if (!log || !log.cycle.includes(desc)) {
    return { isIn: false, cycle: [] };
  }
  return { isIn: true, cycle: log.cycle };
}

export function analyzeErrLog(usefulName: string, err: any) {
  const log = logMap.get(usefulName);
  if (!log) return;
  const { timer, errs } = log;
  errs.push(err);

  timer && clearTimeout(timer);
  log.timer = setTimeout(() => {
    let targetErr: any = null;
    for (const err of errs) {
      if (!targetErr) {
        targetErr = err;
      } else if (err.data.length > targetErr.data.length) {
        targetErr = err;
      }
    }
    if (targetErr) {
      // console.error('dead cycle', targetErr);
      tryAlert(targetErr);
    }
    errs.length = 0;
  }, 0);
}
