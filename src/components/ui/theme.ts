/**
 * @module components/ui/theme
 *
 * Shared theme colors for Ralph CLI UI components.
 */

export const colors = {
  // Brand - vibrant orange
  brand: '#FF9500',
  accent: '#FF9500',

  // Text
  text: '#FFFFFF',
  muted: '#888888',
  dim: '#666666',

  // Status - vibrant colors
  success: '#00FF7F', // Bright green (spring green)
  error: '#FF5F5F', // Bright red
  warning: '#FFD700', // Gold
  info: '#00BFFF', // Deep sky blue

  // Special - vibrant
  cyan: '#00FFFF', // Pure cyan
  magenta: '#FF00FF', // Pure magenta

  // Token colors
  tokenInput: '#60A5FA', // Blue - input tokens sent
  tokenOutput: '#34D399', // Green - output tokens received
  tokenCache: '#A78BFA', // Purple - cached tokens
  tokenTotal: '#FBBF24', // Amber - total tokens

  // Context window
  contextOk: '#22C55E', // Green - < 50% used
  contextWarn: '#FBBF24', // Amber - 50-80% used
  contextDanger: '#FF5F5F', // Red - > 80% used

  // Usage bars
  usage5h: '#FFAF00',
  usage5hBg: '#5C4A2A',
  usage7d: '#7B8794',
  usage7dBg: '#3D4A56',
  usageSonnet: '#5BA3C0',
  usageSonnetBg: '#2D4A56',
};

// Gradient colors for animations
export const gradientColors = [
  '#FF9500', // Orange
  '#FF6B00', // Dark orange
  '#FF9500', // Orange
  '#FFB800', // Light orange
  '#FF9500', // Orange
];
