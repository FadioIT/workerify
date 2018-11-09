export const createWorkerSource = source => `
  var func = ${source};
  self.onmessage = function (event) {
    const args = event.data;
    const result = func(args);
    if (result && result.then) {
      result.then(
        function (data) {
          self.postMessage({ data: data });
        }, 
        function (error) {
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
  };
`;

export const createBridge = worker => (value, transferable) =>
  new Promise((resolve, reject) => {
    worker.onerror = event => {
      reject(event);
      worker.terminate();
    };
    worker.onmessage = event => {
      const { data, error } = event.data;
      worker.terminate();
      if (error) {
        reject(
          error.__isSerializedError ? Object.assign(new Error(), error) : error,
        );
      } else {
        resolve(data);
      }
    };
    worker.postMessage(value, transferable);
  });
