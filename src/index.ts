import * as core from '@actions/core';
import { Action, Docker, Input, ImageTag } from './model';

async function action() {
  Action.checkCompatibility();

  const { dockerfile, workspace, actionFolder } = Action;
  const unityVersion = Input.unityVersion;
  const baseImage = new ImageTag(unityVersion);

  // Build docker image
  const actionImage = await Docker.build({ path: actionFolder, dockerfile, baseImage });

  // Run docker image
  await Docker.run(actionImage, { workspace, unityVersion });
}

action().catch(error => {
  core.setFailed(error.message);
});
