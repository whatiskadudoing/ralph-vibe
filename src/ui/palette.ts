/**
 * @module ui/palette
 *
 * The new, modern color palette for Ralph CLI.
 * Using 256-color mode for a richer and more consistent look.
 */

export const palette = {
  // Brand & Accent Colors
  primary: {
    base: '#5E81AC', // A calm, strong blue
    light: '#88C0D0', // Lighter, airy blue
    dark: '#4C566A', // Dark, slate blue
  },
  accent: {
    orange: '#D08770', // Muted, warm orange
    yellow: '#EBCB8B', // Soft, buttery yellow
    green: '#A3BE8C', // Earthy green
    purple: '#B48EAD', // Dusty lavender
  },

  // Semantic Colors
  success: '#A3BE8C', // Green for success
  warning: '#EBCB8B', // Yellow for warnings
  error: '#BF616A',   // Muted red for errors
  info: '#88C0D0',    // Light blue for info

  // Grayscale
  gray: {
    black: '#2E3440',  // Deep, dark gray (almost black)
    darkest: '#3B4252',// Dark gray for backgrounds
    dark: '#4C566A',   // Medium-dark gray for borders
    base: '#D8DEE9',   // Light gray for text
    light: '#E5E9F0',  // Lighter gray for subtle text
    lightest: '#ECEFF4',// Almost white, for backgrounds
    white: '#FFFFFF',
  },
} as const;
