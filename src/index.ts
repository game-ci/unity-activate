// Thin wrapper: this action installs and shells out to the game-ci CLI
// (game-ci/cli's `activate` command) as a subprocess, so the exact same
// code path this runs in CI also runs when a developer invokes the CLI
// directly on their own machine. See game-ci/roadmap#11 (workstream 2).
//
// Unity credentials (UNITY_EMAIL, UNITY_PASSWORD, UNITY_SERIAL,
// UNITY_LICENSE, UNITY_LICENSING_SERVER) are read by the CLI itself from
// its own process environment - see game-ci/cli's unity-options.ts. They
// are intentionally not passed as CLI arguments, since argv can leak
// through process listings and command-logging.
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { downloadCli } from './download-cli';

async function run() {
  try {
    const cliVersion = core.getInput('cliVersion') || 'latest';
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();

    const cliPath = await downloadCli(cliVersion);

    // CodeQL flags this as js/command-line-injection since workspace
    // derives from the runner environment. Verified false positive:
    // ['activate', workspace] is an array of discrete argv entries, and
    // @actions/exec's toolrunner.js passes it straight to
    // child_process.spawn(fileName, args, options) - never a shell
    // string, never shell-parsed. This comment does not suppress the
    // alert (no inline-suppression mechanism exists in GitHub Code
    // Scanning's default setup); dismiss via the Security tab/API instead.
    await exec.exec(cliPath, ['activate', workspace]);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
