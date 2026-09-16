import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  assetNameFor,
  binaryNameFor,
  downloadCli,
  resolveLatestTag,
  validateCliVersion,
} from './download-cli';

const cacheMock = vi.hoisted(() => ({
  isFeatureAvailable: vi.fn(() => true),
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
}));
vi.mock('@actions/cache', () => cacheMock);

const toolCacheMock = vi.hoisted(() => ({
  downloadTool: vi.fn(async () => '/tmp/archive'),
  extractTar: vi.fn(async () => '/tmp/extracted'),
  extractZip: vi.fn(async () => '/tmp/extracted'),
}));
vi.mock('@actions/tool-cache', () => toolCacheMock);

vi.mock('node:fs/promises', () => ({
  chmod: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
  cp: vi.fn(async () => {}),
}));

describe('downloadCli caching', () => {
  beforeEach(() => {
    cacheMock.isFeatureAvailable.mockReturnValue(true);
    cacheMock.restoreCache.mockReset();
    cacheMock.saveCache.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ tag_name: 'v1.2.3' }) }) as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never checks or writes the cache for "latest", even after resolving to a concrete tag', async () => {
    await downloadCli('latest');

    expect(cacheMock.restoreCache).not.toHaveBeenCalled();
    expect(cacheMock.saveCache).not.toHaveBeenCalled();
  });

  it('checks and writes the cache for a pinned version', async () => {
    cacheMock.restoreCache.mockResolvedValueOnce(undefined);

    await downloadCli('v0.1.0');

    expect(cacheMock.restoreCache).toHaveBeenCalledTimes(1);
    expect(cacheMock.saveCache).toHaveBeenCalledTimes(1);
  });

  // downloadCli is the only caller of resolveLatestTag in production code,
  // so this is what actually exercises the wiring index.ts depends on - the
  // resolveLatestTag-level tests above only prove the function accepts the
  // parameter, not that anything passes it one.
  it('forwards its githubToken parameter to resolveLatestTag when resolving "latest"', async () => {
    const fetchFn = vi.fn(
      async () => ({ ok: true, json: async () => ({ tag_name: 'v1.2.3' }) }) as Response,
    );
    vi.stubGlobal('fetch', fetchFn);

    await downloadCli('latest', 'gha-token-from-input');

    const [, init] = fetchFn.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe('Bearer gha-token-from-input');
  });
});

describe('validateCliVersion', () => {
  it('accepts "latest"', () => {
    expect(() => validateCliVersion('latest')).not.toThrow();
  });

  it('accepts a plain release tag', () => {
    expect(() => validateCliVersion('v0.1.0')).not.toThrow();
  });

  it('rejects a path-traversal attempt', () => {
    expect(() => validateCliVersion('../../etc/passwd')).toThrow(/Invalid game-ci CLI version/);
  });

  it('rejects a value containing a path separator', () => {
    expect(() => validateCliVersion('foo/bar')).toThrow(/Invalid game-ci CLI version/);
    expect(() => validateCliVersion('foo\\bar')).toThrow(/Invalid game-ci CLI version/);
  });

  it('rejects an encoded path separator', () => {
    expect(() => validateCliVersion('%2e%2e%2f')).toThrow(/Invalid game-ci CLI version/);
  });

  it('rejects an empty string', () => {
    expect(() => validateCliVersion('')).toThrow(/Invalid game-ci CLI version/);
  });
});

describe('assetNameFor', () => {
  it('maps linux x64 to a .tar.gz archive', () => {
    expect(assetNameFor('linux', 'x64')).toBe('game-ci-linux-x64.tar.gz');
  });

  it('maps linux arm64 to a .tar.gz archive', () => {
    expect(assetNameFor('linux', 'arm64')).toBe('game-ci-linux-arm64.tar.gz');
  });

  it('maps darwin x64 to a .tar.gz archive', () => {
    expect(assetNameFor('darwin', 'x64')).toBe('game-ci-macos-x64.tar.gz');
  });

  it('maps darwin arm64 to a .tar.gz archive', () => {
    expect(assetNameFor('darwin', 'arm64')).toBe('game-ci-macos-arm64.tar.gz');
  });

  it('maps win32 x64 to a .zip archive', () => {
    expect(assetNameFor('win32', 'x64')).toBe('game-ci-windows-x64.zip');
  });

  it('throws for an unsupported platform/arch combination', () => {
    expect(() => assetNameFor('win32', 'arm64')).toThrow(/unsupported/i);
    expect(() => assetNameFor('freebsd', 'x64')).toThrow(/unsupported/i);
  });
});

