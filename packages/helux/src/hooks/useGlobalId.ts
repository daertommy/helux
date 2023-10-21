import { createSharedLogic } from '../factory/createShared';
import { getGlobalShared, setGlobalShared } from '../factory/root';
import { NumStrSymbol } from '../types';
import { useShared } from './useShared';

const GLOBAL_SHARED = ensureGlobalShared();

function ensureGlobalShared() {
  let shared = getGlobalShared();
  if (!shared) {
    const result = createSharedLogic({ rawState: {}, forGlobal: true });
    shared = setGlobalShared(result.state);
  }
  return shared;
}

export function useGlobalId(globalId: NumStrSymbol) {
  useShared(GLOBAL_SHARED, { staticDeps: () => [], globalId });
}