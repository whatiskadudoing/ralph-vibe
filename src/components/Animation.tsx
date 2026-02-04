/**
 * @module components/Animation
 *
 * Animated text and visual effect components.
 * Provides typewriter effects, pulsing, wave animations, and more.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from '@ink/mod.ts';

// ============================================================================
// TYPEWRITER - Character-by-character text reveal
// ============================================================================

export interface TypewriterProps {
  /** Text to animate */
  text: string;
  /** Delay between characters (ms) */
  delay?: number;
  /** Show cursor */
  showCursor?: boolean;
  /** Cursor character */
  cursor?: string;
  /** Cursor color */
  cursorColor?: string;
  /** Text color */
  color?: string;
  /** Bold text */
  bold?: boolean;
  /** Callback when complete */
  onComplete?: () => void;
}

export function Typewriter({
  text,
  delay = 50,
  showCursor = true,
  cursor = '▌',
  cursorColor = 'cyan',
  color,
  bold = false,
  onComplete,
}: TypewriterProps): React.ReactElement {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (displayedLength < text.length) {
      const timer = setTimeout(() => {
        setDisplayedLength((prev: number) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
    return undefined;
  }, [displayedLength, text.length, delay, isComplete, onComplete]);

  return (
    <Box>
      <Text color={color} bold={bold}>
        {text.slice(0, displayedLength)}
      </Text>
      {showCursor && !isComplete && <Text color={cursorColor}>{cursor}</Text>}
    </Box>
  );
}

// ============================================================================
// PULSE - Pulsing/breathing text effect
// ============================================================================

export interface PulseProps {
  /** Text to pulse */
  children: string;
  /** Pulse speed (ms per state change) */
  speed?: number;
  /** Color when bright */
  brightColor?: string;
  /** Color when dim */
  dimColor?: string;
}

export function Pulse({
  children,
  speed = 500,
  brightColor,
  dimColor,
}: PulseProps): React.ReactElement {
  const [isDim, setIsDim] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsDim((prev: boolean) => !prev);
    }, speed);
    return () => clearInterval(timer);
  }, [speed]);

  return (
    <Text
      color={isDim ? dimColor : brightColor}
      dimColor={isDim && !dimColor}
    >
      {children}
    </Text>
  );
}

// ============================================================================
// BLINK - Blinking text
// ============================================================================

export interface BlinkProps {
  /** Text to blink */
  children: string;
  /** Blink interval (ms) */
  interval?: number;
  /** Color */
  color?: string;
}

export function Blink({
  children,
  interval = 500,
  color,
}: BlinkProps): React.ReactElement {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible((prev: boolean) => !prev);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return (
    <Text color={color}>
      {visible ? children : ' '.repeat(children.length)}
    </Text>
  );
}

// ============================================================================
// FADE IN - Text that fades in using intensity
// ============================================================================

const FADE_CHARS = ['░', '▒', '▓', '█'];

export interface FadeInProps {
  /** Text to fade in */
  children: string;
  /** Fade duration per character (ms) */
  duration?: number;
  /** Final color */
  color?: string;
  /** Callback when complete */
  onComplete?: () => void;
}

