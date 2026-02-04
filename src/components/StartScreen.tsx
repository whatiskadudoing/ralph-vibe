/**
 * @module components/StartScreen
 *
 * Start screen using shared UI components.
 * Options selector before launching Claude interview.
 */

import React, { useState } from 'react';
import { Box, render, Text, useApp, useInput } from '../../packages/deno-ink/src/mod.ts';
import { colors, CommandBox, Header, KeyboardHints } from './ui/mod.ts';

// ============================================================================
// Types
// ============================================================================

export interface StartOptions {
  vibeMode: boolean;
  skipAudience: boolean;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface CheckboxProps {
  label: string;
  description: string;
  checked: boolean;
  focused: boolean;
  disabled?: boolean;
}

function Checkbox(
  { label, description, checked, focused, disabled }: CheckboxProps,
): React.ReactElement {
  const textColor = disabled ? colors.dim : (checked ? colors.text : colors.muted);

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={focused ? colors.accent : colors.dim}>
        {focused ? '>' : ' '}
      </Text>
      <Text color={checked ? colors.success : colors.dim}>
        {checked ? '[x]' : '[ ]'}
      </Text>
      <Text color={textColor}>{label}</Text>
      <Text color={colors.dim}>- {description}</Text>
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface StartScreenProps {
  hasAudienceAlready: boolean;
  onConfirm: (options: StartOptions) => void;
  onCancel: () => void;
}

function StartScreen({
  hasAudienceAlready,
  onConfirm,
  onCancel,
}: StartScreenProps): React.ReactElement {
  const { exit } = useApp();

  // Options state
  const [vibeMode, setVibeMode] = useState(false);
  const [skipAudience, setSkipAudience] = useState(hasAudienceAlready);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const options = [
    {
      key: 'vibe',
      label: 'Vibe mode',
      description: 'Auto-continue to plan → work',
      checked: vibeMode,
      toggle: () => setVibeMode((v: boolean) => !v),
      disabled: false,
    },
    {
      key: 'skipAudience',
      label: 'Skip audience interview',
      description: hasAudienceAlready ? 'Already completed' : 'Jump directly to specs',
      checked: skipAudience,
      toggle: () => !hasAudienceAlready && setSkipAudience((v: boolean) => !v),
      disabled: hasAudienceAlready,
    },
  ];

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      exit();
    } else if (key.upArrow) {
      setFocusedIndex((i: number) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setFocusedIndex((i: number) => Math.min(options.length - 1, i + 1));
    } else if (input === ' ') {
      const option = options[focusedIndex];
      if (option && !option.disabled) {
        option.toggle();
      }
    } else if (key.return) {
      onConfirm({ vibeMode, skipAudience });
      exit();
    }
  });

  return (
    <CommandBox>
      <Header
        name='Ralph Start'
        description='Create your feature specifications'
        vibeMode={vibeMode}
        vibeCurrentStep='start'
        vibeSteps={vibeMode ? ['start', 'plan', 'work'] : []}
      />

      <Box flexDirection='column' marginBottom={1}>
        <Text color={colors.muted}>Select options for your interview session:</Text>
      </Box>

      <Box flexDirection='column'>
        {options.map((option, i) => (
          <React.Fragment key={option.key}>
            <Checkbox
              label={option.label}
              description={option.description}
              checked={option.checked}
              focused={i === focusedIndex}
              disabled={option.disabled}
            />
          </React.Fragment>
        ))}
      </Box>

      <Box marginTop={1}>
        <KeyboardHints
          hints={[
            { key: '↑↓', label: 'navigate' },
            { key: 'space', label: 'toggle' },
            { key: 'enter', label: 'start' },
            { key: 'esc', label: 'quit' },
          ]}
        />
      </Box>
    </CommandBox>
  );
}

// ============================================================================
// Terminal Output (after fullScreen exits)
// ============================================================================

const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[38;2;34;197;94m',
  orange: '\x1b[38;2;255;149;0m',
  amber: '\x1b[38;2;255;175;0m',
  gray: '\x1b[38;2;136;136;136m',
  dimGray: '\x1b[38;2;102;102;102m',
  cyan: '\x1b[38;2;0;255;255m',
};

export function printAudienceInterviewHeader(): void {
  console.log();
  console.log(
    `${ansi.orange}◆${ansi.reset} ${ansi.bold}Audience & JTBD Interview${ansi.reset} ${ansi.dimGray}[1/2]${ansi.reset}`,
  );
  console.log();
  console.log(
    `${ansi.dimGray}First, let's understand WHO you're building for and WHAT they need${ansi.reset}`,
  );
  console.log();
}

export function printAudienceCompleted(): void {
  console.log();
  console.log(
    `${ansi.orange}◆${ansi.reset} ${ansi.bold}Audience Documented!${ansi.reset} ${ansi.green}✓${ansi.reset}`,
  );
  console.log();
  console.log(
    `${ansi.dimGray}→${ansi.reset} ${ansi.orange}AUDIENCE_JTBD.md${ansi.reset} ${ansi.dimGray}created${ansi.reset}`,
  );
  console.log();
}

export function printSpecsInterviewHeader(isStep2: boolean): void {
  console.log();
  console.log(
    `${ansi.orange}◆${ansi.reset} ${ansi.bold}Activity Spec Interview${ansi.reset}${
      isStep2 ? ` ${ansi.dimGray}[2/2]${ansi.reset}` : ''
    }`,
  );
  console.log();
  console.log(
    `${ansi.dimGray}Now let's define the activities (features) users will do${ansi.reset}`,
  );
  console.log();
}

export function printCompletionSummary(usageInfo?: string, vibeMode?: boolean): void {
  console.log();
  console.log(`${ansi.green}${ansi.bold}✓ Specs created!${ansi.reset}`);
  console.log();
  console.log(
    `${ansi.dimGray}→${ansi.reset} Your specifications are in ${ansi.orange}specs/${ansi.reset}`,
  );

  if (usageInfo) {
    console.log(`${ansi.dimGray}→${ansi.reset} ${usageInfo}`);
  }

  if (!vibeMode) {
    console.log();
    console.log(`${ansi.bold}Next:${ansi.reset}`);
    console.log(
      `  ${ansi.orange}ralph plan${ansi.reset}${ansi.gray} to generate implementation plan${ansi.reset}`,
    );
  }
  console.log();
}

export function printCancelled(): void {
  console.log();
  console.log('Cancelled.');
  console.log();
}

export function printError(title: string, description: string): void {
  console.log();
  console.log(`${ansi.bold}\x1b[38;2;255;95;95m✗ ${title}${ansi.reset}`);
  console.log(`${ansi.dimGray}${description}${ansi.reset}`);
  console.log();
}

// ============================================================================
// Render Function
// ============================================================================

export interface RenderStartOptionsResult {
  options: StartOptions | null;
}

export async function renderStartOptions(
  hasAudienceAlready: boolean,
): Promise<RenderStartOptionsResult> {
  let result: StartOptions | null = null;
  let wasCancelled = false;

  const { waitUntilExit } = await render(
    <StartScreen
      hasAudienceAlready={hasAudienceAlready}
      onConfirm={(options: StartOptions) => {
        result = options;
      }}
      onCancel={() => {
        wasCancelled = true;
      }}
    />,
    { fullScreen: true },
  );

  await waitUntilExit();

  if (wasCancelled) {
    printCancelled();
    Deno.exit(0);
  }

  return { options: result };
}
