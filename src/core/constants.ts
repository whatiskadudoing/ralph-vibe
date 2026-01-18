/**
 * @module core/constants
 *
 * Ralph CLI constants.
 */

/**
 * Exit signal that Claude outputs when spec interview is complete.
 * This is shown in Claude's output to indicate completion.
 */
export const RALPH_EXIT_SIGNAL = '[[RALPH_SPEC_COMPLETE_x7k9m2]]';

/**
 * Marker file name that Claude creates when spec interview is complete.
 * Ralph CLI watches for this file and terminates Claude when it appears.
 */
export const RALPH_DONE_MARKER = '.ralph-spec-done';
