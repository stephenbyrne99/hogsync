import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationError } from '../src/errors';
import {
  validateConfig,
  validateDirectoryPath,
  validateFileSize,
  validateFlagSchema,
  validatePath,
} from '../src/validation';

const TEST_DIR = join(process.cwd(), 'test-validation-temp');

describe('Path Validation', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should allow valid relative paths', () => {
    const result = validatePath('config.js', TEST_DIR);
    expect(result).toBe(join(TEST_DIR, 'config.js'));
  });

  test('should allow valid absolute paths within base directory', () => {
    const testFile = join(TEST_DIR, 'test.js');
    const result = validatePath(testFile, TEST_DIR);
    expect(result).toBe(testFile);
  });

  test('should reject path traversal attempts with ../', () => {
    expect(() => {
      validatePath('../../../etc/passwd', TEST_DIR);
    }).toThrow(ValidationError);
  });

  test('should reject path traversal attempts with absolute paths outside base', () => {
    expect(() => {
      validatePath('/etc/passwd', TEST_DIR);
    }).toThrow(ValidationError);
  });

  test('should reject paths with null bytes', () => {
    expect(() => {
      validatePath('config\0.js', TEST_DIR);
    }).toThrow(ValidationError);
  });

  test('should reject empty or invalid paths', () => {
    expect(() => {
      validatePath('', TEST_DIR);
    }).toThrow(ValidationError);

    expect(() => {
      validatePath(null as unknown as string, TEST_DIR);
    }).toThrow(ValidationError);
  });

  test('should handle complex path traversal attempts', () => {
    const maliciousPaths = [
      'config/../../../etc/passwd',
      './config/../../etc/passwd',
      'config/./../../etc/passwd',
    ];

    for (const path of maliciousPaths) {
      expect(() => {
        validatePath(path, TEST_DIR);
      }).toThrow(ValidationError);
    }
  });
});

describe('Directory Path Validation', () => {
  test('should validate directory paths using same logic as file paths', () => {
    const result = validateDirectoryPath('flags', TEST_DIR);
    expect(result).toBe(join(TEST_DIR, 'flags'));
  });

  test('should reject directory traversal attempts', () => {
    expect(() => {
      validateDirectoryPath('../../../etc', TEST_DIR);
    }).toThrow(ValidationError);
  });
});

describe('Flag Schema Validation', () => {
  test('should accept valid flag configuration', () => {
    const validFlag = {
      key: 'dark-mode',
      name: 'Dark Mode Toggle',
      active: true,
      description: 'Enable dark theme for the application',
    };

    const result = validateFlagSchema(validFlag);
    expect(result).toEqual(validFlag);
  });

  test('should reject flag missing required fields', () => {
    const invalidFlags = [
      { name: 'Test', active: true }, // missing key
      { key: 'test', active: true }, // missing name
      { key: 'test', name: 'Test' }, // missing active
      {}, // missing all required fields
    ];

    for (const flag of invalidFlags) {
      expect(() => {
        validateFlagSchema(flag);
      }).toThrow(ValidationError);
    }
  });

  test('should validate flag key format', () => {
    const invalidKeys = [
      'UPPERCASE', // uppercase not allowed
      'with spaces', // spaces not allowed
      'with_underscores', // underscores not allowed
      '-leading-dash', // leading dash not allowed
      'trailing-dash-', // trailing dash not allowed
      'special@chars', // special characters not allowed
      '', // empty key
      'a'.repeat(101), // too long
    ];

    for (const key of invalidKeys) {
      expect(() => {
        validateFlagSchema({
          key,
          name: 'Test Flag',
          active: true,
        });
      }).toThrow(ValidationError);
    }
  });

  test('should accept valid flag key formats', () => {
    const validKeys = [
      'a', // single character
      'ab', // two characters
      'dark-mode', // kebab-case
      'feature-123', // with numbers
      'a1b2c3', // alphanumeric
    ];

    for (const key of validKeys) {
      expect(() => {
        validateFlagSchema({
          key,
          name: 'Test Flag',
          active: true,
        });
      }).not.toThrow();
    }
  });

  test('should validate flag name constraints', () => {
    expect(() => {
      validateFlagSchema({
        key: 'test',
        name: '', // empty name
        active: true,
      });
    }).toThrow(ValidationError);

    expect(() => {
      validateFlagSchema({
        key: 'test',
        name: 'a'.repeat(201), // too long
        active: true,
      });
    }).toThrow(ValidationError);
  });

  test('should validate active field type', () => {
    const invalidActiveValues = [
      'true', // string instead of boolean
      1, // number instead of boolean
      null, // null instead of boolean
      undefined, // undefined instead of boolean
    ];

    for (const active of invalidActiveValues) {
      expect(() => {
        validateFlagSchema({
          key: 'test',
          name: 'Test Flag',
          active,
        });
      }).toThrow(ValidationError);
    }
  });

  test('should validate optional description field', () => {
    expect(() => {
      validateFlagSchema({
        key: 'test',
        name: 'Test Flag',
        active: true,
        description: 'a'.repeat(1001), // too long
      });
    }).toThrow(ValidationError);

    // Valid description should pass
    expect(() => {
      validateFlagSchema({
        key: 'test',
        name: 'Test Flag',
        active: true,
        description: 'Valid description',
      });
    }).not.toThrow();
  });

  test('should validate complex filter configurations', () => {
    const validFlag = {
      key: 'complex-flag',
      name: 'Complex Flag',
      active: true,
      filters: {
        groups: [
          {
            properties: [
              {
                key: 'email',
                value: '@company.com',
                operator: 'icontains',
                type: 'person',
              },
            ],
            rollout_percentage: 50,
          },
        ],
      },
    };

    expect(() => {
      validateFlagSchema(validFlag);
    }).not.toThrow();
  });

  test('should validate rollout percentage constraints', () => {
    expect(() => {
      validateFlagSchema({
        key: 'test',
        name: 'Test Flag',
        active: true,
        filters: {
          groups: [
            {
              rollout_percentage: 101, // invalid percentage
            },
          ],
        },
      });
    }).toThrow(ValidationError);

    expect(() => {
      validateFlagSchema({
        key: 'test',
        name: 'Test Flag',
        active: true,
        filters: {
          groups: [
            {
              rollout_percentage: -1, // invalid percentage
            },
          ],
        },
      });
    }).toThrow(ValidationError);
  });

  test('should reject unknown properties when additionalProperties is false', () => {
    expect(() => {
      validateFlagSchema({
        key: 'test',
        name: 'Test Flag',
        active: true,
        unknownProperty: 'should not be allowed',
      });
    }).toThrow(ValidationError);
  });
});

