import { createWorker, createBridge, createDeferred } from '../index';

describe('createWorker', () => {
  const functionCode = 'function (a, b) { return a + b; }';

  it('returns a function', () => {
    expect(createWorker(functionCode)).toEqual(expect.any(Function));
  });
});

describe('createBridge', () => {
  it('returns a function', () => {
    expect(createBridge({})).toEqual(expect.any(Function));
  });
});

describe('createDeferred', () => {
  it('returns an object', () => {
    expect(createDeferred()).toEqual({
      promise: expect.any(Promise),
      resolve: expect.any(Function),
      reject: expect.any(Function),
    });
  });

  it('resolves the promise when resolve method is called', async () => {
    const deferred = createDeferred();
    const callback = jest.fn();
    const errorHandler = jest.fn();

    const promise = deferred.promise.then(callback, errorHandler);
    deferred.resolve('foo');
    await promise;

    expect(callback).toHaveBeenCalledWith('foo');
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it('rejects the promise when reject method is called', async () => {
    const deferred = createDeferred();
    const callback = jest.fn();
    const errorHandler = jest.fn();

    const promise = deferred.promise.then(callback, errorHandler);
    deferred.reject('foo');
    await promise;

    expect(errorHandler).toHaveBeenCalledWith('foo');
    expect(callback).not.toHaveBeenCalled();
  });
});
