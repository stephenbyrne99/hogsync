/**
 * @fileoverview Security validation utilities for path traversal protection and JSON schema validation.
 */

import { normalize, relative, resolve } from 'node:path';
import { ValidationError } from './errors';
import type { FlagConfig } from './types';

/**
 * JSON schema for feature flag validation
 */
const FLAG_SCHEMA = {
  type: 'object',
  required: ['key', 'name', 'active'],
  properties: {
    key: {
      type: 'string',
      pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$',
      minLength: 1,
      maxLength: 100,
      description:
        'Flag key must be lowercase alphanumeric with hyphens, no leading/trailing hyphens',
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Flag name must be a non-empty string',
    },
    active: {
      type: 'boolean',
      description: 'Flag active status must be a boolean',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      description: 'Optional description with reasonable length limit',
    },
    filters: {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              properties: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['key', 'value'],
                  properties: {
                    key: { type: 'string', minLength: 1 },
                    value: {
                      oneOf: [
                        { type: 'string' },
                        { type: 'number' },
                        { type: 'boolean' },
                        { type: 'array', items: { type: 'string' } },
                      ],
                    },
                    operator: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['person', 'event', 'group'],
                    },
                  },
                },
              },
              rollout_percentage: {
                type: 'number',
                minimum: 0,
                maximum: 100,
              },
              variant: { type: 'string' },
            },
          },
        },
        multivariate: {
          type: 'object',
          properties: {
            variants: {
              type: 'array',
              items: {
                type: 'object',
                required: ['key', 'rollout_percentage'],
                properties: {
                  key: { type: 'string', minLength: 1 },
                  name: { type: 'string' },
                  rollout_percentage: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                  },
                },
              },
            },
          },
        },
        payloads: {
          type: 'object',
        },
      },
    },
    ensure_experience_continues: {
      type: 'boolean',
    },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'rollout_percentage'],
        properties: {
          key: { type: 'string', minLength: 1 },
          name: { type: 'string' },
          rollout_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
          },
        },
      },
    },
  },
  additionalProperties: false,
} as const;

/**
 * Validates a file path to prevent directory traversal attacks.
 *
 * @param filePath - The file path to validate
 * @param basePath - The base directory that the file should be within (defaults to cwd)
 * @returns The normalized, safe file path
 * @throws {ValidationError} If the path is unsafe
 *
 * @example
 * ```typescript
 * const safePath = validatePath('config/flags.json');
 * const unsafePath = validatePath('../../../etc/passwd'); // throws ValidationError
 * ```
 */
export function validatePath(filePath: string, basePath: string = process.cwd()): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError('Invalid file path: path must be a non-empty string', [], {
      filePath,
      basePath,
    });
  }

  // Normalize the paths to handle different separators and resolve . and ..
  const normalizedPath = normalize(filePath);
  const resolvedPath = resolve(basePath, normalizedPath);
  const resolvedBase = resolve(basePath);

  // Check if the resolved path is within the base directory
  const relativePath = relative(resolvedBase, resolvedPath);

  if (relativePath.startsWith('..') || resolve(resolvedBase, relativePath) !== resolvedPath) {
    throw new ValidationError(
      'Path traversal detected: file path must be within the base directory',
      [`Path "${filePath}" resolves outside base directory "${basePath}"`],
      {
        filePath,
        basePath,
        resolvedPath,
        relativePath,
      }
    );
  }

  // Additional security checks
  if (normalizedPath.includes('\0')) {
    throw new ValidationError('Invalid file path: null bytes not allowed', [], {
      filePath,
      basePath,
    });
  }

  return resolvedPath;
}

/**
 * Validates a directory path to ensure it's safe and within bounds.
 *
 * @param dirPath - The directory path to validate
 * @param basePath - The base directory that the path should be within (defaults to cwd)
 * @returns The normalized, safe directory path
 * @throws {ValidationError} If the path is unsafe
 */
export function validateDirectoryPath(dirPath: string, basePath: string = process.cwd()): string {
  return validatePath(dirPath, basePath);
}

/**
 * Simple JSON schema validator for feature flags.
 *
 * @param data - The data to validate
 * @param schema - The schema to validate against
 * @returns Array of validation errors (empty if valid)
 */
function validateSchema(data: unknown, schema: typeof FLAG_SCHEMA): string[] {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push('Data must be an object');
    return errors;
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  for (const field of schema.required) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate each property
  for (const [key, value] of Object.entries(obj)) {
    const propSchema = schema.properties[key as keyof typeof schema.properties];
    if (!propSchema) {
      if (!schema.additionalProperties) {
        errors.push(`Unknown property: ${key}`);
      }
      continue;
    }

    const propErrors = validateProperty(value, propSchema, key);
    errors.push(...propErrors);
  }

  return errors;
}

/**
 * Validates a single property against its schema definition.
 */
