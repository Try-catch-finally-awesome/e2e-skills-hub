import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { resolveStoragePath } from '../../src/manager/storage.js';
import type { StorageConfig } from '../../src/manager/storage.js';

describe('Storage', () => {
  describe('resolveStoragePath — 项目级', () => {
    it('应使用默认子路径生成项目级存储路径', () => {
      const config: StorageConfig = {
        location: 'project',
        projectRoot: '/home/user/my-project',
      };

      const result = resolveStoragePath(config);

      expect(result).toBe(join('/home/user/my-project', '.claude/skills/e2e'));
    });

    it('应支持自定义项目子路径', () => {
      const config: StorageConfig = {
        location: 'project',
        projectRoot: '/home/user/my-project',
        projectSubPath: '.custom/e2e-skills',
      };

      const result = resolveStoragePath(config);

      expect(result).toBe(join('/home/user/my-project', '.custom/e2e-skills'));
    });

    it('未指定 projectRoot 时应使用 process.cwd()', () => {
      const config: StorageConfig = {
        location: 'project',
      };

      const result = resolveStoragePath(config);
      const expected = join(process.cwd(), '.claude/skills/e2e');

      expect(result).toBe(expected);
    });
  });

  describe('resolveStoragePath — 用户级', () => {
    it('应使用默认路径生成用户级存储路径', () => {
      const config: StorageConfig = {
        location: 'user',
        projectName: 'my-project',
      };

      const result = resolveStoragePath(config);
      const expected = join(homedir(), '.claude/skills/e2e', 'my-project');

      expect(result).toBe(expected);
    });

    it('应支持自定义用户级路径前缀', () => {
      const customPath = '/custom/skills/path';
      const config: StorageConfig = {
        location: 'user',
        userPath: customPath,
        projectName: 'demo-app',
      };

      const result = resolveStoragePath(config);

      expect(result).toBe(join(customPath, 'demo-app'));
    });

    it('未指定 projectName 时应使用 default 作为子目录名', () => {
      const config: StorageConfig = {
        location: 'user',
      };

      const result = resolveStoragePath(config);
      const expected = join(homedir(), '.claude/skills/e2e', 'default');

      expect(result).toBe(expected);
    });
  });
});