describe('File Size Validation', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should accept files within size limit', async () => {
    const testFile = join(TEST_DIR, 'small.json');
    writeFileSync(testFile, JSON.stringify({ key: 'test', name: 'Test', active: true }));

    await expect(validateFileSize(testFile, 1024)).resolves.toBeUndefined();
  });

  test('should reject files exceeding size limit', async () => {
    const testFile = join(TEST_DIR, 'large.json');
    const largeContent = 'x'.repeat(2000); // 2KB content
    writeFileSync(testFile, largeContent);

    await expect(validateFileSize(testFile, 1000)).rejects.toThrow(ValidationError);
  });

  test('should handle non-existent files gracefully', async () => {
    const nonExistentFile = join(TEST_DIR, 'does-not-exist.json');

    await expect(validateFileSize(nonExistentFile)).rejects.toThrow(ValidationError);
  });
});

describe('Config Validation', () => {
  test('should accept valid configuration', () => {
    const validConfig = {
      flagsDir: 'feature-flags',
      outputFile: 'src/generated/feature-flags.ts',
      posthog: {
        host: 'https://app.posthog.com',
        projectId: 'test-project',
        apiToken: 'test-token',
      },
    };

    expect(() => {
      validateConfig(validConfig);
    }).not.toThrow();
  });

  test('should reject invalid configuration structure', () => {
    const invalidConfigs = [null, undefined, 'string', 123, [], {}];

    for (const config of invalidConfigs) {
      expect(() => {
        validateConfig(config);
      }).toThrow(ValidationError);
    }
  });

  test('should validate required configuration fields', () => {
    expect(() => {
      validateConfig({
        // missing flagsDir
        outputFile: 'output.ts',
        posthog: { host: 'test', projectId: 'test', apiToken: 'test' },
      });
    }).toThrow(ValidationError);

    expect(() => {
      validateConfig({
        flagsDir: 'flags',
        // missing outputFile
        posthog: { host: 'test', projectId: 'test', apiToken: 'test' },
      });
    }).toThrow(ValidationError);

    expect(() => {
      validateConfig({
        flagsDir: 'flags',
        outputFile: 'output.ts',
        // missing posthog
      });
    }).toThrow(ValidationError);
  });

  test('should validate PostHog configuration structure', () => {
    expect(() => {
      validateConfig({
        flagsDir: 'flags',
        outputFile: 'output.ts',
        posthog: {
          // missing host
          projectId: 'test',
          apiToken: 'test',
        },
      });
    }).toThrow(ValidationError);

    expect(() => {
      validateConfig({
        flagsDir: 'flags',
        outputFile: 'output.ts',
        posthog: 'invalid', // should be object
      });
    }).toThrow(ValidationError);
  });

  test('should validate field types', () => {
    expect(() => {
      validateConfig({
        flagsDir: 123, // should be string
        outputFile: 'output.ts',
        posthog: { host: 'test', projectId: 'test', apiToken: 'test' },
      });
    }).toThrow(ValidationError);

    expect(() => {
      validateConfig({
        flagsDir: 'flags',
        outputFile: 'output.ts',
        posthog: {
          host: 'test',
          projectId: 123, // should be string
          apiToken: 'test',
        },
      });
    }).toThrow(ValidationError);
  });
});

describe('Error Context and Messages', () => {
  test('should provide detailed error context for path validation', () => {
    try {
      validatePath('../../../etc/passwd', TEST_DIR);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.context).toBeDefined();
      expect(validationError.context?.filePath).toBe('../../../etc/passwd');
      expect(validationError.context?.basePath).toBe(TEST_DIR);
    }
  });

  test('should provide detailed error context for schema validation', () => {
    try {
      validateFlagSchema({ key: 'INVALID', name: 'Test', active: true }, 'test.json');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.context?.fileName).toBe('test.json');
      expect(validationError.validationErrors.length).toBeGreaterThan(0);
    }
  });
});
