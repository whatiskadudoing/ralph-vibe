/**
 * @module ui/gradient
 *
 * Gradient text component for multi-color text effects.
 */

import { getCapabilities } from './capabilities.ts';

// ============================================================================
// Gradient Types
// ============================================================================

/** Gradient configuration */
export interface GradientConfig {
  /** Text to apply gradient to */
  readonly text: string;
  /** Array of hex colors to interpolate between */
  readonly colors: string[];
}

// ============================================================================
// Color Utilities
// ============================================================================

/** RGB color components */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses a hex color string to RGB components.
 */
function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');

  // Handle shorthand hex (e.g., #FFF)
  const fullHex = cleanHex.length === 3 ? cleanHex.split('').map((c) => c + c).join('') : cleanHex;

  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Interpolates between two RGB colors.
 */
function interpolateRgb(color1: RGB, color2: RGB, t: number): RGB {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t),
  };
}

/**
 * Applies ANSI true color to a character.
 */
function applyTrueColor(char: string, { r, g, b }: RGB): string {
  return `\x1b[38;2;${r};${g};${b}m${char}\x1b[0m`;
}

/**
 * Gets a color at a specific position in the gradient.
 */
function getGradientColor(colors: RGB[], position: number): RGB {
  if (colors.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  if (colors.length === 1) {
    return colors[0] ?? { r: 255, g: 255, b: 255 };
  }

  // Clamp position to [0, 1]
  const t = Math.max(0, Math.min(1, position));

  // Find which segment we're in
  const segmentCount = colors.length - 1;
  const segmentPosition = t * segmentCount;
  const segmentIndex = Math.min(Math.floor(segmentPosition), segmentCount - 1);
  const segmentT = segmentPosition - segmentIndex;

  const startColor = colors[segmentIndex] ?? { r: 255, g: 255, b: 255 };
  const endColor = colors[segmentIndex + 1] ?? { r: 255, g: 255, b: 255 };
  return interpolateRgb(startColor, endColor, segmentT);
}

// ============================================================================
// Gradient Functions
// ============================================================================

/**
 * Creates gradient text by interpolating colors across characters.
 * Falls back to plain text if terminal doesn't support true color.
 *
 * @example
 * gradient({
 *   text: 'RALPH',
 *   colors: ['#00D9FF', '#7B68EE', '#FF6B9D']
 * });
 * // R A L P H (each letter transitions through colors)
 */
export function gradient(config: GradientConfig): string {
  const { text, colors } = config;

  // If no color support or no colors, return plain text
  const capabilities = getCapabilities();
  if (!capabilities.supportsColor || capabilities.colorLevel === 'none') {
    return text;
  }

  // For limited color support, return plain text
  if (capabilities.colorLevel === '16') {
    return text;
  }

  // Parse hex colors to RGB
  const rgbColors = colors.map(hexToRgb);

  if (rgbColors.length === 0) {
    return text;
  }

  // Apply gradient to each character
  const chars = [...text]; // Handle unicode properly
  const result = chars.map((char, i) => {
    // Skip whitespace
    if (char.trim() === '') {
      return char;
    }

    const position = chars.length > 1 ? i / (chars.length - 1) : 0;
    const color = getGradientColor(rgbColors, position);
    return applyTrueColor(char, color);
  });

  return result.join('');
}

// ============================================================================
// Preset Gradients
// ============================================================================

/** Predefined gradient color schemes */
export const gradientPresets = {
  /** Ralph CLI brand gradient */
  brand: ['#00D9FF', '#7B68EE', '#FF6B9D'],

  /** Success/green gradient */
  success: ['#00FF00', '#00CC00'],

  /** Sunset/warm gradient */
  sunset: ['#FF6B35', '#FF4500', '#FF0066'],

  /** Ocean/blue gradient */
  ocean: ['#0077B6', '#00B4D8', '#90E0EF'],

  /** Purple/violet gradient */
  purple: ['#7B2CBF', '#9D4EDD', '#C77DFF'],

  /** Rainbow gradient */
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'],

  /** Fire/warm gradient */
  fire: ['#FFCC00', '#FF6600', '#FF0000'],

  /** Ice/cool gradient */
  ice: ['#E0FFFF', '#00CED1', '#008B8B'],

  /** Gold/amber gradient */
  gold: ['#FFD700', '#FFA500', '#FF8C00'],
} as const;

/**
 * Creates gradient text using a preset.
 *
 * @example
 * gradientPreset('brand', 'RALPH');
 */
export function gradientPreset(preset: keyof typeof gradientPresets, text: string): string {
  return gradient({ text, colors: [...gradientPresets[preset]] });
}

/**
 * Creates the Ralph brand gradient.
 */
export function brandGradient(text: string): string {
  return gradient({ text, colors: [...gradientPresets.brand] });
}
