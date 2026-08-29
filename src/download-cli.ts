import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

const CLI_REPO = 'game-ci/cli';

/**
 * A release tag is a plain identifier (e.g. "v0.1.0") - no path separators,
 * dot-segments, or anything else that could escape the temp cache
 * directory this version is used to build (cacheDirFor) or select an
 * unintended GitHub path in the download URL. `cliVersion` is a
 * user-supplied action input, so this validates it before it reaches
 * either.
 */
const PINNED_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

export function validateCliVersion(version: string): void {
  if (version !== 'latest' && !PINNED_VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid game-ci CLI version: "${version}"`);
  }
}

export function assetNameFor(platform: NodeJS.Platform, arch: string): string {
  const targets: Partial<Record<NodeJS.Platform, Partial<Record<string, string>>>> = {
    linux: { x64: 'linux-x64', arm64: 'linux-arm64' },
    darwin: { x64: 'macos-x64', arm64: 'macos-arm64' },
    win32: { x64: 'windows-x64' },
  };

  const target = targets[platform]?.[arch];
  if (!target)
    throw new Error(`Unsupported platform/arch for the game-ci CLI: ${platform}/${arch}`);

  const extension = platform === 'win32' ? 'zip' : 'tar.gz';

  return `game-ci-${target}.${extension}`;
}

/** The binary's name once extracted - matches release-cli.yml's per-platform `binary` matrix value. */
export function binaryNameFor(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'game-ci.exe' : 'game-ci';
}

/**
 * Downloads (or reuses a cached copy of) the game-ci CLI release archive
 * matching the current runner, extracts it, and returns the path to the
 * binary inside.
 *
 * The archive - not a bare binary - is what's published: cli.ts resolves
 * its own static assets (default-build-script/, platforms/*,
 * unity-config/services-config.json.template, all needed for Docker
 * volume mounts) relative to its own directory on disk, and those assets
 * aren't embedded in the compiled binary itself. dist/ ships as the
 * binary's sibling inside the archive - see game-ci/cli#73.
 *
 * Cached via @actions/cache (GitHub's cache service), keyed by the
 * resolved release tag, so repeat jobs on ephemeral, GitHub-hosted
 * runners skip the download entirely - @actions/tool-cache alone only
 * survives for the life of one runner's disk, which GitHub-hosted
 * runners don't persist between jobs. This only applies to a pinned
 * version, though: "latest" is never cached, even after resolving to a
 * concrete tag - see the comment at the cache-restore call below for why.
 *
 * @param version A release tag (e.g. "v0.1.0"), or "latest".
 */
export async function downloadCli(version: string): Promise<string> {
  validateCliVersion(version);

  const asset = assetNameFor(process.platform, process.arch);
  const binaryName = binaryNameFor(process.platform);
  const isLatest = version === 'latest';
  const resolvedVersion = isLatest ? await resolveLatestTag() : version;

  // Caching is keyed by the resolved tag, so a pinned version is safely
  // cacheable across runs - but "latest" must never be, even though it
  // resolves to a concrete tag by this point: a release's assets can be
  // replaced in place under the same tag (re-uploaded, corrected, etc.),
  // and "latest" exists specifically so a job always gets whatever is
  // actually current. Caching it by resolved tag would silently serve a
  // stale cached archive instead, defeating the whole point of asking for
  // "latest".
  const cached = isLatest ? null : await restoreFromCache(resolvedVersion, binaryName);
  if (cached) return cached;

  const url = `https://github.com/${CLI_REPO}/releases/download/${encodeURIComponent(resolvedVersion)}/${asset}`;

  core.info(`Downloading game-ci CLI ${resolvedVersion} from ${url}`);
  const archivePath = await tc.downloadTool(url);
  const extractedDir =
    process.platform === 'win32'
      ? await tc.extractZip(archivePath)
      : await tc.extractTar(archivePath);

  const binaryPath = path.join(extractedDir, binaryName);
  if (process.platform !== 'win32') {
    await fs.chmod(binaryPath, 0o755);
  }

  if (!isLatest) {
    await saveToCache(resolvedVersion, binaryName, extractedDir);
  }

  return binaryPath;
}

/** Resolves "latest" to its concrete release tag so it can be cached like any other version. */
export async function resolveLatestTag(fetchFn: typeof fetch = fetch): Promise<string> {
  const response = await fetchFn(`https://api.github.com/repos/${CLI_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to resolve the latest game-ci CLI release: GitHub API returned ${response.status}.`,
    );
  }
  const body = (await response.json()) as { tag_name?: string };
  if (!body.tag_name) {
    throw new Error('Failed to resolve the latest game-ci CLI release: response had no tag_name.');
  }
  return body.tag_name;
}

function cacheDirFor(version: string): string {
  return path.join(os.tmpdir(), 'game-ci-cli-cache', version);
}

function cacheKeyFor(version: string, binaryName: string): string {
  return `game-ci-cli-${version}-${binaryName}`;
}

async function restoreFromCache(version: string, binaryName: string): Promise<string | null> {
  if (!cache.isFeatureAvailable()) return null;

  const cacheDir = cacheDirFor(version);
  try {
    const hitKey = await cache.restoreCache([cacheDir], cacheKeyFor(version, binaryName));
    if (!hitKey) return null;

    const binaryPath = path.join(cacheDir, binaryName);
    // Cache restore doesn't guarantee the executable bit survives.
    if (process.platform !== 'win32') await fs.chmod(binaryPath, 0o755);

    core.info(`Restored game-ci CLI ${version} from cache`);
    return binaryPath;
  } catch (error: any) {
    core.warning(`Failed to restore game-ci CLI from cache: ${error.message}`);
    return null;
  }
}

async function saveToCache(
  version: string,
  binaryName: string,
  extractedDir: string,
): Promise<void> {
  if (!cache.isFeatureAvailable()) return;

  const cacheDir = cacheDirFor(version);
  try {
    await fs.mkdir(path.dirname(cacheDir), { recursive: true });
    await fs.cp(extractedDir, cacheDir, { recursive: true });
    await cache.saveCache([cacheDir], cacheKeyFor(version, binaryName));
  } catch (error: any) {
    // A cache miss on save (e.g. another concurrent job already saved this
    // key) isn't fatal - the download itself already succeeded.
    core.warning(`Failed to save game-ci CLI to cache: ${error.message}`);
  }
}
