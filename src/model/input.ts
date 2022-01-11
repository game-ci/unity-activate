import * as core from '@actions/core';

const Input = {
  get unityVersion() {
    return core.getInput('unityVersion') || '2019.2.11f1';
  },
};

export default Input;
