import fs from 'fs';
import { declare } from '@babel/helper-plugin-utils';

const WORKERIFY_MODULE_NAME = '@fadioit/workerify';
const REGENERATOR_RUNTIME_SOURCE = fs.readFileSync(
  require.resolve('regenerator-runtime/runtime'),
);

export default declare(
  (api, { insertGeneratorRuntime = true, prependCode = '' } = {}) => {
    api.assertVersion(7);

    prependCode = insertGeneratorRuntime
      ? `${prependCode}\n${REGENERATOR_RUNTIME_SOURCE}`
      : prependCode;

    let babelOptions = {};

    const transformWorkerifyCallExpression = expression => {
      const callback = expression.get('arguments.0');

      if (!callback) {
        throw new Error(
          'workerify expect first argument to be a function or a string representing a function',
        );
      }

      let code;

      if (callback.isStringLiteral() || callback.isTemplateLiteral()) {
        ({ code } = transformWorkerFunctionString(callback));
      } else if (
        callback.isArrowFunctionExpression() ||
        callback.isFunctionExpression()
      ) {
        ({ code } = transformWorkerFunctionExpression(callback));
      } else {
        throw new Error(
          'Workerify expect a function expression as first parameter ' +
            `given ${callback.type}`,
        );
      }

      const isIterator = callback.node.generator;

      expression.node.arguments = [
        api.types.stringLiteral(code),
        api.types.booleanLiteral(isIterator),
        api.types.stringLiteral(prependCode),
      ];
    };

    const transformWorkerFunctionExpression = expression =>
      transformWorkerFunctionString(expression.getSource());

    const transformWorkerFunctionString = string =>
      api.transformSync(`(${string})`, babelOptions);

    return {
      visitor: {
        CallExpression: path => {
          if (path.get('callee').referencesImport(WORKERIFY_MODULE_NAME)) {
            transformWorkerifyCallExpression(path);
          }
        },
      },
      manipulateOptions(options) {
        babelOptions = options;
      },
    };
  },
);
