import { MOUNTED, RENDER_END, RENDER_START } from '../../consts';
import type { InsCtxDef } from '../../factory/creator/buildInternal';
import { buildInsCtx } from '../../helpers/insCtx';
import { resetReadMap, updateDep } from '../../helpers/insDep';
import { getInternal } from '../../helpers/state';
import type { CoreApiCtx } from '../../types/api-ctx';
import type { Dict, IInnerUseSharedOptions } from '../../types/base';
import { checkAtom, checkStateVer, delInsCtx, isSharedKeyChanged, recoverInsCtx } from './shared';
import { useSync } from './useSync';

// for skip ts check out of if block
const nullInsCtx = null as unknown as InsCtxDef;

/**
 * 生成组件对应的上下文
 */
function useInsCtx<T = Dict>(apiCtx: CoreApiCtx, sharedState: T, options: IInnerUseSharedOptions<T>): InsCtxDef {
  const updater = apiCtx.hookImpl.useForceUpdate();
  const ctxRef = apiCtx.react.useRef<{ ctx: InsCtxDef }>({ ctx: nullInsCtx });
  // start build or rebuild ins ctx
  let insCtx = ctxRef.current.ctx;
  if (!insCtx || isSharedKeyChanged(insCtx, sharedState)) {
    insCtx = buildInsCtx({ updater, sharedState, ...options });
    ctxRef.current.ctx = insCtx;
  }

  return insCtx;
}

/**
 * 组件初次加载、卸载前相关副作用
 */
function useInsCtxEffect(apiCtx: CoreApiCtx, insCtx: InsCtxDef) {
  apiCtx.react.useEffect(() => {
    // 设定了 options.collect='first' 则首轮渲染结束后标记不能再收集依赖，阻值后续新的渲染流程里继续收集依赖的行为
    if (insCtx.collectType === 'first') {
      insCtx.canCollect = false;
    }

    insCtx.mountStatus = MOUNTED;
    recoverInsCtx(insCtx);
    return () => {
      delInsCtx(insCtx);
    };
  }, [insCtx]);
}

/**
 * 收集组件渲染需要的依赖
 */
function useDepCollection<T = Dict>(apiCtx: CoreApiCtx, sharedState: T, insCtx: InsCtxDef, options: IInnerUseSharedOptions<T>) {
  insCtx.renderStatus = RENDER_START;
  resetReadMap(insCtx);
  // adapt to react 18
  useSync(apiCtx, insCtx.subscribe, () => getInternal(sharedState).snap);

  // start update dep in every render period
  apiCtx.react.useEffect(() => {
    insCtx.renderStatus = RENDER_END;
    insCtx.isFirstRender = false;
    updateDep(insCtx);
  });
}

/**
 * 裁剪后的 useSharedLogic，供 signal 模块 和 useGlobalId 调用
 */
export function useSharedSimpleLogic<T extends Dict = Dict>(
  apiCtx: CoreApiCtx,
  sharedState: T,
  options: IInnerUseSharedOptions<T> = {},
): InsCtxDef {
  const insCtx = useInsCtx(apiCtx, sharedState, options);
  // adapt to react 18
  useSync(apiCtx, insCtx.subscribe, () => getInternal(sharedState).snap);
  useInsCtxEffect(apiCtx, insCtx);

  return insCtx;
}

export function useSharedLogic<T = Dict>(apiCtx: CoreApiCtx, sharedState: T, options: IInnerUseSharedOptions<T> = {}): InsCtxDef {
  checkAtom(sharedState, options.forAtom);
  const insCtx = useInsCtx(apiCtx, sharedState, options);
  useDepCollection(apiCtx, sharedState, insCtx, options);
  useInsCtxEffect(apiCtx, insCtx);
  checkStateVer(insCtx);

  return insCtx;
}
