/**
 * @module components/ui/TypewriterText
 *
 * Animated text reveal with character-by-character typing effect.
 * Optionally transitions to shimmer effect on completion.
 *
 * Inspired by:
 * - Cline: TypewriterText with 30ms per character, shimmer on complete
 * - Continue: AnimatedEllipsis for loading states
 * - Cursor: Streaming explanations before tool calls
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';

// ============================================================================
// Types
// ============================================================================

export interface TypewriterTextProps {
  /** Text to animate */
  text: string;
  /** Milliseconds per character (default: 30) */
  speed?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Show shimmer effect after completion (default: true) */
  shimmerOnComplete?: boolean;
  /** Duration of shimmer effect in ms (default: 2000) */
  shimmerDuration?: number;
  /** Text color */
  color?: string;
  /** Whether text is bold */
  bold?: boolean;
  /** Whether to dim text */
  dim?: boolean;
  /** Show cursor during typing */
  showCursor?: boolean;
  /** Cursor character */
  cursorChar?: string;
}

// ============================================================================
// Shimmer Effect Component
// ============================================================================

interface ShimmerTextProps {
  /** Text to shimmer */
  text: string;
  /** Duration of full shimmer cycle in ms */
  duration?: number;
  /** Base color */
  color?: string;
  /** Shimmer highlight color */
  highlightColor?: string;
  /** Whether text is bold */
  bold?: boolean;
}

/**
 * Text with animated gradient shimmer effect.
 * Creates a "wave" of brightness across the text.
 */
export function ShimmerText({
  text,
  duration = 2000,
  color = colors.muted,
  highlightColor = colors.text,
  bold = false,
}: ShimmerTextProps): React.ReactElement {
  const [offset, setOffset] = useState(0);
  const frameInterval = 100; // Update every 100ms
  const totalSteps = Math.ceil(duration / frameInterval);

  useEffect(() => {
    const timer = setInterval(() => {
      setOffset((o: number) => (o + 1) % totalSteps);
    }, frameInterval);
    return () => clearInterval(timer);
  }, [totalSteps]);

  // Calculate shimmer position (0 to 1 across text)
  const shimmerPos = offset / totalSteps;
  const shimmerWidth = 0.3; // Width of shimmer highlight

  return (
    <Text bold={bold}>
      {text.split('').map((char, i) => {
        const charPos = i / Math.max(text.length - 1, 1);
        const distance = Math.abs(charPos - shimmerPos);

        // Determine if this character is in the shimmer zone
        const inShimmer = distance < shimmerWidth;
        const brightness = inShimmer ? 1 - distance / shimmerWidth : 0;

        // Interpolate color based on brightness
        const charColor = brightness > 0.5 ? highlightColor : color;

        return (
          <Text key={i} color={charColor}>
            {char}
          </Text>
        );
      })}
    </Text>
  );
}

// ============================================================================
// Typewriter Component
// ============================================================================

/**
 * Typewriter text animation.
 * Reveals text character by character, optionally shimmers on complete.
 *
 * Example usage:
 * ```tsx
 * <TypewriterText
 *   text="Analyzing codebase..."
 *   speed={30}
 *   onComplete={() => setReady(true)}
 * />
 * ```
 */
export function TypewriterText({
  text,
  speed = 30,
  onComplete,
  shimmerOnComplete = true,
  shimmerDuration = 2000,
  color = colors.muted,
  bold = false,
  dim = false,
  showCursor = true,
  cursorChar = '▌',
}: TypewriterTextProps): React.ReactElement {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Typing animation
  useEffect(() => {
    if (displayedLength >= text.length) {
      if (!isComplete) {
        setIsComplete(true);
        onCompleteRef.current?.();

        if (shimmerOnComplete) {
          setShowShimmer(true);
          // Stop shimmer after duration
          const timer = setTimeout(() => {
            setShowShimmer(false);
          }, shimmerDuration);
          return () => clearTimeout(timer);
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLength((d: number) => d + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedLength, text.length, speed, isComplete, shimmerOnComplete, shimmerDuration]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedLength(0);
    setIsComplete(false);
    setShowShimmer(false);
  }, [text]);

  // Show shimmer effect
  if (showShimmer) {
    return <ShimmerText text={text} duration={shimmerDuration} bold={bold} />;
  }

  // Show completed text (no animation)
  if (isComplete) {
    return (
      <Text color={color} bold={bold} dimColor={dim}>
        {text}
      </Text>
    );
  }

  // Show typing animation
  const displayedText = text.slice(0, displayedLength);
  const cursor = showCursor ? cursorChar : '';

  return (
    <Text color={color} bold={bold} dimColor={dim}>
      {displayedText}
      <Text color={colors.accent}>{cursor}</Text>
    </Text>
  );
}

// ============================================================================
// Animated Ellipsis
// ============================================================================

export interface AnimatedEllipsisProps {
  /** Base text before ellipsis */
  text?: string;
  /** Speed of dot animation in ms (default: 500) */
  speed?: number;
  /** Maximum dots (default: 3) */
  maxDots?: number;
  /** Text color */
  color?: string;
}

/**
 * Animated ellipsis for loading states.
 * Shows "Loading." -> "Loading.." -> "Loading..." cycling.
 */
export function AnimatedEllipsis({
  text = '',
  speed = 500,
  maxDots = 3,
  color = colors.muted,
}: AnimatedEllipsisProps): React.ReactElement {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((d: number) => (d % maxDots) + 1);
    }, speed);
    return () => clearInterval(timer);
  }, [speed, maxDots]);

  const ellipsis = '.'.repeat(dots);
  const padding = ' '.repeat(maxDots - dots); // Prevent layout shift

  return (
    <Text color={color}>
      {text}
      {ellipsis}
      {padding}
    </Text>
  );
}

// ============================================================================
// Delayed Spinner Text
// ============================================================================

export interface DelayedTextProps {
  /** Text to show */
  text: string;
  /** Delay before showing in ms (default: 500) */
  delay?: number;
  /** Text color */
  color?: string;
  /** Use typewriter animation when shown */
  animate?: boolean;
}

/**
 * Text that appears after a delay.
 * Useful for preventing flicker on fast operations (Aider pattern).
 */
export function DelayedText({
  text,
  delay = 500,
  color = colors.muted,
  animate = false,
}: DelayedTextProps): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Reset visibility when text changes
  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  if (!visible) {
    return null;
  }

  if (animate) {
    return <TypewriterText text={text} color={color} shimmerOnComplete={false} />;
  }

  return <Text color={color}>{text}</Text>;
}

// ============================================================================
// Thinking Indicator
// ============================================================================

export interface ThinkingIndicatorProps {
  /** Whether currently thinking */
  isThinking?: boolean;
  /** Custom thinking text */
  text?: string;
  /** Text color */
  color?: string;
}

/**
 * "Thinking..." indicator with animated dots.
 * Inspired by Continue's ThinkingIndicator component.
 */
export function ThinkingIndicator({
  isThinking = true,
  text = 'Thinking',
  color = colors.muted,
}: ThinkingIndicatorProps): React.ReactElement | null {
  if (!isThinking) {
    return null;
  }

  return (
    <Box flexDirection='row'>
      <AnimatedEllipsis text={text} color={color} speed={600} />
    </Box>
  );
}
