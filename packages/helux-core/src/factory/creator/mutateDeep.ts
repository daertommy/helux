import { isObj } from 'helux-utils';
import { createDraft, finishDraft } from 'limu';
import type { Dict, IInnerSetStateOptions } from '../../types/base';
import { genRenderSN } from '../common/key';
import { runMiddlewares } from '../common/middleware';
import { emitDataChanged } from '../common/plugin';
import { IMutateCtx, newMutateCtx } from '../common/util';
import type { TInternal } from './buildInternal';
import { commitState } from './commitState';
import { handleOperate } from './operateState';

interface IPrepareDeepMutateOpts extends IInnerSetStateOptions {
  internal: TInternal;
  forAtom: boolean;
}

interface ICommitOpts extends IPrepareDeepMutateOpts {
  desc?: string;
  mutateCtx: IMutateCtx;
  state: any;
}

/**
 * mutateNormal 和 mutateDepp 的 finishMutate 里提交之前可复用的公共逻辑
 */
export function beforeCommit(opts: ICommitOpts, innerSetOptions: IInnerSetStateOptions, draft: any) {
  Object.assign(opts, innerSetOptions);
  // sn 序号相同表示同一批次触发重渲染
  opts.sn = opts.sn || genRenderSN();
  opts.from = opts.from || 'SetState';
  const { from, sn, desc } = opts;
  opts.internal.before({ from, draft, desc, sn });
  runMiddlewares(draft, opts.internal);
}

/**
 * deep模式下，生成limu返回的草稿状态，用户可以对草稿做任意修改，且不会影响原状态
 */
export function prepareDeepMutate(opts: IPrepareDeepMutateOpts) {
  const { internal, desc } = opts;
  const mutateCtx = newMutateCtx(opts);
  const commitOpts = { state: {}, mutateCtx, ...opts, desc };
  const draft = createDraft(internal.rawState, {
    onOperate(opParams) {
      handleOperate(opParams, { internal, mutateCtx });
    },
  });

  return {
    draft,
    finishMutate(partial?: Dict, innerSetOptions: IInnerSetStateOptions = {}) {
      const { writeKeys, writeKeyPathInfo } = mutateCtx;
      // 把深依赖和浅依赖收集到的keys合并起来
      if (isObj(partial)) {
        Object.keys(partial).forEach((key) => {
          draft[key] = partial[key]; // 触发 writeKeys 里记录当前变化key
        });
      }
      beforeCommit(commitOpts, innerSetOptions, draft);

      mutateCtx.depKeys = Object.keys(writeKeys);
      commitOpts.state = finishDraft(draft); // a structural shared obj generated by limu
      mutateCtx.triggerReasons = Object.values(writeKeyPathInfo);
      commitState(commitOpts);
      emitDataChanged(internal, innerSetOptions, desc);

      return internal.snap; // 返回最新的快照给调用者
    },
  };
}
