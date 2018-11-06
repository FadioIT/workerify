import { transformSync } from '@babel/core';
// import babelPresetEnv from '@babel/preset-env';
import plugin, { WORKERIFY_MODULE_NAME } from '../';

const transform = source =>
  transformSync(source, { plugins: [plugin], presets: ['@babel/preset-env'] });

const arrowFunctionString = `(a, b) => {
  const [c] = require('some-module')(a, b);
  return c;
}`;
const functionString = `function (a, b) {
  const [c] = require('some-module')(a, b);
  return c;
}`;
const generatorString = `function*(a, b) {
  const [c] = require('some-module')(a, b);
  return c;
}`;

describe('stringifies callback in place', () => {
  it('stringify functions', () => {
    const source = `
      import workerify from '${WORKERIFY_MODULE_NAME}';

      workerify(${functionString});
    `;

    const { code, ast } = transform(source, { plugins: [plugin] });
    expect(code).toMatchSnapshot();
  });

  it('stringify arrow functions', () => {
    const source = `
      import workerify from '${WORKERIFY_MODULE_NAME}';

      workerify(${arrowFunctionString});
    `;

    const { code, ast } = transform(source, { plugins: [plugin] });
    expect(code).toMatchSnapshot();
  });

  it('stringify generators', () => {
    const source = `
      import workerify from '${WORKERIFY_MODULE_NAME}';

      workerify(${generatorString});
    `;

    const { code } = transform(source, { plugins: [plugin] });
    expect(code).toMatchSnapshot();
  });
});

describe('replaces references with their stringified value', () => {
  it('replace functions', () => {
    const source = `
      import workerify from '${WORKERIFY_MODULE_NAME}';

      const workerFunc = ${functionString};
      workerify(workerFunc);
    `;

    const { code } = transform(source, { plugins: [plugin] });
    expect(code).toMatchSnapshot();
  });

  it('replace arrow functions', () => {
    const source = `
      import workerify from '${WORKERIFY_MODULE_NAME}';

      const workerFunc = ${arrowFunctionString};
      workerify(workerFunc);
    `;

    const { code } = transform(source, { plugins: [plugin] });
    expect(code).toMatchSnapshot();
  });

  it('replace generators', () => {
    const source = `
      import workerify from '${WORKERIFY_MODULE_NAME}';

      const workerFunc = ${generatorString};
      workerify(workerFunc);
    `;

    const { code } = transform(source, { plugins: [plugin] });
    expect(code).toMatchSnapshot();
  });
});
