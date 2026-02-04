/**
 * @module components/Loading
 *
 * Loading states and witty loading phrase components.
 * Inspired by Gemini CLI's loading phrases feature.
 */

import React, { useEffect, useState } from 'react';
import { Box, Spinner, Text } from '@ink/mod.ts';

// ============================================================================
// DEFAULT WITTY PHRASES
// ============================================================================

export const DEFAULT_LOADING_PHRASES = [
  'Thinking...',
  'Processing your request...',
  'Crunching the numbers...',
  'Consulting the oracle...',
  'Brewing some magic...',
  'Analyzing possibilities...',
  'Connecting the dots...',
  'Loading awesomeness...',
  'Preparing something special...',
  'Working on it...',
  'Almost there...',
  'Doing the thing...',
  'Making it happen...',
  'Computing brilliance...',
  'Gathering insights...',
];

export const WITTY_PHRASES = [
  'Summoning digital elves...',
  'Convincing the bits to cooperate...',
  'Teaching electrons to dance...',
  'Warming up the flux capacitor...',
  'Consulting the AI council...',
  'Bribing the algorithms...',
  'Herding quantum cats...',
  'Negotiating with the cloud...',
  'Polishing the pixels...',
  'Feeding the neural networks...',
  'Untangling the spaghetti code...',
  'Asking nicely...',
  'Performing digital magic...',
  'Channeling inner wisdom...',
  'Reticulating splines...',
  'Generating witty response...',
  'Calibrating the coffee maker...',
  'Counting backwards from infinity...',
  'Dividing by zero safely...',
  'Reversing the polarity...',
];

export const TECHNICAL_PHRASES = [
  'Initializing neural pathways...',
  'Optimizing token generation...',
  'Running inference pipeline...',
  'Loading model weights...',
  'Computing attention scores...',
  'Processing embeddings...',
  'Generating response tokens...',
  'Executing forward pass...',
  'Applying context window...',
  'Tokenizing input...',
];

// ============================================================================
// LOADING PHRASE - Single rotating phrase with spinner
// ============================================================================

export interface LoadingPhraseProps {
  /** Custom phrases (defaults to witty phrases) */
  phrases?: string[];
  /** Interval between phrase changes (ms) */
  interval?: number;
  /** Spinner type */
  spinnerType?: 'dots' | 'line' | 'circle' | 'bounce' | 'pulse';
  /** Color */
  color?: string;
  /** Show spinner */
  showSpinner?: boolean;
  /** Static phrase (no rotation) */
  staticPhrase?: string;
}

