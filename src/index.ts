// Thin wrapper: the actual activation logic lives in game-ci/unity-engine-core.
// See game-ci/roadmap#11 (workstream 2) for the "thin wrapper" migration this is part of.
import { run } from '@game-ci/unity-engine-core/dist/unity-activate';

run();
