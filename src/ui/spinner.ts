/**
 * @module ui/spinner
 *
 * Enhanced terminal spinner for loading states.
 */

import { SPINNER_DOTS, SPINNER_LINE, SPINNER_BOUNCE, CHECK, CROSS } from './symbols.ts';
import { error, muted, primary, success, cyan } from './colors.ts';
import { theme, type ColorFn } from './theme.ts';

// ============================================================================
// Spinner Types
// ============================================================================

/** Available spinner animation styles */
export type SpinnerStyle = 'dots' | 'line' | 'bounce' | 'circle' | 'arrow';

/** Spinner configuration */
export interface SpinnerConfig {
  /** The text to display next to the spinner */
  readonly text?: string;
  /** Spinner animation style. Default: 'dots' */
  readonly style?: SpinnerStyle;
  /** Animation speed in milliseconds. Default: 80 */
  readonly interval?: number;
  /** Color function for the spinner. Default: cyan */
  readonly color?: ColorFn;

  /** Spinner position relative to text. Default: 'left' */
  readonly position?: 'left' | 'right';

  /** Custom text to show on succeed() */
  readonly onSuccess?: string;
  /** Custom text to show on fail() */
  readonly onFail?: string;
}

/** Legacy options interface for backward compatibility */
export interface SpinnerOptions {
  /** The text to display next to the spinner. */
  readonly text?: string;
  /** Spinner animation style. Default: 'dots'. */
  readonly style?: SpinnerStyle;
  /** Animation speed in milliseconds. Default: 80. */
  readonly interval?: number;
}

/** Spinner instance interface */
export interface Spinner {
  /** Starts the spinner animation. */
  readonly start: () => void;
  /** Stops the spinner and shows a success message. */
  readonly succeed: (text?: string) => void;
  /** Stops the spinner and shows an error message. */
  readonly fail: (text?: string) => void;
  /** Stops the spinner without any status. */
  readonly stop: () => void;
  /** Updates the spinner text. */
  readonly update: (text: string) => void;
  /** Whether the spinner is currently running. */
  readonly isRunning: () => boolean;
  /** Gets the current frame (for static rendering). */
  readonly getFrame: () => string;
}

// ============================================================================
// Spinner Frames
// ============================================================================

/** Spinner frames for circle style */
const SPINNER_CIRCLE: readonly string[] = ['◐', '◓', '◑', '◒'];

/** Spinner frames for arrow style */
const SPINNER_ARROW: readonly string[] = ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'];

/**
 * Gets the frames for a spinner style.
 */
function getFrames(style: SpinnerStyle): readonly string[] {
  switch (style) {
    case 'line':
      return SPINNER_LINE;
    case 'bounce':
      return SPINNER_BOUNCE;
    case 'circle':
      return SPINNER_CIRCLE;
    case 'arrow':
      return SPINNER_ARROW;
    case 'dots':
    default:
      return SPINNER_DOTS;
  }
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_CONFIG: Required<SpinnerConfig> = {
  text: '',
  style: 'dots',
  interval: 80,
  color: cyan,
  position: 'left',
  onSuccess: '',
  onFail: '',
};

// ============================================================================
// Spinner Functions
// ============================================================================

/**
 * Creates an enhanced terminal spinner.
 *
 * @example
 * const spin = createSpinner({
 *   text: 'Installing dependencies',
 *   style: 'dots',
 *   color: cyan
 * });
 *
 * spin.start();
 * // ⠋ Installing dependencies
 *
 * spin.update('Compiling TypeScript');
 * // ⠙ Compiling TypeScript
 *
 * spin.succeed('Build complete');
 * // ✓ Build complete
 *
 * spin.fail('Build failed');
 * // ✗ Build failed
 */
export function createSpinner(config: SpinnerConfig | SpinnerOptions = {}): Spinner {
  // Merge with defaults
  const opts: Required<SpinnerConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
    color: (config as SpinnerConfig).color ?? DEFAULT_CONFIG.color,
  };

  const frames = getFrames(opts.style);

  let frameIndex = 0;
  let text = opts.text;
  let intervalId: number | undefined;
  let running = false;

  const clearLine = (): void => {
    Deno.stdout.writeSync(new TextEncoder().encode('\r\x1b[K'));
  };

  const render = (): void => {
    const frame = opts.color(frames[frameIndex] ?? '');

    let output: string;
    if (opts.position === 'right' && text) {
      output = `${text} ${frame}`;
    } else if (text) {
      output = `${frame} ${text}`;
    } else {
      output = frame;
    }

    clearLine();
    Deno.stdout.writeSync(new TextEncoder().encode(output));
    frameIndex = (frameIndex + 1) % frames.length;
  };

  const stopAnimation = (): void => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
    running = false;
  };

  const start = (): void => {
    if (running) return;
    running = true;
    frameIndex = 0;
    render();
    intervalId = setInterval(render, opts.interval);
  };

  const stop = (): void => {
    stopAnimation();
    clearLine();
  };

  const succeed = (newText?: string): void => {
    stopAnimation();
    clearLine();
    const finalText = newText ?? (opts.onSuccess || text);
    const output = finalText ? `${success(CHECK)} ${finalText}` : success(CHECK);
    console.log(output);
  };

  const fail = (newText?: string): void => {
    stopAnimation();
    clearLine();
    const finalText = newText ?? (opts.onFail || text);
    const output = finalText ? `${error(CROSS)} ${finalText}` : error(CROSS);
    console.log(output);
  };

  const update = (newText: string): void => {
    text = newText;
    if (!running) {
      render();
    }
  };

  const isRunning = (): boolean => running;

  const getFrame = (): string => {
    const frame = opts.color(frames[frameIndex] ?? frames[0] ?? '');
    if (opts.position === 'right' && text) {
      return `${text} ${frame}`;
    } else if (text) {
      return `${frame} ${text}`;
    }
    return frame;
  };

  return {
    start,
    succeed,
    fail,
    stop,
    update,
    isRunning,
    getFrame,
  };
}

/**
 * Wraps an async operation with a spinner.
 * Shows spinner while the operation is running, then success/fail on completion.
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  options?: Omit<SpinnerConfig, 'text'>,
): Promise<T> {
  const spinner = createSpinner({ ...options, text });
  spinner.start();

  try {
    const result = await operation();
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}

/**
 * Creates a static status line (no animation).
 * Useful for logging completed steps.
 */
export function statusLine(
  status: 'success' | 'error' | 'pending' | 'info',
  text: string,
): string {
  switch (status) {
    case 'success':
      return `${success(CHECK)} ${text}`;
    case 'error':
      return `${error(CROSS)} ${text}`;
    case 'pending':
      return `${muted('○')} ${muted(text)}`;
    case 'info':
      return `${primary('▶')} ${text}`;
  }
}

/**
 * Gets a single spinner frame for static rendering.
 * Useful for rendering in non-animated contexts.
 */
export function spinnerFrame(style: SpinnerStyle = 'dots', color?: ColorFn): string {
  const frames = getFrames(style);
  const colorFn = color ?? cyan;
  return colorFn(frames[0] ?? '');
}
