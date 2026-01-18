/**
 * @module services
 *
 * Services layer for I/O operations.
 * All external interactions (file system, CLI calls, git) go through here.
 * Services are designed to be mockable for testing.
 */

export * from './file_service.ts';
export * from './claude_service.ts';
export * from './git_service.ts';
export * from './project_service.ts';
