import { run, reducer, getState, configure } from '../src/index';
import { makeStoreConfig } from './util';

const Foo = 'foo';

describe('test top property reducer', async () => {
  beforeAll(() => {
    run(makeStoreConfig('foo'), { logError: false });
  });

  
  test('root reducer should include module methods that configured by run', () => {
    expect(reducer[Foo].changeName).toBeInstanceOf(Function);
    expect(reducer[Foo].setState).toBeInstanceOf(Function);
  });


  test('root reducer should include module methods that configured by configure', () => {
    configure(makeStoreConfig('bar', false));
    expect(reducer['bar'].changeName).toBeInstanceOf(Function);
    expect(reducer['bar'].setState).toBeInstanceOf(Function);
  });


  test('root reducer should not include non-configured module methods', () => {
    expect(reducer['non-existed-module']).toBeFalsy();
  });


  test('root reducer methods should work', async () => {
    await reducer[Foo].changeName('newName');
    const fooState = getState(Foo);
    expect(fooState.name).toBe('newName');
  });
});
