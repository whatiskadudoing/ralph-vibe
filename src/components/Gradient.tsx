/**
 * @module components/Gradient
 *
 * Gradient text effects using deno-ink.
 */

import { Box, Text } from "@ink/mod.ts";

// Pre-defined gradient color stops
export const GRADIENTS = {
  brand: ["#FF9500", "#FF6B00", "#FF4500"],
  sunset: ["#FF6B35", "#FF4500", "#FF0066"],
  ocean: ["#00D9FF", "#0099FF", "#0066FF"],
  purple: ["#9B59B6", "#8E44AD", "#7B68EE"],
  rainbow: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF"],
  fire: ["#FF0000", "#FF4500", "#FF8C00", "#FFD700"],
  ice: ["#00FFFF", "#00BFFF", "#1E90FF", "#0000FF"],
  gold: ["#FFD700", "#FFA500", "#FF8C00"],
  emerald: ["#00FF00", "#00FA9A", "#00CED1"],
  rose: ["#FF69B4", "#FF1493", "#C71585"],
  cyber: ["#00FF00", "#00FFFF", "#FF00FF"],
  neon: ["#FF00FF", "#00FFFF", "#FFFF00"],
} as const;

export type GradientPreset = keyof typeof GRADIENTS;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(result[1] ?? "ff", 16),
    g: parseInt(result[2] ?? "ff", 16),
    b: parseInt(result[3] ?? "ff", 16),
  };
}

function interpolateColor(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  factor: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * factor),
    g: Math.round(color1.g + (color2.g - color1.g) * factor),
    b: Math.round(color1.b + (color2.b - color1.b) * factor),
  };
}

function getGradientColor(colors: string[], position: number): string {
  if (colors.length === 1) return colors[0] ?? "#FFFFFF";
  if (position <= 0) return colors[0] ?? "#FFFFFF";
  if (position >= 1) return colors[colors.length - 1] ?? "#FFFFFF";

  const segment = position * (colors.length - 1);
  const index = Math.floor(segment);
  const factor = segment - index;

  const color1 = hexToRgb(colors[index] ?? "#FFFFFF");
  const color2 = hexToRgb(colors[index + 1] ?? "#FFFFFF");
  const result = interpolateColor(color1, color2, factor);

  return `rgb(${result.r},${result.g},${result.b})`;
}

export interface GradientTextProps {
  /** Text to display */
  children: string;
  /** Gradient colors (hex values) */
  colors?: string[];
  /** Use a preset gradient */
  preset?: GradientPreset;
  /** Make text bold */
  bold?: boolean;
}

export function GradientText({
  children,
  colors,
  preset,
  bold = false,
}: GradientTextProps): React.ReactElement {
  const gradientColors = colors ?? (preset ? GRADIENTS[preset] : GRADIENTS.brand);
  const chars = children.split("");

  return (
    <Box>
      {chars.map((char, index) => {
        const position = chars.length > 1 ? index / (chars.length - 1) : 0;
        const color = getGradientColor([...gradientColors], position);

        return (
          <Text key={index} color={color} bold={bold}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
}

// Convenience components for preset gradients
export function BrandGradient({ children, bold }: { children: string; bold?: boolean }): React.ReactElement {
  return <GradientText preset="brand" bold={bold}>{children}</GradientText>;
}

export function RainbowText({ children, bold }: { children: string; bold?: boolean }): React.ReactElement {
  return <GradientText preset="rainbow" bold={bold}>{children}</GradientText>;
}

export function FireText({ children, bold }: { children: string; bold?: boolean }): React.ReactElement {
  return <GradientText preset="fire" bold={bold}>{children}</GradientText>;
}

export function OceanText({ children, bold }: { children: string; bold?: boolean }): React.ReactElement {
  return <GradientText preset="ocean" bold={bold}>{children}</GradientText>;
}

export function NeonText({ children, bold }: { children: string; bold?: boolean }): React.ReactElement {
  return <GradientText preset="neon" bold={bold}>{children}</GradientText>;
}

// Animated gradient (cycles through colors)
// Note: This requires state updates which work in deno-ink
export function PulsingText({
  children,
  colors = ["#FF0000", "#00FF00", "#0000FF"],
}: {
  children: string;
  colors?: string[];
}): React.ReactElement {
  // For now, just use first color - animation would need useState/useEffect
  const color = colors[0];
  return <Text color={color} bold>{children}</Text>;
}

// ASCII art with gradient
export function GradientArt({
  art,
  colors,
  preset,
}: {
  art: string;
  colors?: string[];
  preset?: GradientPreset;
}): React.ReactElement {
  const lines = art.split("\n");
  const gradientColors = colors ?? (preset ? GRADIENTS[preset] : GRADIENTS.brand);

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => {
        const position = lines.length > 1 ? lineIndex / (lines.length - 1) : 0;
        const color = getGradientColor([...gradientColors], position);

        return (
          <Text key={lineIndex} color={color}>
            {line}
          </Text>
        );
      })}
    </Box>
  );
}
