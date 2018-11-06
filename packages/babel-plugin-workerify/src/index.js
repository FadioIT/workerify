import { declare } from '@babel/helper-plugin-utils';

const WORKERIFY_MODULE_NAME = '@fadioit/workerify';

class WorkerifyTransformer {
  constructor(babel) {
    babel.assertVersion(7);
    this.babel = babel;
  }

  options = {};

  visitor = {
    CallExpression: path => {
      if (path.get('callee').referencesImport(WORKERIFY_MODULE_NAME)) {
        this.transformWorkerifyCallExpression(path);
      }
    },
  };

  manipulateOptions = options => {
    this.options = options;
  };

  getWorkerFunctionFromPath = path => {
    switch (path.type) {
      case 'FunctionExpression':
      case 'isArrowFunctionExpression':
        return path;
      case 'Identifier':
        return this.getWorkerFunctionFromIdentifier(path);
      case 'CallExpression':
        return this.getWorkerFunctionFromCallExpression(path);
      case 'VariableDeclarator':
        return this.getWorkerFunctionFromVariableDeclarator(path);
      case 'StringLiteral':
      case 'TemplateLiteral':
        return path;
      default:
        return;
    }
  };

  getWorkerFunctionFromIdentifier = identifier => {
    return this.getWorkerFunctionFromPath(
      identifier.scope.getBinding(identifier.node.name).path,
    );
  };

  getWorkerFunctionFromVariableDeclarator = declarator => {
    return this.getWorkerFunctionFromPath(declarator.get('init'));
  };

  getWorkerFunctionFromCallExpression = expression => {
    return expression.get('arguments.0');
  };

  transformWorkerifyCallExpression = expression => {
    const callback = this.getWorkerFunctionFromPath(
      expression.get('arguments.0'),
    );

    if (!callback) {
      throw new Error(
        'workerify expect first argument to be a function or a string representing a function',
      );
    }

    const isIterator = expression.get('arguments.1');
    let code;

    if (callback.isStringLiteral() || callback.isTemplateLiteral()) {
      ({ code } = this.transformWorkerFunctionString(callback));
    } else {
      ({ code } = this.transformWorkerFunctionExpression(callback));
    }

    expression.node.arguments = [
      this.babel.types.stringLiteral(code),
      isIterator && isIterator.isBooleanLiteral()
        ? isIterator.node
        : this.babel.types.booleanLiteral(callback.node.generator || false),
    ];
  };

  transformWorkerFunctionExpression = expression =>
    this.transformWorkerFunctionString(expression.getSource());

  transformWorkerFunctionString = string =>
    this.babel.transformSync(`(${string})`, this.options);
}

export default declare(babel => {
  const { visitor, manipulateOptions } = new WorkerifyTransformer(babel);

  return { visitor, manipulateOptions };
});
