/**
 * this lib export helux utils
 */
import type { Dict, Fn, NumStrSymbol } from '@helux/types';
export declare function nodupPush(list: NumStrSymbol[], toPush: NumStrSymbol): void;
export declare function delListItem(list: NumStrSymbol[], toDel: NumStrSymbol): void;
export declare function dedupList(list: Array<any>): any[];
export declare function includeOne(loopList: any[], judgeList: any[]): boolean;
export declare function matchListItem(list: string[], fullStr: string): string;
export declare function enureReturnArr(fn?: Fn, arg?: any): any[];
export declare const GLOBAL_REF: Dict & Window & typeof globalThis;
export declare const DEV_FLAG: boolean;
export declare function noop(...args: any[]): undefined;
export declare function noopVoid(...args: any[]): void;
export declare function noopArgs<T extends any[] = any[]>(...args: T): T;
export declare function noopArr(...args: any[]): any[];
export declare function isMax(input: number): boolean;
export declare function isDebug(): boolean;
/**
 * 此方法排除了数组，仅把 {} Map Set 都认为是 obj
 */
export declare function isObj(mayObj: any): mayObj is Dict;
/**
 * 区别于 isObj，此方法把 {} Map Set Array 都认为是 obj
 */
export declare function isJsObj(mayObj: any): mayObj is Dict | Array<any>;
export declare function isFn(mayFn: any): mayFn is Fn;
export declare function isAsyncFn(mayFn: any): mayFn is Fn;
export declare function isSymbol(maySymbol: any): maySymbol is symbol;
export declare function isPromise(mayObj: any): boolean;
export declare function isProxyRevoked(proxy: Dict): boolean;
export declare function isProxyAvailable(): boolean;
/**
 * alert 提示错误格式为 `${customLabel}${errMsg}, see details in console.`，
 * customLabel 可定制
 */
export declare function tryAlert(err: any, throwErr?: boolean, customLabel?: string): void;
/**
 *
 * @param msg - 提示信息
 * @param level - 提示级别，0：触发error待遇，如果是开发模式还会触发 trace 打印；1：只触发 error 打印；2：只触发 warn 打印
 */
export declare function warn(msg: string, level?: number): void;
export declare function getSafeNext(input: number): number;
export declare function has(obj: any, key: any): boolean;
/** safe obj get */
export declare function safeObjGet<T = any>(obj: Record<NumStrSymbol, any>, key: NumStrSymbol, defaultValue: T): T;
/** safe map get */
export declare function safeMapGet<T = any>(map: Map<any, any>, key: any, defaultValue: T): T;
export declare function matchDictKey(dict: Dict, fullStr: string): string;
export declare function getVal(obj: any, keyPath: string[]): any;
export declare function setVal(obj: any, keyPath: string[], val: any): void;
export declare function setNoop(): boolean;
export declare function asType<T extends any = any>(val: any): T;
export declare function prefixValKey(valKey: string, sharedKey: number): string;
export declare function canUseDeep(isDeep: boolean): boolean;
