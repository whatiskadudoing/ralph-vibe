/**
 * @module components/Keyboard
 *
 * Keyboard shortcut display components using deno-ink.
 */

import React from 'react';
import { Box, Text } from '@ink/mod.ts';

export interface KeyProps {
  /** Key label (e.g., "Enter", "Ctrl", "A") */
  children: string;
  /** Key style */
  variant?: 'default' | 'primary' | 'muted';
}

export function Key({ children, variant = 'default' }: KeyProps): React.ReactElement {
  const colors = {
    default: { border: 'white', text: undefined },
    primary: { border: 'cyan', text: 'cyan' },
    muted: { border: 'gray', text: 'gray' },
  };
  const style = colors[variant];

  return (
    <Box>
      <Text color={style.border}>[</Text>
      <Text color={style.text} bold>{children}</Text>
      <Text color={style.border}>]</Text>
    </Box>
  );
}

export interface KeyComboProps {
  /** Keys in the combination */
  keys: string[];
  /** Separator between keys */
  separator?: string;
}

export function KeyCombo({ keys, separator = '+' }: KeyComboProps): React.ReactElement {
  return (
    <Box>
      {keys.map((key, index) => (
        <Box key={index}>
          {index > 0 && <Text dimColor>{separator}</Text>}
          <Key children={key} />
        </Box>
      ))}
    </Box>
  );
}

export interface ShortcutProps {
  /** Key or key combination */
  keys: string | string[];
  /** Description of what the shortcut does */
  description: string;
  /** Whether this shortcut is highlighted */
  highlighted?: boolean;
}

export function Shortcut({
  keys,
  description,
  highlighted = false,
}: ShortcutProps): React.ReactElement {
  const keyArray = typeof keys === 'string' ? [keys] : keys;

  return (
    <Box>
      <KeyCombo keys={keyArray} />
      <Text></Text>
      <Text dimColor={!highlighted}>{description}</Text>
    </Box>
  );
}

export interface ShortcutListProps {
  shortcuts: Array<{ keys: string | string[]; description: string }>;
  columns?: 1 | 2 | 3;
}

export function ShortcutList({ shortcuts }: ShortcutListProps): React.ReactElement {
  return (
    <Box flexDirection='column'>
      {shortcuts.map((shortcut, index) => (
        <React.Fragment key={index}>
          <Shortcut keys={shortcut.keys} description={shortcut.description} />
        </React.Fragment>
      ))}
    </Box>
  );
}

// Footer bar with shortcuts (like vim/nano status line)
export interface ShortcutBarProps {
  shortcuts: Array<{ key: string; label: string }>;
  separator?: string;
}

export function ShortcutBar({ shortcuts, separator = '  ' }: ShortcutBarProps): React.ReactElement {
  return (
    <Box>
      {shortcuts.map((shortcut, index) => (
        <Box key={index}>
          {index > 0 && <Text dimColor>{separator}</Text>}
          <Text inverse bold>{shortcut.key}</Text>
          <Text>{shortcut.label}</Text>
        </Box>
      ))}
    </Box>
  );
}

// Help footer (common pattern)
export function HelpFooter(): React.ReactElement {
  return (
    <ShortcutBar
      shortcuts={[
        { key: '?', label: 'Help' },
        { key: 'q', label: 'Quit' },
        { key: '↑↓', label: 'Navigate' },
        { key: 'Enter', label: 'Select' },
      ]}
    />
  );
}
