/**
 * @module components/ui/FileSelector
 *
 * Reusable file selector component with keyboard navigation.
 */

import React, { useCallback, useState } from 'react';
import { Box, Text, useInput } from '../../../packages/deno-ink/src/mod.ts';
import { colors } from './theme.ts';
import { exitHints, KeyboardHints, navigationHints, selectionHints } from './KeyboardHints.tsx';

export interface SelectableFile {
  key: string;
  name: string;
  description: string;
}

export interface FileSelectorProps {
  files: SelectableFile[];
  selectedKeys: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export function FileSelector({
  files,
  selectedKeys,
  onSelectionChange,
  onConfirm,
  onCancel,
  title = 'Select files',
  subtitle,
}: FileSelectorProps): React.ReactElement {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const toggleFile = useCallback((key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  }, [selectedKeys, onSelectionChange]);

  const selectAll = useCallback(() => {
    onSelectionChange(new Set(files.map((f) => f.key)));
  }, [files, onSelectionChange]);

  const selectNone = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  useInput((input, key) => {
    if (key.upArrow) {
      setFocusedIndex((i: number) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setFocusedIndex((i: number) => Math.min(files.length - 1, i + 1));
    } else if (input === ' ') {
      const file = files[focusedIndex];
      if (file) {
        toggleFile(file.key);
      }
    } else if (key.return) {
      onConfirm();
    } else if (input === 'a' || input === 'A') {
      selectAll();
    } else if (input === 'n' || input === 'N') {
      selectNone();
    } else if (key.escape && onCancel) {
      onCancel();
    }
  });

  return (
    <Box flexDirection='column'>
      <Text bold color={colors.accent}>{title}</Text>
      {subtitle && <Text color={colors.dim}>{subtitle}</Text>}

      <Box flexDirection='column' marginTop={1}>
        {files.map((file, i) => {
          const isSelected = selectedKeys.has(file.key);
          const isFocused = i === focusedIndex;
          return (
            <React.Fragment key={file.key}>
              <Box flexDirection='row' gap={1}>
                <Text color={isFocused ? colors.accent : colors.dim}>
                  {isFocused ? '>' : ' '}
                </Text>
                <Text color={isSelected ? colors.success : colors.dim}>
                  {isSelected ? '[x]' : '[ ]'}
                </Text>
                <Text color={isSelected ? colors.text : colors.muted}>{file.name}</Text>
                <Text color={colors.dim}>- {file.description}</Text>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>

      <Box flexDirection='column' marginTop={1} gap={1}>
        <KeyboardHints hints={[...navigationHints, ...selectionHints]} />
        {onCancel && <KeyboardHints hints={exitHints} />}
      </Box>
    </Box>
  );
}
