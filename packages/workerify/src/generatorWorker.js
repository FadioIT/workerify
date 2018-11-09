import createDeferred from './createDeferred';

export const createWorkerSource = source => `
  var func = ${source};
  var iterator = null;
  self.onmessage = function (event) {
    if (event.data.method === 'init') {
      iterator = func(event.data.value);
    } else {
      var result = iterator[event.data.method](event.data.value);
      if (result && result.then) {
        result.then(
          function (data) {
            self.postMessage({ data: data });
          }, 
          function (error) {
            error = error || new Error('Unknown error');
            if (error instanceof Error) {
              error = { 
                __isSerializedError: true,
                message: error.message, 
                stack: error.stack, 
                name: error.name 
              }
            }
            self.postMessage({ error: error });
          }
        );
      } else {
        self.postMessage({ data: result });
      }
    }
  }
`;

export const createBridge = worker => (value, transferable) => {
  const queue = [];
  let isTerminated = false;

  const enqueueMethod = (method, value, transferable) => {
    if (isTerminated) {
      return Promise.resolve({ value: undefined, done: true });
    }
    const deferred = createDeferred();
    queue.push(deferred);
    worker.postMessage({ method, value }, transferable);
    return deferred.promise;
  };

  const teminateWorker = () => {
    worker.terminate();
    isTerminated = true;
    queue.forEach(deferred =>
      deferred.resolve({ value: undefined, done: true }),
    );
  };

  worker.onmessage = event => {
    const { data, error } = event.data;
    const deferred = queue.shift();
    if (error) {
      deferred.reject(
        error.__isSerializedError ? Object.assign(new Error(), error) : error,
      );
      teminateWorker();
    } else {
      deferred.resolve(data);
      if (data.done === true) {
        teminateWorker();
      }
    }
  };

  worker.onerror = event => {
    const deferred = queue.shift();
    deferred.reject(event);
    teminateWorker();
  };

  worker.postMessage({ method: 'init', value }, transferable);

  return {
    [Symbol.asyncIterator]: this,
    next: (value, transferable) => enqueueMethod('next', value, transferable),
    throw: value => enqueueMethod('throw', value, transferable),
    return: value => enqueueMethod('return', value, transferable),
  };
};
