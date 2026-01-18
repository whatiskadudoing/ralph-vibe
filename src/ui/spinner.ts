/**
 * @module ui/spinner
 *
 * Terminal spinner for loading states.
 */

import { SPINNER_DOTS, SPINNER_LINE } from './symbols.ts';
import { error, muted, primary, success } from './colors.ts';
import { CHECK, CROSS } from './symbols.ts';

export type SpinnerStyle = 'dots' | 'line';

export interface SpinnerOptions {
  /** The text to display next to the spinner. */
  readonly text?: string;
  /** Spinner animation style. Default: 'dots'. */
  readonly style?: SpinnerStyle;
  /** Animation speed in milliseconds. Default: 80. */
  readonly interval?: number;
}

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
}

const DEFAULT_OPTIONS: Required<SpinnerOptions> = {
  text: '',
  style: 'dots',
  interval: 80,
};

/**
 * Gets the frames for a spinner style.
 */
function getFrames(style: SpinnerStyle): readonly string[] {
  return style === 'dots' ? SPINNER_DOTS : SPINNER_LINE;
}

/**
 * Creates a terminal spinner.
 *
 * Note: This has side effects (writes to stdout), but is designed
 * to be easily mockable for testing.
 */
export function createSpinner(options: SpinnerOptions = {}): Spinner {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const frames = getFrames(opts.style);

  let frameIndex = 0;
  let text = opts.text;
  let intervalId: number | undefined;
  let running = false;

  const clearLine = (): void => {
    Deno.stdout.writeSync(new TextEncoder().encode('\r\x1b[K'));
  };

  const render = (): void => {
    const frame = primary(frames[frameIndex] ?? '');
    const output = text ? `${frame} ${text}` : frame;
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
    const finalText = newText ?? text;
    const output = finalText ? `${success(CHECK)} ${finalText}` : success(CHECK);
    console.log(output);
  };

  const fail = (newText?: string): void => {
    stopAnimation();
    clearLine();
    const finalText = newText ?? text;
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

  return {
    start,
    succeed,
    fail,
    stop,
    update,
    isRunning,
  };
}

/**
 * Wraps an async operation with a spinner.
 * Shows spinner while the operation is running, then success/fail on completion.
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  options?: Omit<SpinnerOptions, 'text'>,
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