export function FadeIn({
  children,
  duration = 100,
  color,
  onComplete,
}: FadeInProps): React.ReactElement {
  const [phase, setPhase] = useState(0);
  const maxPhase = 4; // 0 = hidden, 1-3 = fading, 4 = complete

  useEffect(() => {
    if (phase < maxPhase) {
      const timer = setTimeout(() => {
        setPhase((prev: number) => prev + 1);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      onComplete?.();
    }
    return undefined;
  }, [phase, duration, onComplete]);

  if (phase === 0) {
    return <Text dimColor>{' '.repeat(children.length)}</Text>;
  }

  if (phase >= maxPhase) {
    return <Text color={color}>{children}</Text>;
  }

  // During fade, show intensity character
  const fadeChar = FADE_CHARS[phase - 1] ?? '░';
  return <Text dimColor>{fadeChar.repeat(children.length)}</Text>;
}

// ============================================================================
// WAVE - Text with wave animation
// ============================================================================

export interface WaveProps {
  /** Text to animate */
  children: string;
  /** Wave speed (ms) */
  speed?: number;
  /** Colors for wave effect */
  colors?: string[];
}

export function Wave({
  children,
  speed = 150,
  colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'],
}: WaveProps): React.ReactElement {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setOffset((prev: number) => (prev + 1) % colors.length);
    }, speed);
    return () => clearInterval(timer);
  }, [speed, colors.length]);

  const chars = children.split('');

  return (
    <Box>
      {chars.map((char, i) => {
        const colorIndex = (i + offset) % colors.length;
        return (
          <Text key={i} color={colors[colorIndex]}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
}

// ============================================================================
// RAINBOW - Rainbow cycling text
// ============================================================================

const RAINBOW_COLORS = ['red', '#FF7F00', 'yellow', 'green', 'cyan', 'blue', '#8B00FF'];

export interface RainbowProps {
  /** Text to colorize */
  children: string;
  /** Animation speed (ms) */
  speed?: number;
  /** Animate (cycle colors) */
  animate?: boolean;
}

export function Rainbow({
  children,
  speed = 100,
  animate = true,
}: RainbowProps): React.ReactElement {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!animate) return undefined;

    const timer = setInterval(() => {
      setOffset((prev: number) => (prev + 1) % RAINBOW_COLORS.length);
    }, speed);
    return () => clearInterval(timer);
  }, [speed, animate]);

  const chars = children.split('');

  return (
    <Box>
      {chars.map((char, i) => {
        const colorIndex = (i + offset) % RAINBOW_COLORS.length;
        return (
          <Text key={i} color={RAINBOW_COLORS[colorIndex]}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
}

// ============================================================================
// SHIMMER - Shimmering text effect
// ============================================================================

export interface ShimmerProps {
  /** Text to shimmer */
  children: string;
  /** Shimmer speed (ms) */
  speed?: number;
  /** Base color */
  baseColor?: string;
  /** Shimmer color (bright) */
  shimmerColor?: string;
}

export function Shimmer({
  children,
  speed = 100,
  baseColor = 'gray',
  shimmerColor = 'white',
}: ShimmerProps): React.ReactElement {
  const [shimmerPos, setShimmerPos] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setShimmerPos((prev: number) => (prev + 1) % (children.length + 3));
    }, speed);
    return () => clearInterval(timer);
  }, [speed, children.length]);

  const chars = children.split('');

  return (
    <Box>
      {chars.map((char, i) => {
        const distFromShimmer = Math.abs(i - shimmerPos);
        const isShimmer = distFromShimmer <= 1;
        return (
          <Text
            key={i}
            color={isShimmer ? shimmerColor : baseColor}
            bold={isShimmer && distFromShimmer === 0}
          >
            {char}
          </Text>
        );
      })}
    </Box>
  );
}

// ============================================================================
// BOUNCE - Text that bounces (moves up and down)
// ============================================================================

export interface BounceProps {
  /** Text to bounce */
  children: string;
  /** Bounce speed (ms) */
  speed?: number;
  /** Color */
  color?: string;
}

export function Bounce({
  children,
  speed = 300,
  color,
}: BounceProps): React.ReactElement {
  const [isUp, setIsUp] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsUp((prev: boolean) => !prev);
    }, speed);
    return () => clearInterval(timer);
  }, [speed]);

  return (
    <Box flexDirection='column'>
      {isUp && <Text></Text>}
      <Text color={color}>{children}</Text>
      {!isUp && <Text></Text>}
    </Box>
  );
}

// ============================================================================
// GLITCH - Glitchy text effect
// ============================================================================

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

export interface GlitchProps {
  /** Text to glitch */
  children: string;
  /** Glitch intensity (0-1) */
  intensity?: number;
  /** Glitch speed (ms) */
  speed?: number;
  /** Color */
  color?: string;
  /** Glitch color */
  glitchColor?: string;
}

