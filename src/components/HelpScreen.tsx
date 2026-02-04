/**
 * @module components/HelpScreen
 *
 * Beautiful help screen using deno-ink components.
 */

import React from 'react';
import { Box, Text } from '../../packages/deno-ink/src/mod.ts';

// ============================================================================
// Theme Colors - Orange Theme
// ============================================================================

const colors = {
  brand: '#FF9500', // Orange - primary brand color
  accent: '#FF9500', // Orange - for commands
  muted: '#888888', // Gray - for descriptions
  success: '#22C55E', // Green
  dim: '#666666', // Darker gray
};

// ============================================================================
// Mascot
// ============================================================================

const RALPH_MASCOT = [
  '    ▄▄▄▄▄▄▄    ',
  '  ▄█████████▄  ',
  ' ███ ▀███▀ ███ ',
  ' █████████████ ',
  '   ▀█▄▄▄▄▄█▀   ',
  '    █ █ █ █    ',
  '   ▀       ▀   ',
];

// ============================================================================
// Sub-Components
// ============================================================================

interface CommandRowProps {
  name: string;
  description: string;
  flags?: string;
}

function CommandRow({ name, description, flags }: CommandRowProps): React.ReactElement {
  return (
    <Box flexDirection='row'>
      <Box width={10}>
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
  children?: React.ReactNode;
}

function Section({ title, children }: SectionProps): React.ReactElement {
  return (
    <Box flexDirection='column' marginBottom={1}>
      <Text bold color={colors.brand}>{title}</Text>
      <Box flexDirection='column' paddingLeft={2}>
        {children}
      </Box>
    </Box>
  );
}

// ============================================================================
// HelpScreen Component
// ============================================================================

export interface HelpScreenProps {
  version: string;
}

export function HelpScreen({ version }: HelpScreenProps): React.ReactElement {
  return (
    <Box flexDirection='column' padding={1}>
      {/* Header with mascot */}
      <Box flexDirection='row' marginBottom={1}>
        <Box flexDirection='column' marginRight={3}>
          {RALPH_MASCOT.map((line, i) => <Text key={i} color={colors.brand}>{line}</Text>)}
        </Box>
        <Box flexDirection='column' justifyContent='center'>
          <Text bold color={colors.brand}>Ralph CLI</Text>
          <Text color={colors.muted}>Autonomous AI Development</Text>
          <Text dimColor>v{version}</Text>
        </Box>
      </Box>

      {/* Usage */}
      <Section title='Usage'>
        <Text>
          <Text color={colors.accent}>ralph</Text> <Text dimColor>{'<command>'} [options]</Text>
        </Text>
        <Text>
          <Text color={colors.accent}>ralph</Text> <Text dimColor>{'<command>'}</Text>{' '}
          <Text color={colors.success}>--vibe</Text>
        </Text>
      </Section>

      {/* Commands */}
      <Section title='Commands'>
        <CommandRow name='init' description='Initialize a new Ralph project' />
        <CommandRow name='start' description='Interactive interview to create first specs' />
        <CommandRow name='spec' description='Add a new feature spec via interview' />
        <CommandRow name='plan' description='Generate implementation plan from specs' />
        <CommandRow name='work' description='Run the autonomous build loop' />
      </Section>

      {/* Vibe Mode */}
      <Section title='Vibe Mode'>
        <Text color={colors.muted}>Add --vibe to continue automatically:</Text>
        <Box paddingLeft={2} flexDirection='column'>
          <Text>
            <Text dimColor>ralph init --vibe</Text> <Text color={colors.dim}>→</Text>{' '}
            <Text color={colors.muted}>init → start → plan → work</Text>
          </Text>
          <Text>
            <Text dimColor>ralph spec --vibe</Text> <Text color={colors.dim}>→</Text>{' '}
            <Text color={colors.muted}>spec → plan → work</Text>
          </Text>
          <Text>
            <Text dimColor>ralph plan --vibe</Text> <Text color={colors.dim}>→</Text>{' '}
            <Text color={colors.muted}>plan → work</Text>
          </Text>
        </Box>
      </Section>

      {/* Options */}
      <Section title='Options'>
        <Box flexDirection='row'>
          <Box width={16}>
            <Text color={colors.accent}>-h, --help</Text>
          </Box>
          <Text color={colors.muted}>Show this help</Text>
        </Box>
        <Box flexDirection='row'>
          <Box width={16}>
            <Text color={colors.accent}>-v, --version</Text>
          </Box>
          <Text color={colors.muted}>Show version with mascot</Text>
        </Box>
      </Section>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>Run `ralph {'<command>'} --help` for command details</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Render Function
// ============================================================================

export async function renderHelp(version: string): Promise<void> {
  const { render } = await import('@ink/testing/index.ts');
  const result = await render(<HelpScreen version={version} />);
  console.log(result.lastFrame());
}
