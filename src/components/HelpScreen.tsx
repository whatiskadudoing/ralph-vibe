/**
 * @module components/HelpScreen
 *
 * Beautiful help screen using deno-ink components.
 */

import React from "react";
import { Box, Text, Newline, render } from "../../packages/deno-ink/src/mod.ts";

// ============================================================================
// Theme Colors
// ============================================================================

const colors = {
  brand: "#00D9FF",      // Cyan - primary brand color
  accent: "#FFAA00",     // Amber - for commands
  muted: "#6C7086",      // Gray - for descriptions
  success: "#A6E3A1",    // Green
  dim: "#45475A",        // Darker gray
};

// ============================================================================
// Sub-Components
// ============================================================================

interface CommandRowProps {
  name: string;
  description: string;
  flags?: string;
}

function CommandRow({ name, description, flags }: CommandRowProps) {
  return (
    <Box flexDirection="row" gap={2}>
      <Box width={12}>
        <Text color={colors.accent} bold>{name}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={colors.muted}>{description}</Text>
      </Box>
      {flags && (
        <Box>
          <Text dimColor>{flags}</Text>
        </Box>
      )}
    </Box>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={colors.brand}>{title}</Text>
      <Box flexDirection="column" paddingLeft={2} marginTop={1}>
        {children}
      </Box>
    </Box>
  );
}

interface KeyValueProps {
  label: string;
  value: string;
  valueColor?: string;
}

function KeyValue({ label, value, valueColor = colors.muted }: KeyValueProps) {
  return (
    <Box flexDirection="row" gap={1}>
      <Text dimColor>{label}:</Text>
      <Text color={valueColor}>{value}</Text>
    </Box>
  );
}

// ============================================================================
// ASCII Art Banner (smaller version for help)
// ============================================================================

const RALPH_LOGO = `
 ╦═╗╔═╗╦  ╔═╗╦ ╦
 ╠╦╝╠═╣║  ╠═╝╠═╣
 ╩╚═╩ ╩╩═╝╩  ╩ ╩
`.trim();

// ============================================================================
// HelpScreen Component
// ============================================================================

interface HelpScreenProps {
  version: string;
}

export function HelpScreen({ version }: HelpScreenProps) {
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header with logo */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.dim}
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Box flexDirection="column">
            <Text color={colors.brand}>{RALPH_LOGO}</Text>
          </Box>
          <Box flexDirection="column" alignItems="flex-end">
            <Text color={colors.muted}>Autonomous AI Development</Text>
            <Text dimColor>v{version}</Text>
          </Box>
        </Box>
      </Box>

      {/* Usage */}
      <Section title="Usage">
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={colors.accent}>ralph</Text>
            <Text dimColor>{"<command>"}</Text>
            <Text dimColor>[options]</Text>
          </Box>
          <Box flexDirection="row" gap={1}>
            <Text color={colors.accent}>ralph</Text>
            <Text dimColor>{"<command>"}</Text>
            <Text color={colors.success}>--vibe</Text>
            <Text dimColor>  # Continue automatically</Text>
          </Box>
        </Box>
      </Section>

      {/* Commands */}
      <Section title="Commands">
        <Box flexDirection="column" gap={1}>
          <CommandRow
            name="init"
            description="Initialize a new Ralph project"
          />
          <CommandRow
            name="start"
            description="Interactive interview to create first specs"
          />
          <CommandRow
            name="spec"
            description="Add a new feature spec via interview"
          />
          <CommandRow
            name="plan"
            description="Generate implementation plan from specs"
          />
          <CommandRow
            name="work"
            description="Run the autonomous build loop"
          />
        </Box>
      </Section>

      {/* Vibe Mode */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.success}
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text bold color={colors.success}>Vibe Mode</Text>
        <Box marginTop={1} flexDirection="column" gap={1}>
          <Text color={colors.muted}>
            Add --vibe to automatically continue through the workflow:
          </Text>
          <Newline />
          <Box flexDirection="row" gap={2}>
            <Text dimColor>ralph init --vibe</Text>
            <Text color={colors.dim}>→</Text>
            <Text color={colors.muted}>init → start → plan → work</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Text dimColor>ralph spec --vibe</Text>
            <Text color={colors.dim}>→</Text>
            <Text color={colors.muted}>spec → plan → work</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Text dimColor>ralph plan --vibe</Text>
            <Text color={colors.dim}>→</Text>
            <Text color={colors.muted}>plan → work</Text>
          </Box>
        </Box>
      </Box>

      {/* Options */}
      <Section title="Options">
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={colors.accent}>-h, --help</Text>
            </Box>
            <Text color={colors.muted}>Show this help</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={colors.accent}>-V, --version</Text>
            </Box>
            <Text color={colors.muted}>Show version number</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Box width={16}>
              <Text color={colors.accent}>--vibe</Text>
            </Box>
            <Text color={colors.muted}>Continue automatically through workflow</Text>
          </Box>
        </Box>
      </Section>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          Run `ralph {"<command>"} --help` for more information on a specific command.
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Render Function
// ============================================================================

export async function showHelp(version: string): Promise<void> {
  const { waitUntilExit } = await render(<HelpScreen version={version} />);
  await waitUntilExit();
}