export function Glitch({
  children,
  intensity = 0.1,
  speed = 100,
  color,
  glitchColor = 'red',
}: GlitchProps): React.ReactElement {
  const [glitchedText, setGlitchedText] = useState(children);

  useEffect(() => {
    const timer = setInterval(() => {
      const chars = children.split('');
      const newChars = chars.map((char) => {
        if (Math.random() < intensity) {
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        return char;
      });
      setGlitchedText(newChars.join(''));
    }, speed);
    return () => clearInterval(timer);
  }, [children, intensity, speed]);

  // Check if text has glitches
  const hasGlitch = glitchedText !== children;

  return (
    <Text color={hasGlitch ? glitchColor : color}>
      {glitchedText}
    </Text>
  );
}

// ============================================================================
// MARQUEE - Scrolling text
// ============================================================================

export interface MarqueeProps {
  /** Text to scroll */
  children: string;
  /** Visible width */
  width?: number;
  /** Scroll speed (ms) */
  speed?: number;
  /** Scroll direction */
  direction?: 'left' | 'right';
  /** Gap between repeats */
  gap?: number;
  /** Color */
  color?: string;
}

export function Marquee({
  children,
  width = 30,
  speed = 150,
  direction = 'left',
  gap = 5,
  color,
}: MarqueeProps): React.ReactElement {
  const [offset, setOffset] = useState(0);
  const fullText = children + ' '.repeat(gap) + children;

  useEffect(() => {
    const timer = setInterval(() => {
      setOffset((prev: number) => (prev + 1) % (children.length + gap));
    }, speed);
    return () => clearInterval(timer);
  }, [speed, children.length, gap]);

  const start = direction === 'left' ? offset : fullText.length - offset - width;
  const visibleText = fullText.slice(start, start + width).padEnd(width);

  return <Text color={color}>{visibleText}</Text>;
}

// ============================================================================
// COUNTER - Animated number counter
// ============================================================================

export interface CounterProps {
  /** Target number */
  to: number;
  /** Starting number */
  from?: number;
  /** Duration (ms) */
  duration?: number;
  /** Number format (e.g., add commas) */
  format?: (n: number) => string;
  /** Color */
  color?: string;
  /** Bold */
  bold?: boolean;
}

export function Counter({
  to,
  from = 0,
  duration = 1000,
  format = (n) => String(Math.round(n)),
  color,
  bold = false,
}: CounterProps): React.ReactElement {
  const [current, setCurrent] = useState(from);

  useEffect(() => {
    const startTime = Date.now();
    const diff = to - from;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(from + diff * eased);

      if (progress >= 1) {
        clearInterval(timer);
        setCurrent(to);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [from, to, duration]);

  return (
    <Text color={color} bold={bold}>
      {format(current)}
    </Text>
  );
}

// ============================================================================
// LOADING DOTS - Animated loading dots
// ============================================================================

export interface LoadingDotsProps {
  /** Number of dots */
  count?: number;
  /** Animation speed (ms) */
  speed?: number;
  /** Color */
  color?: string;
  /** Dot character */
  dot?: string;
}

export function LoadingDots({
  count = 3,
  speed = 300,
  color = 'cyan',
  dot = '.',
}: LoadingDotsProps): React.ReactElement {
  const [visibleDots, setVisibleDots] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleDots((prev: number) => (prev + 1) % (count + 1));
    }, speed);
    return () => clearInterval(timer);
  }, [speed, count]);

  return (
    <Text color={color}>
      {dot.repeat(visibleDots)}
      {' '.repeat(count - visibleDots)}
    </Text>
  );
}

// ============================================================================
// SKELETON - Loading skeleton placeholder
// ============================================================================

export interface SkeletonProps {
  /** Width */
  width?: number;
  /** Height (lines) */
  height?: number;
  /** Animate */
  animate?: boolean;
  /** Animation speed (ms) */
  speed?: number;
}

export function Skeleton({
  width = 20,
  height = 1,
  animate = true,
  speed = 200,
}: SkeletonProps): React.ReactElement {
  const [phase, setPhase] = useState(0);
  const chars = ['░', '▒', '▓', '▒'];

  useEffect(() => {
    if (!animate) return undefined;

    const timer = setInterval(() => {
      setPhase((prev: number) => (prev + 1) % chars.length);
    }, speed);
    return () => clearInterval(timer);
  }, [speed, animate, chars.length]);

  const line = (chars[phase] ?? '░').repeat(width);

  return (
    <Box flexDirection='column'>
      {Array.from({ length: height }).map((_, i) => <Text key={i} dimColor>{line}</Text>)}
    </Box>
  );
}