function validateProperty(
  value: unknown,
  // biome-ignore lint/suspicious/noExplicitAny: Schema validation requires flexible typing for JSON schema objects
  schema: Record<string, any>,
  propertyName: string
): string[] {
  const errors: string[] = [];

  // Type validation
  if (schema.type) {
    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push(`${propertyName} must be a string`);
      return errors;
    }
    if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`${propertyName} must be a number`);
      return errors;
    }
    if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${propertyName} must be a boolean`);
      return errors;
    }
    if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push(`${propertyName} must be an array`);
      return errors;
    }
    if (
      schema.type === 'object' &&
      (typeof value !== 'object' || value === null || Array.isArray(value))
    ) {
      errors.push(`${propertyName} must be an object`);
      return errors;
    }
  }

  // String validations
  if (typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${propertyName} must be at least ${schema.minLength} characters long`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`${propertyName} must be no more than ${schema.maxLength} characters long`);
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(
          `${propertyName} format is invalid: ${schema.description || 'must match pattern'}`
        );
      }
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${propertyName} must be at least ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${propertyName} must be no more than ${schema.maximum}`);
    }
  }

  // Array validations
  if (Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      const itemErrors = validateProperty(value[i], schema.items, `${propertyName}[${i}]`);
      errors.push(...itemErrors);
    }
  }

  // Object validations
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && schema.properties) {
    const obj = value as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      const propSchema = schema.properties[key];
      if (propSchema) {
        const propErrors = validateProperty(val, propSchema, `${propertyName}.${key}`);
        errors.push(...propErrors);
      }
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${propertyName} must be one of: ${schema.enum.join(', ')}`);
  }

  return errors;
}

/**
 * Validates a feature flag configuration against the schema.
 *
 * @param flagData - The flag data to validate
 * @param fileName - Optional file name for better error messages
 * @returns The validated flag data
 * @throws {ValidationError} If validation fails
 *
 * @example
 * ```typescript
 * const validFlag = validateFlagSchema({
 *   key: 'dark-mode',
 *   name: 'Dark Mode Toggle',
 *   active: true
 * });
 * ```
 */
export function validateFlagSchema(flagData: unknown, fileName?: string): FlagConfig {
  const errors = validateSchema(flagData, FLAG_SCHEMA);

  if (errors.length > 0) {
    const context = fileName ? { fileName } : undefined;
    throw new ValidationError(
      `Feature flag validation failed${fileName ? ` in ${fileName}` : ''}`,
      errors,
      context
    );
  }

  return flagData as FlagConfig;
}

/**
 * Validates that a file size is within acceptable limits.
 *
 * @param filePath - Path to the file to check
 * @param maxSizeBytes - Maximum allowed file size in bytes (default: 1MB)
 * @throws {ValidationError} If file is too large
 */
export async function validateFileSize(
  filePath: string,
  maxSizeBytes: number = 1024 * 1024
): Promise<void> {
  try {
    const file = Bun.file(filePath);

    // Check if file exists by trying to get its size
    const exists = await file.exists();
    if (!exists) {
      throw new ValidationError('File does not exist', [`File not found: ${filePath}`], {
        filePath,
      });
    }

    const stats = file.size;

    if (stats > maxSizeBytes) {
      throw new ValidationError(
        'File size exceeds maximum allowed size',
        [`File size: ${stats} bytes, maximum: ${maxSizeBytes} bytes`],
        { filePath, fileSize: stats, maxSize: maxSizeBytes }
      );
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      'Failed to check file size',
      [error instanceof Error ? error.message : String(error)],
      { filePath }
    );
  }
}

/**
 * Validates that a configuration object has required security properties.
 *
 * @param config - Configuration object to validate
 * @throws {ValidationError} If configuration is invalid
 */
export function validateConfig(config: unknown): void {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    throw new ValidationError('Configuration must be an object', [], { config });
  }

  const configObj = config as Record<string, unknown>;

  if (!configObj.flagsDir || typeof configObj.flagsDir !== 'string') {
    errors.push('flagsDir must be a non-empty string');
  }

  if (!configObj.outputFile || typeof configObj.outputFile !== 'string') {
    errors.push('outputFile must be a non-empty string');
  }

  if (!configObj.posthog || typeof configObj.posthog !== 'object') {
    errors.push('posthog configuration must be an object');
  } else {
    const posthogObj = configObj.posthog as Record<string, unknown>;
    if (!posthogObj.host || typeof posthogObj.host !== 'string') {
      errors.push('posthog.host must be a non-empty string');
    }
    if (posthogObj.projectId !== undefined && typeof posthogObj.projectId !== 'string') {
      errors.push('posthog.projectId must be a string');
    }
    if (posthogObj.apiToken !== undefined && typeof posthogObj.apiToken !== 'string') {
      errors.push('posthog.apiToken must be a string');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Configuration validation failed', errors, { config });
  }
}
