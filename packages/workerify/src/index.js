import * as taskWorker from './taskWorker';
import * as generatorWorker from './generatorWorker';

export const createWorker = (source, isGenerator, prependCode) => {
  if (typeof source !== 'string') {
    throw new Error(
      'The source argument is not a string, that generally means ' +
        'that the Babel transform was not setup',
    );
  }
  if (!window.Worker) {
    throw new Error('The environment does not support web workers');
  }

  const workerDefinition = isGenerator ? generatorWorker : taskWorker;
  let workerSource = workerDefinition.createWorkerSource(source);
  if (prependCode) {
    workerSource = `${prependCode}\n${workerSource}`;
  }
  const worker = new Worker(
    URL.createObjectURL(new Blob([workerSource]), {
      type: 'application/javascript',
    }),
  );
  return workerDefinition.createBridge(worker);
};

export default createWorker;
