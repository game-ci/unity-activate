const core = require('@actions/core');

class Input {
  static get unityVersion() {
    return core.getInput('unityVersion') || '2019.2.11f1';
  }
}

export default Input;