export function LoadingPhrase({
  phrases = WITTY_PHRASES,
  interval = 3000,
  spinnerType = 'dots',
  color = 'cyan',
  showSpinner = true,
  staticPhrase,
}: LoadingPhraseProps): React.ReactElement {
  const [phraseIndex, setPhraseIndex] = useState(
    Math.floor(Math.random() * phrases.length),
  );

  useEffect(() => {
    if (staticPhrase) return undefined;

    const timer = setInterval(() => {
      setPhraseIndex((prev: number) => {
        let next = Math.floor(Math.random() * phrases.length);
        // Avoid repeating the same phrase
        while (next === prev && phrases.length > 1) {
          next = Math.floor(Math.random() * phrases.length);
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [interval, phrases.length, staticPhrase]);

  const displayPhrase = staticPhrase || phrases[phraseIndex];

  return (
    <Box>
      {showSpinner && (
        <Box marginRight={1}>
          <Spinner type={spinnerType} color={color} />
        </Box>
      )}
      <Text color={color}>{displayPhrase}</Text>
    </Box>
  );
}

// ============================================================================
// LOADING STATE - Complete loading UI with progress
// ============================================================================

export interface LoadingStateProps {
  /** Title */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Progress percentage (0-100, undefined for indeterminate) */
  progress?: number;
  /** Current step */
  step?: string;
  /** Total steps count */
  totalSteps?: number;
  /** Current step number */
  currentStep?: number;
  /** Use witty phrases */
  witty?: boolean;
  /** Custom phrases */
  phrases?: string[];
  /** Color */
  color?: string;
  /** Spinner type */
  spinnerType?: 'dots' | 'line' | 'circle' | 'bounce' | 'pulse';
  /** Bordered */
  bordered?: boolean;
  /** Width */
  width?: number;
}

export function LoadingState({
  title,
  subtitle,
  progress,
  step,
  totalSteps,
  currentStep,
  witty = false,
  phrases,
  color = 'cyan',
  spinnerType = 'dots',
  bordered = false,
  width,
}: LoadingStateProps): React.ReactElement {
  const content = (
    <Box flexDirection='column' width={width}>
      {/* Title with spinner */}
      <Box>
        <Spinner type={spinnerType} color={color} />
        <Text></Text>
        {title ? <Text bold color={color}>{title}</Text> : witty
          ? (
            <LoadingPhrase
              phrases={phrases || WITTY_PHRASES}
              color={color}
              showSpinner={false}
            />
          )
          : <Text color={color}>Loading...</Text>}
      </Box>

      {/* Subtitle */}
      {subtitle && (
        <Box marginLeft={2}>
          <Text dimColor>{subtitle}</Text>
        </Box>
      )}

      {/* Step indicator */}
      {step && (
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>
            {currentStep && totalSteps && `[${currentStep}/${totalSteps}] `}
            {step}
          </Text>
        </Box>
      )}

      {/* Progress bar */}
      {progress !== undefined && (
        <Box marginLeft={2} marginTop={1}>
          <ProgressIndicator progress={progress} color={color} width={30} />
        </Box>
      )}
    </Box>
  );

  if (bordered) {
    return (
      <Box
        borderStyle='round'
        borderColor={color}
        paddingX={2}
        paddingY={1}
      >
        {content}
      </Box>
    );
  }

  return content;
}

// ============================================================================
// PROGRESS INDICATOR - Simple inline progress
// ============================================================================

export interface ProgressIndicatorProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Width */
  width?: number;
  /** Color */
  color?: string;
  /** Show percentage */
  showPercent?: boolean;
}

export function ProgressIndicator({
  progress,
  width = 20,
  color = 'cyan',
  showPercent = true,
}: ProgressIndicatorProps): React.ReactElement {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      {showPercent && <Text dimColor>{Math.round(progress)}%</Text>}
    </Box>
  );
}

// ============================================================================
// STEP LOADER - Multi-step loading indicator
// ============================================================================

export interface StepLoaderStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

export interface StepLoaderProps {
  /** Steps */
  steps: StepLoaderStep[];
  /** Title */
  title?: string;
  /** Color scheme */
  colors?: {
    pending?: string;
    loading?: string;
    complete?: string;
    error?: string;
  };
}

const DEFAULT_STEP_COLORS = {
  pending: 'gray',
  loading: 'cyan',
  complete: 'green',
  error: 'red',
};

export function StepLoader({
  steps,
  title,
  colors = DEFAULT_STEP_COLORS,
}: StepLoaderProps): React.ReactElement {
  const mergedColors = { ...DEFAULT_STEP_COLORS, ...colors };

  const getIcon = (status: StepLoaderStep['status']) => {
    switch (status) {
      case 'complete':
        return '✓';
      case 'error':
        return '✗';
      case 'loading':
        return '◐';
      default:
        return '○';
    }
  };

  return (
    <Box flexDirection='column'>
      {title && (
        <Box marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      {steps.map((step) => (
        <Box key={step.id}>
          {step.status === 'loading'
            ? <Spinner type='dots' color={mergedColors.loading} />
            : <Text color={mergedColors[step.status]}>{getIcon(step.status)}</Text>}
          <Text
            color={step.status === 'loading' ? mergedColors.loading : undefined}
            dimColor={step.status === 'pending'}
          >
            {' '}
            {step.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// SKELETON LOADER - Loading placeholder
// ============================================================================

export interface SkeletonLoaderProps {
  /** Number of lines */
  lines?: number;
  /** Width of each line (can be array for varied widths) */
  width?: number | number[];
  /** Animation */
  animate?: boolean;
  /** Gap between lines */
  gap?: number;
}

export function SkeletonLoader({
  lines = 3,
  width = 40,
  animate = true,
  gap = 0,
}: SkeletonLoaderProps): React.ReactElement {
  const [phase, setPhase] = useState(0);
  const chars = ['░', '▒', '░'];

  useEffect(() => {
    if (!animate) return undefined;

    const timer = setInterval(() => {
      setPhase((prev: number) => (prev + 1) % chars.length);
    }, 300);
    return () => clearInterval(timer);
  }, [animate, chars.length]);

  const widths = Array.isArray(width) ? width : Array(lines).fill(width);

  return (
    <Box flexDirection='column' gap={gap}>
      {Array.from({ length: lines }).map((_, i) => {
        const lineWidth = widths[i] ?? widths[0] ?? 40;
        const charToRepeat = chars[phase] ?? '░';
        return (
          <Text key={i} dimColor>
            {charToRepeat.repeat(lineWidth)}
          </Text>
        );
      })}
    </Box>
  );
}

// ============================================================================
// LOADING OVERLAY - Fullscreen loading state
// ============================================================================

export interface LoadingOverlayProps {
  /** Title */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Use witty phrases */
  witty?: boolean;
  /** Color */
  color?: string;
  /** Show border */
  bordered?: boolean;
}

export function LoadingOverlay({
  title = 'Loading',
  subtitle,
  witty = true,
  color = 'cyan',
  bordered = true,
}: LoadingOverlayProps): React.ReactElement {
  return (
    <Box justifyContent='center' alignItems='center' flexGrow={1}>
      <Box
        flexDirection='column'
        alignItems='center'
        borderStyle={bordered ? 'round' : undefined}
        borderColor={bordered ? color : undefined}
        paddingX={4}
        paddingY={2}
      >
        <Spinner type='dots' color={color} />
        <Box marginTop={1}>
          <Text bold color={color}>{title}</Text>
        </Box>
        {witty && (
          <Box marginTop={1}>
            <LoadingPhrase
              phrases={WITTY_PHRASES}
              color={color}
              showSpinner={false}
              interval={2500}
            />
          </Box>
        )}
        {subtitle && (
          <Box marginTop={1}>
            <Text dimColor>{subtitle}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ============================================================================
// OPERATION STATUS - Show operation with status
// ============================================================================

export interface OperationStatusProps {
  /** Operation name */
  operation: string;
  /** Status */
  status: 'pending' | 'running' | 'success' | 'error';
  /** Error message (when status is error) */
  error?: string;
  /** Duration (when complete) */
  duration?: string;
  /** Details */
  details?: string;
}

export function OperationStatus({
  operation,
  status,
  error,
  duration,
  details,
}: OperationStatusProps): React.ReactElement {
  const statusConfig = {
    pending: { icon: '○', color: 'gray' },
    running: { icon: '◐', color: 'cyan' },
    success: { icon: '✓', color: 'green' },
    error: { icon: '✗', color: 'red' },
  };

  const config = statusConfig[status];

  return (
    <Box flexDirection='column'>
      <Box>
        {status === 'running'
          ? <Spinner type='dots' color={config.color} />
          : <Text color={config.color}>{config.icon}</Text>}
        <Text
          color={status === 'running' ? config.color : undefined}
          bold={status === 'running'}
        >
          {' '}
          {operation}
        </Text>
        {duration && status === 'success' && <Text dimColor>({duration})</Text>}
      </Box>
      {details && status === 'running' && (
        <Box marginLeft={2}>
          <Text dimColor>{details}</Text>
        </Box>
      )}
      {error && status === 'error' && (
        <Box marginLeft={2}>
          <Text color='red'>{error}</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// BATCH OPERATIONS - Show multiple operations
// ============================================================================

export interface BatchOperation {
  id: string;
  operation: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
  duration?: string;
}

export interface BatchOperationsProps {
  /** Operations */
  operations: BatchOperation[];
  /** Title */
  title?: string;
  /** Show summary */
  showSummary?: boolean;
}

export function BatchOperations({
  operations,
  title,
  showSummary = true,
}: BatchOperationsProps): React.ReactElement {
  const completed = operations.filter((op) => op.status === 'success').length;
  const failed = operations.filter((op) => op.status === 'error').length;
  const running = operations.filter((op) => op.status === 'running').length;

  return (
    <Box flexDirection='column'>
      {title && (
        <Box marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      {operations.map((op) => (
        <React.Fragment key={op.id}>
          <OperationStatus
            operation={op.operation}
            status={op.status}
            error={op.error}
            duration={op.duration}
          />
        </React.Fragment>
      ))}
      {showSummary && (
        <Box marginTop={1}>
          <Text dimColor>
            {completed}/{operations.length} completed
            {failed > 0 && <Text color='red'>({failed} failed)</Text>}
            {running > 0 && <Text color='cyan'>({running} running)</Text>}
          </Text>
        </Box>
      )}
    </Box>
  );
}
