/**
 * @module components/CommandScreen
 *
 * Base screen component for all Ralph commands.
 * Provides consistent header, expandable usage section, and finalization.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  useFinalOutput,
  useTerminalSize,
  useInput,
  useApp,
} from "../../packages/deno-ink/src/mod.ts";
import {
  colors,
  gradientColors,
  KeyboardHints,
  UsageBars,
  type KeyboardHint,
} from "./ui/mod.ts";
import type { SubscriptionUsage } from "@/services/usage_service.ts";

// ============================================================================
// Types
// ============================================================================

export interface CommandScreenProps {
  name: string;
  description: string;
  usage?: SubscriptionUsage;
  showUsage?: boolean;
  keyboardHints?: KeyboardHint[];
  children: React.ReactNode;
  finalSummary?: () => string;
  animateBorder?: boolean;
  borderColor?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface HeaderProps {
  name: string;
  description: string;
}

function Header({ name, description }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text color={colors.brand}>◆</Text>
        <Text bold color={colors.accent}>{name}</Text>
      </Box>
      <Text color={colors.muted}>{description}</Text>
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CommandScreen({
  name,
  description,
  usage,
  showUsage = true,
  keyboardHints = [],
  children,
  finalSummary,
  animateBorder = true,
  borderColor: staticBorderColor,
}: CommandScreenProps): React.ReactElement {
  const { exit } = useApp();
  const setFinalOutput = useFinalOutput();
  const { columns } = useTerminalSize();

  // Animated border color
  const [borderColorIndex, setBorderColorIndex] = useState(0);

  useEffect(() => {
    if (!animateBorder) return;
    const timer = setInterval(() => {
      setBorderColorIndex((i: number) => (i + 1) % gradientColors.length);
    }, 200);
    return () => clearInterval(timer);
  }, [animateBorder]);

  useEffect(() => {
    if (finalSummary) {
      setFinalOutput(finalSummary());
    }
  }, [finalSummary, setFinalOutput]);

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
    }
  });

  const boxWidth = columns - 4;
  const borderColor = animateBorder
    ? (gradientColors[borderColorIndex] ?? colors.brand)
    : (staticBorderColor ?? colors.brand);

  const allHints: KeyboardHint[] = [
    ...(showUsage && usage ? [{ key: "u", label: "usage" }] : []),
    ...keyboardHints,
    { key: "q", label: "quit" },
  ];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={2}
      paddingY={1}
      width={boxWidth}
    >
      <Header name={name} description={description} />

      {showUsage && usage && <UsageBars usage={usage} />}

      {children}

      <Box marginTop={1}>
        <KeyboardHints hints={allHints} />
      </Box>
    </Box>
  );
}

// ============================================================================
// Final Output Helpers
// ============================================================================

export const ansi = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[38;2;34;197;94m",
  orange: "\x1b[38;2;255;149;0m",
  amber: "\x1b[38;2;255;175;0m",
  gray: "\x1b[38;2;136;136;136m",
  dimGray: "\x1b[38;2;102;102;102m",
  cyan: "\x1b[38;2;0;255;255m",
  red: "\x1b[38;2;255;95;95m",
  magenta: "\x1b[38;2;255;0;255m",
  yellow: "\x1b[38;2;255;255;0m",
};

export function buildFinalOutput(options: {
  success: boolean;
  title: string;
  files?: string[];
  nextCommand?: string;
}): string {
  const lines: string[] = [];

  if (options.success) {
    lines.push(`${ansi.green}${ansi.bold}✓ ${options.title}${ansi.reset}`);
  } else {
    lines.push(`${ansi.red}${ansi.bold}✗ ${options.title}${ansi.reset}`);
  }

  if (options.files && options.files.length > 0) {
    lines.push("");
    for (const file of options.files) {
      lines.push(`${ansi.dimGray}→${ansi.reset} ${ansi.orange}${file}${ansi.reset}`);
    }
  }

  if (options.nextCommand) {
    lines.push("");
    lines.push(`${ansi.bold}Next:${ansi.reset} ${ansi.orange}${options.nextCommand}${ansi.reset}`);
  }

  lines.push("");
  return lines.join("\n");
}
