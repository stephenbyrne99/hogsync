/**
 * @fileoverview Custom error types for Hogsync with proper error handling and context.
 */

/**
 * Base error class for all Hogsync-related errors.
 * Provides consistent error handling and context information.
 */
export abstract class HogsyncError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** Additional context information */
  public readonly context?: Record<string, unknown>;
  /** Timestamp when the error occurred */
  public readonly timestamp: Date;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a formatted error message with context information.
   */
  public getFormattedMessage(): string {
    let message = `[${this.code}] ${this.message}`;

    if (this.context) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
      message += ` (${contextStr})`;
    }

    return message;
  }

  /**
   * Returns error details as a structured object.
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when configuration loading or validation fails.
 */
export class ConfigError extends HogsyncError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context);
  }
}

/**
 * Error thrown when feature flag file operations fail.
 */
export class FlagFileError extends HogsyncError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'FLAG_FILE_ERROR', context);
  }
}

/**
 * Error thrown when TypeScript generation fails.
 */
export class GenerationError extends HogsyncError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GENERATION_ERROR', context);
  }
}

/**
 * Error thrown when PostHog API operations fail.
 */
export class PostHogApiError extends HogsyncError {
  /** HTTP status code from the API response */
  public readonly statusCode?: number;
  /** Raw API response body */
  public readonly responseBody?: string;

  constructor(
    message: string,
    context?: Record<string, unknown>,
    statusCode?: number,
    responseBody?: string
  ) {
    super(message, 'POSTHOG_API_ERROR', context);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      responseBody: this.responseBody,
    };
  }
}

/**
 * Error thrown when feature flag validation fails.
 */
export class ValidationError extends HogsyncError {
  /** Array of specific validation failures */
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[], context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.validationErrors = validationErrors;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Error thrown when file system operations fail.
 */
export class FileSystemError extends HogsyncError {
  /** File system operation that failed */
  public readonly operation: 'read' | 'write' | 'create' | 'delete' | 'access';
  /** Path that caused the error */
  public readonly path: string;

  constructor(
    message: string,
    operation: 'read' | 'write' | 'create' | 'delete' | 'access',
    path: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'FILESYSTEM_ERROR', context);
    this.operation = operation;
    this.path = path;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      operation: this.operation,
      path: this.path,
    };
  }
}

/**
 * Error thrown when CLI command execution fails.
 */
export class CliError extends HogsyncError {
  /** CLI command that failed */
  public readonly command: string;
  /** Exit code for the CLI process */
  public readonly exitCode: number;

  constructor(message: string, command: string, exitCode = 1, context?: Record<string, unknown>) {
    super(message, 'CLI_ERROR', context);
    this.command = command;
    this.exitCode = exitCode;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      command: this.command,
      exitCode: this.exitCode,
    };
  }
}

/**
 * Handles errors consistently across the application.
 * Logs the error and optionally exits the process.
 */
export function handleError(error: unknown, shouldExit = false): void {
  if (error instanceof HogsyncError) {
    console.error(`❌ ${error.getFormattedMessage()}`);

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error('Error details:', JSON.stringify(error.toJSON(), null, 2));
    }
  } else if (error instanceof Error) {
    console.error(`❌ Unexpected error: ${error.message}`);

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }
  } else {
    console.error(`❌ Unknown error: ${String(error)}`);
  }

  if (shouldExit) {
    const exitCode = error instanceof CliError ? error.exitCode : 1;
    process.exit(exitCode);
  }
}

/**
 * Wraps async functions with error handling.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  shouldExit = false
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, shouldExit);
    return undefined;
  }
}

/**
 * Creates a validation error from multiple validation failures.
 */
export function createValidationError(
  failures: string[],
  context?: Record<string, unknown>
): ValidationError {
  const message = `Validation failed with ${failures.length} error(s)`;
  return new ValidationError(message, failures, context);
}

/**
 * Creates a PostHog API error from a fetch response.
 */
export async function createPostHogApiError(
  response: Response,
  context?: Record<string, unknown>
): Promise<PostHogApiError> {
  const responseBody = await response.text().catch(() => 'Unable to read response body');
  const message = `PostHog API request failed: ${response.status} ${response.statusText}`;

  return new PostHogApiError(message, context, response.status, responseBody);
}