describe('binaryNameFor', () => {
  it('is game-ci.exe on win32', () => {
    expect(binaryNameFor('win32')).toBe('game-ci.exe');
  });

  it('is game-ci on every other platform', () => {
    expect(binaryNameFor('linux')).toBe('game-ci');
    expect(binaryNameFor('darwin')).toBe('game-ci');
  });
});

describe('resolveLatestTag', () => {
  it('resolves the tag_name from the GitHub releases/latest API', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).toBe('https://api.github.com/repos/game-ci/cli/releases/latest');
      return { ok: true, json: async () => ({ tag_name: 'v1.2.3' }) } as Response;
    });
    expect(await resolveLatestTag(fetchFn)).toBe('v1.2.3');
  });

  it('sends no Authorization header when neither a githubToken nor GITHUB_TOKEN/GH_TOKEN are set', async () => {
    const originalGithub = process.env.GITHUB_TOKEN;
    const originalGh = process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;

    const fetchFn = vi.fn(
      async () => ({ ok: true, json: async () => ({ tag_name: 'v1.2.3' }) }) as Response,
    );

    try {
      await resolveLatestTag(fetchFn);
      const [, init] = vi.mocked(fetchFn).mock.calls[0] as [
        string,
        RequestInit & { headers: Record<string, string> },
      ];
      expect(init.headers.Authorization).toBeUndefined();
    } finally {
      if (originalGithub !== undefined) process.env.GITHUB_TOKEN = originalGithub;
      if (originalGh !== undefined) process.env.GH_TOKEN = originalGh;
    }
  });

  // The githubToken parameter is the action's own `githubToken` input, which
  // defaults to `${{ github.token }}` - populated by GitHub Actions on every
  // run with no consumer action needed. process.env.GITHUB_TOKEN, by
  // contrast, is NOT auto-injected into a JS action's environment - a
  // calling workflow has to set it explicitly, which essentially none did.
  // Confirmed live via game-ci/unity-test-runner#328: a consumer's
  // six-version matrix failed simultaneously with "GitHub API returned 403"
  // despite every job having a real, usable token the whole time.
  it('sends an Authorization header from the githubToken parameter even when no env var is set', async () => {
    const fetchFn = vi.fn(
      async () => ({ ok: true, json: async () => ({ tag_name: 'v1.2.3' }) }) as Response,
    );

    await resolveLatestTag(fetchFn, 'gha-token-from-input');

    const [, init] = vi.mocked(fetchFn).mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe('Bearer gha-token-from-input');
  });

  it('falls back to GITHUB_TOKEN when no githubToken parameter is passed', async () => {
    const original = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'test-token-123';

    const fetchFn = vi.fn(
      async () => ({ ok: true, json: async () => ({ tag_name: 'v1.2.3' }) }) as Response,
    );

    try {
      await resolveLatestTag(fetchFn);
      const [, init] = vi.mocked(fetchFn).mock.calls[0] as [
        string,
        RequestInit & { headers: Record<string, string> },
      ];
      expect(init.headers.Authorization).toBe('Bearer test-token-123');
    } finally {
      if (original === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = original;
    }
  });

  it('throws with the status code when the API response is not ok', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 404 }) as Response);
    await expect(resolveLatestTag(fetchFn)).rejects.toThrow(/404/);
  });

  it('throws when the response has no tag_name', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as Response);
    await expect(resolveLatestTag(fetchFn)).rejects.toThrow(/tag_name/);
  });
});
