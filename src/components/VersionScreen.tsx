/**
 * @module components/VersionScreen
 *
 * Beautiful version screen using deno-ink components.
 */

import React from 'react';
import { Box, Newline, render, Text } from '../../packages/deno-ink/src/mod.ts';

// ============================================================================
// Theme Colors
// ============================================================================

const colors = {
  brand: '#00D9FF', // Cyan - primary brand color
  accent: '#FFAA00', // Amber
  muted: '#6C7086', // Gray
  success: '#A6E3A1', // Green
  dim: '#45475A', // Darker gray
  purple: '#CBA6F7', // Purple for highlights
};

// ============================================================================
// ASCII Art Logo
// ============================================================================

const RALPH_LOGO = `
    ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗
    ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║
    ██████╔╝███████║██║     ██████╔╝███████║
    ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║
    ██║  ██║██║  ██║███████╗██║     ██║  ██║
    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝
`.trim();

// ============================================================================
// Sub-Components
// ============================================================================

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function InfoRow({ label, value, valueColor = colors.muted }: InfoRowProps): React.ReactElement {
  return (
    <Box flexDirection='row' gap={1}>
      <Box width={12}>
        <Text dimColor>{label}</Text>
      </Box>
      <Text color={valueColor}>{value}</Text>
    </Box>
  );
}

// ============================================================================
// VersionScreen Component
// ============================================================================

interface VersionScreenProps {
  version: string;
  denoVersion?: string;
  platform?: string;
  arch?: string;
}

export function VersionScreen({
  version,
  denoVersion = Deno.version.deno,
  platform = Deno.build.os,
  arch = Deno.build.arch,
}: VersionScreenProps): React.ReactElement {
  return (
    <Box flexDirection='column' padding={1}>
      {/* Main box with logo and version */}
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.brand}
        paddingX={3}
        paddingY={1}
      >
        {/* Logo */}
        <Box justifyContent='center'>
          <Text color={colors.brand}>{RALPH_LOGO}</Text>
        </Box>

        <Newline />

        {/* Tagline */}
        <Box justifyContent='center'>
          <Text color={colors.muted}>Autonomous AI Development</Text>
        </Box>

        <Newline />

        {/* Version info */}
        <Box
          flexDirection='column'
          borderStyle='single'
          borderColor={colors.dim}
          paddingX={2}
          paddingY={1}
          marginTop={1}
        >
          <InfoRow
            label='Version'
            value={`v${version}`}
            valueColor={colors.accent}
          />
          <InfoRow
            label='Deno'
            value={`v${denoVersion}`}
            valueColor={colors.success}
          />
          <InfoRow
            label='Platform'
            value={`${platform} (${arch})`}
          />
        </Box>

        <Newline />

        {/* Links */}
        <Box flexDirection='column' gap={1}>
          <Box flexDirection='row' gap={1}>
            <Text dimColor>GitHub:</Text>
            <Text color={colors.purple} underline>
              github.com/anthropics/ralph-cli
            </Text>
          </Box>
          <Box flexDirection='row' gap={1}>
            <Text dimColor>Based on:</Text>
            <Text color={colors.purple} underline>
              github.com/ghuntley/how-to-ralph-wiggum
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} justifyContent='center'>
        <Text dimColor>Made with 🤖 by Claude</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Compact Version (for quick display)
// ============================================================================

interface CompactVersionProps {
  version: string;
}

export function CompactVersion({ version }: CompactVersionProps): React.ReactElement {
  return (
    <Box flexDirection='row' gap={2} padding={1}>
      <Box
        borderStyle='round'
        borderColor={colors.brand}
        paddingX={2}
        paddingY={0}
      >
        <Text color={colors.brand} bold>RALPH</Text>
      </Box>
      <Box flexDirection='column' justifyContent='center'>
        <Box flexDirection='row' gap={1}>
          <Text dimColor>version</Text>
          <Text color={colors.accent} bold>{version}</Text>
        </Box>
        <Text color={colors.muted}>Autonomous AI Development</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Render Functions
// ============================================================================

export async function showVersion(
  version: string,
  compact = false,
): Promise<void> {
  const Component = compact
    ? () => <CompactVersion version={version} />
    : () => <VersionScreen version={version} />;

  const { waitUntilExit } = await render(<Component />);
  await waitUntilExit();
}
