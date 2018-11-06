export const createWorker = (source, isIterator) => {
  const deferred = createDeferred();
  const bridge = isIterator
    ? createIteratorBridge(deferred)
    : createBridge(deferred);

  const workerSource = isIterator
    ? `
  var worker = ${source};
  var iterator;
  self.onmessage = function (event) {
    if (event.data.method === 'init') {
      iterator = worker(event.data.value);
    } else {
      Promise.resolve(iterator[event.data.method](event.data.value))
        .then(postMessage, close)
    }
  }`
    : `
  var worker = ${source};
  self.onmessage = function (event) {
    Promise.resolve(worker(event.data))
      .then(postMessage, close)
  }`;

  if (window.Worker) {
    const worker = new Worker(
      URL.createObjectURL(new Blob([workerSource]), {
        type: 'application/javascript',
      }),
    );
    deferred.resolve(worker);
    bridge.terminate = () => worker.terminate();
  }

  return bridge;
};

export const createIteratorBridge = deferred => (value, transferable) => {
  const bridge = createBridge(deferred);
  bridge({ method: 'init', value }, transferable);

  return {
    next: (value, transferable) =>
      bridge({ method: 'next', value }, transferable),
    return: value => bridge({ method: 'return', value }),
    throw: value => bridge({ method: 'throw', value }),
  };
};

export const createBridge = deferred => async (value, transferable) => {
  const worker = await deferred.promise;
  const handlers = [];

  worker.onerror = event => {
    handlers.forEach(([, reject]) => reject(event.error));
  };
  worker.onmessage = event => {
    handlers.forEach(([resolve]) => resolve(event.data));
  };

  const result = new Promise((resolve, reject) => {
    handlers.push([resolve, reject]);
  });

  worker.postMessage(value, transferable);
  return result;
};

export const createDeferred = () => {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

export default createWorker;
