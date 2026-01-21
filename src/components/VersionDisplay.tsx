/**
 * @module components/VersionDisplay
 *
 * Simple version display component using deno-ink.
 * Shows version, mascot, and a random friendly message.
 */

import React from "react";
import { Box, Text } from "@ink/mod.ts";
import { orange } from "@/ui/colors.ts";
import denoConfig from "../../deno.json" with { type: "json" };

export interface VersionDisplayProps {
  /** Override version (defaults to deno.json version) */
  version?: string;
  /** Show minimal output (just version number) */
  minimal?: boolean;
}

// Colors - using the orange theme
const ORANGE = "#FF9500";

/**
 * Fun random messages for the version display
 */
const VERSION_MESSAGES = [
  "Ready to vibe!",
  "Let's build something awesome!",
  "Autonomous coding awaits...",
  "Time to ship some code!",
  "Your AI pair programmer is ready.",
  "Let's get vibing!",
  "Ready when you are!",
  "Code. Vibe. Ship. Repeat.",
  "The future of coding is here.",
  "Less typing, more shipping.",
];

/**
 * Get a random message
 */
function getRandomMessage(): string {
  const index = Math.floor(Math.random() * VERSION_MESSAGES.length);
  return VERSION_MESSAGES[index] ?? VERSION_MESSAGES[0] ?? "";
}

/**
 * The Ralph mascot - a Space Invaders style alien
 * Reusable across the app
 */
export const RALPH_MASCOT = [
  "    ▄▄▄▄▄▄▄    ",
  "  ▄█████████▄  ",
  " ███ ▀███▀ ███ ",
  " █████████████ ",
  "   ▀█▄▄▄▄▄█▀   ",
  "    █ █ █ █    ",
  "   ▀       ▀   ",
];

export interface MascotProps {
  /** Color for the mascot */
  color?: string;
  /** Custom mascot lines (defaults to RALPH_MASCOT) */
  lines?: string[];
}

/**
 * Reusable Mascot component
 */
export function Mascot({ color = ORANGE, lines = RALPH_MASCOT }: MascotProps): React.ReactElement {
  return (
    <Box flexDirection="column" alignItems="center">
      {lines.map((line, i) => (
        <Text key={i} color={color}>{line}</Text>
      ))}
    </Box>
  );
}

/**
 * Simple version display - version, mascot, and a nice message
 */
export function VersionDisplay({
  version = denoConfig.version,
  minimal = false,
}: VersionDisplayProps): React.ReactElement {
  if (minimal) {
    return <Text>{version}</Text>;
  }

  const message = getRandomMessage();

  return (
    <Box flexDirection="column" alignItems="center">
      <Text> </Text>
      {RALPH_MASCOT.map((line, i) => (
        <Text key={i} color={ORANGE}>{line}</Text>
      ))}
      <Text> </Text>
      <Text>Ralph CLI v{version}</Text>
      <Text color={ORANGE}>{message}</Text>
      <Text> </Text>
    </Box>
  );
}

/**
 * Render the version display to stdout.
 */
export function renderVersion(options?: VersionDisplayProps): void {
  const version = options?.version ?? denoConfig.version;

  if (options?.minimal) {
    console.log(version);
    return;
  }

  const message = getRandomMessage();

  console.log();
  for (const line of RALPH_MASCOT) {
    console.log(orange(line));
  }
  console.log();
  console.log(`Ralph CLI v${version}`);
  console.log(orange(message));
  console.log();
}
