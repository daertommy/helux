import { initHeluxContext } from '@helux/core';
import { React18Like } from '@helux/types';
import * as Fre from 'fre';

const reactLib = { ...Fre } as unknown as React18Like;
const api = initHeluxContext({ heluxCtxKey: '__HELUX_FRE__', reactLib });

// 导出 core 所有方法，类型由 index.d.ts 提供（见 package.json的 types 配置）
export const {
  atom,
  share,
  shareState,
  shareAtom,
  createShared,
  // derive api
  derive,
  deriveAtom,
  runDerive,
  runDeriveAsync,
  // watch api
  watch,
  // hooks api
  useAtom,
  useShared,
  useDerived,
  useDerivedAtom,
  useWatch,
  useGlobalId,
  useService,
  useOnEvent,
  useMutable,
  useMutateLoading,
  useActionLoading,
  useForceUpdate,
  useEffect,
  useLayoutEffect,
  useStable,
  useObject,
  // action api
  action,
  actionAsync,
  atomAction,
  atomActionAsync,
  // signal api
  signal,
  block,
  blockStatus,
  dynamicBlock,
  dynamicBlockStatus,
  $,
  // mutate api
  mutate,
  mutateDict,
  atomMutate,
  runMutate,
  runMutateTask,
  // model api
  model,
  modelFactory,
  // emit api
  emit,
  on,
  // util api
  storeSrv,
  shallowCompare,
  isDiff,
  produce,
  getMutateLoading,
  getActionLoading,
  getDeriveLoading,
  getRawState,
  getSnap,
  getAtom,
  addMiddleware,
  addPlugin,
  EVENT_NAME,
  LOADING_MODE,
} = api;
