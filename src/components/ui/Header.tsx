/**
 * @module components/ui/Header
 *
 * Command header with name, description, and optional vibe mode indicator.
 */

import React from 'react';
import { Box, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';

export interface HeaderProps {
  /** Command name (e.g., "Ralph Plan") */
  name: string;
  /** Short description or model name */
  description?: string;
  /** Show vibe mode indicator with flow steps */
  vibeMode?: boolean;
  /** Current step in vibe flow (highlighted) */
  vibeCurrentStep?: string;
  /** All steps in vibe flow */
  vibeSteps?: string[];
}

export function Header({
  name,
  description,
  vibeMode = false,
  vibeCurrentStep,
  vibeSteps = [],
}: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection='column' marginBottom={1}>
      {/* Vibe mode indicator */}
      {vibeMode && vibeSteps.length > 0 && (
        <Box flexDirection='row' gap={1}>
          <Text color={colors.accent}>⚡</Text>
          <Text color={colors.accent}>Vibe</Text>
          <Text color={colors.dim}>—</Text>
          {vibeSteps.map((step, i) => (
            <React.Fragment key={step}>
              {i > 0 && <Text color={colors.dim}>→</Text>}
              <Text color={step === vibeCurrentStep ? colors.text : colors.dim}>
                {step}
              </Text>
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Main header */}
      <Box flexDirection='row' gap={1}>
        <Text color={colors.brand}>◆</Text>
        <Text bold color={colors.accent}>{name}</Text>
        {description && (
          <>
            <Text color={colors.dim}>·</Text>
            <Text color={colors.muted}>{description}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}
