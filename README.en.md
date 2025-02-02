[简体中文](./README.md) | English

helux v3 commin soon!

## quick visit

simple usage

```tsx
import {
createShared, createDeepShared, createComputed, createComputedAsync,
useShared, useComputed,
} from 'helux';

// create 2 shared state with deep dependencies collection strategy
const ret = createDeepShared({a:1, b:{ b1: {b2: 200}} });
const ret2 = createDeepShared({a:1, b:{ b1: {b2: 200}} });

// create one shared state with shallow dependencies collection strategy
const ret3 = createDeepShared({a:1, b:{ b1: {b2: 200}} });

// sync computed
const doubleA = createComputed(()=> ({val: ret.state.a * 2}) );
// sync computed with mutil shared state
const aPlusB2 = createComputed(()=> ({val:ret.state.a + ret.state.b.b1.b2}) );

// async computed
const cu1Ret = createComputedAsync(
  () => ({ source: ret.state.a, initial: { val: 0 } }),
  // @ts-ignore
  async (params) => {
    const num = params.source + 1000;
    await delay(1000);
    return { val: num, mark: 'cu1Ret' };
  },
);

// use async computed result to generate another result
const cu2Ret = createComputed(()=> ({val: cu1Ret.val + 100 }) );

function changeA(){
  ret.setState(draft=>draft.a+=100);
}

function Demo(){
  // read shared state
  const [ state, setState ] = useShared(ret);
  // read
  <div>{state.a}</div>
  // mutate in compoment
  setState(draft=>draft.a+=100);
  <button onClick={()=>setState(draft=>draft.a+=100)}>changeA in comp</button>

  // mutate out of component
  <button onClick={changeA}>changeA</button>
}

function Demo2(){
  // read computed
  const [ cu1 ] = useComputed(doubleA);
  const [ cu2 ] = useComputed(aPlusB2);
  const [cu1RetObj, isComputing1] = useComputed(cu1Ret);
  const [cu2RetObj, isComputing2] = useComputed(cu2Ret);
}

```
