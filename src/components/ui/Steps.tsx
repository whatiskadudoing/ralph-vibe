/**
 * @module components/ui/Steps
 *
 * Step indicator component for multi-step flows.
 */

import React from 'react';
import { Box, Spinner, Text } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';

export type StepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface Step {
  label: string;
  status: StepStatus;
}

export interface StepsProps {
  steps: Step[];
  vertical?: boolean;
}

export function Steps({ steps, vertical = false }: StepsProps): React.ReactElement {
  return (
    <Box flexDirection={vertical ? 'column' : 'row'} gap={vertical ? 0 : 2}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          {!vertical && i > 0 && <Text color={colors.dim}>{'>'}</Text>}
          <StepItem step={step} index={i + 1} />
        </React.Fragment>
      ))}
    </Box>
  );
}

interface StepItemProps {
  step: Step;
  index: number;
}

function StepItem({ step, index }: StepItemProps): React.ReactElement {
  const getIcon = (): React.ReactElement => {
    switch (step.status) {
      case 'completed':
        return <Text color={colors.success}>✓</Text>;
      case 'active':
        return <Spinner type='dots' />;
      case 'error':
        return <Text color={colors.error}>✗</Text>;
      default:
        return <Text color={colors.dim}>{index}</Text>;
    }
  };

  const getColor = (): string => {
    switch (step.status) {
      case 'completed':
        return colors.success;
      case 'active':
        return colors.accent;
      case 'error':
        return colors.error;
      default:
        return colors.dim;
    }
  };

  return (
    <Box flexDirection='row' gap={1}>
      <Box width={2}>{getIcon()}</Box>
      <Text color={getColor()}>{step.label}</Text>
    </Box>
  );
}

// Single step indicator for vertical lists
export interface StepIndicatorProps {
  status: StepStatus;
  label: string;
  detail?: string;
}

export function StepIndicator({ status, label, detail }: StepIndicatorProps): React.ReactElement {
  const getIcon = (): React.ReactElement => {
    switch (status) {
      case 'completed':
        return <Text color={colors.success}>✓</Text>;
      case 'active':
        return <Spinner type='dots' />;
      case 'error':
        return <Text color={colors.error}>✗</Text>;
      default:
        return <Text color={colors.dim}>○</Text>;
    }
  };

  const getColor = (): string => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'active':
        return colors.muted;
      case 'error':
        return colors.error;
      default:
        return colors.dim;
    }
  };

  return (
    <Box flexDirection='row' gap={1}>
      <Box width={3}>{getIcon()}</Box>
      <Text color={getColor()}>{label}</Text>
      {detail && <Text color={colors.dim}>({detail})</Text>}
    </Box>
  );
}
