import { describe, it, expect, vi } from 'vitest';
import { assetNameFor, binaryNameFor, resolveLatestTag, validateCliVersion } from './download-cli';

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

  it('throws with the status code when the API response is not ok', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 404 }) as Response);
    await expect(resolveLatestTag(fetchFn)).rejects.toThrow(/404/);
  });

  it('throws when the response has no tag_name', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as Response);
    await expect(resolveLatestTag(fetchFn)).rejects.toThrow(/tag_name/);
  });
});
