/**
 * @module components/Callout
 *
 * Callout and highlight components using deno-ink.
 */

import React, { type ReactNode } from 'react';
import { Box, Text } from '@ink/mod.ts';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

const CALLOUT_CONFIG: Record<CalloutType, { icon: string; color: string; label: string }> = {
  note: { icon: '📝', color: 'blue', label: 'Note' },
  tip: { icon: '💡', color: 'green', label: 'Tip' },
  important: { icon: '❗', color: 'magenta', label: 'Important' },
  warning: { icon: '⚠️', color: 'yellow', label: 'Warning' },
  caution: { icon: '🚨', color: 'red', label: 'Caution' },
};

export interface CalloutProps {
  /** Callout type */
  type: CalloutType;
  /** Custom title (overrides default) */
  title?: string;
  /** Callout content */
  children: ReactNode;
}

export function Callout({ type, title, children }: CalloutProps): React.ReactElement {
  const config = CALLOUT_CONFIG[type];
  const displayTitle = title ?? config.label;

  return (
    <Box flexDirection='column'>
      <Box>
        <Text color={config.color}>{config.icon}</Text>
        <Text></Text>
        <Text bold color={config.color}>{displayTitle}</Text>
      </Box>
      <Box marginLeft={3}>
        {children}
      </Box>
    </Box>
  );
}

// Quote/blockquote
export interface QuoteProps {
  children: ReactNode;
  author?: string;
  source?: string;
}

export function Quote({ children, author, source }: QuoteProps): React.ReactElement {
  return (
    <Box flexDirection='column'>
      <Box>
        <Text color='cyan'>│</Text>
        <Text></Text>
        <Text italic>{children}</Text>
      </Box>
      {(author || source) && (
        <Box marginLeft={2}>
          <Text dimColor>
            — {author}
            {source && `, ${source}`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Highlight box (simple colored background effect)
export interface HighlightProps {
  children: ReactNode;
  color?: string;
  icon?: string;
}

export function Highlight(
  { children, color = 'yellow', icon }: HighlightProps,
): React.ReactElement {
  return (
    <Box>
      <Text color={color}>▌</Text>
      <Text></Text>
      {icon && <Text>{icon}</Text>}
      {children}
    </Box>
  );
}

// Definition (term + description)
export interface DefinitionProps {
  term: string;
  children: ReactNode;
  termColor?: string;
}

export function Definition(
  { term, children, termColor = 'cyan' }: DefinitionProps,
): React.ReactElement {
  return (
    <Box flexDirection='column'>
      <Text bold color={termColor}>{term}</Text>
      <Box marginLeft={2}>{children}</Box>
    </Box>
  );
}

// Step indicator (for tutorials/guides)
export interface StepProps {
  number: number;
  title: string;
  children?: ReactNode;
  completed?: boolean;
  active?: boolean;
}

export function Step({
  number,
  title,
  children,
  completed = false,
  active = false,
}: StepProps): React.ReactElement {
  const icon = completed ? '✓' : String(number);
  const iconColor = completed ? 'green' : active ? 'cyan' : 'gray';

  return (
    <Box flexDirection='column'>
      <Box>
        <Text color={iconColor} bold>[{icon}]</Text>
        <Text></Text>
        <Text bold={active}>{title}</Text>
      </Box>
      {children && (
        <Box marginLeft={4}>
          {children}
        </Box>
      )}
    </Box>
  );
}

// Steps container
export interface StepsProps {
  steps: Array<{
    title: string;
    description?: string;
    completed?: boolean;
  }>;
  currentStep?: number;
}

export function Steps({ steps, currentStep = 0 }: StepsProps): React.ReactElement {
  return (
    <Box flexDirection='column' gap={1}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <Step
            number={index + 1}
            title={step.title}
            completed={step.completed ?? index < currentStep}
            active={index === currentStep}
          >
            {step.description && <Text dimColor>{step.description}</Text>}
          </Step>
        </React.Fragment>
      ))}
    </Box>
  );
}

// Aside (supplementary information)
export interface AsideProps {
  children: ReactNode;
  title?: string;
}

export function Aside({ children, title }: AsideProps): React.ReactElement {
  return (
    <Box
      borderStyle='single'
      borderColor='gray'
      paddingX={1}
      flexDirection='column'
    >
      {title && <Text dimColor bold>{title}</Text>}
      <Box>
        <Text dimColor>{children}</Text>
      </Box>
    </Box>
  );
}
