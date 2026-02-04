/**
 * @module components/ui/ToolActivity.example
 *
 * Example usage of the enhanced ToolActivity component.
 * This file demonstrates the new features:
 * - Tree-style connectors
 * - Tool-specific icons
 * - Input previews
 * - Subagent model badges
 * - Live duration updates
 */

import React from 'react';
import { Box } from '../../../packages/deno-ink/src/mod.ts';
import { EnhancedToolActivity, type EnhancedToolCall } from './ToolActivity.tsx';

/**
 * Example tool calls showing different states and features
 */
function ExampleToolActivity(): React.ReactElement {
  const exampleTools: EnhancedToolCall[] = [
    {
      id: '1',
      name: 'Read',
      status: 'success',
      startTime: Date.now() - 5000,
      endTime: Date.now() - 4800,
      input: {
        file_path: '/Users/kadu/developer/personal-projects/ralph-cli/src/auth/session.ts',
      },
    },
    {
      id: '2',
      name: 'Edit',
      status: 'success',
      startTime: Date.now() - 4500,
      endTime: Date.now() - 4000,
      input: {
        file_path: '/Users/kadu/developer/personal-projects/ralph-cli/src/auth/session.ts',
      },
    },
    {
      id: '3',
      name: 'Task',
      status: 'success',
      startTime: Date.now() - 3500,
      endTime: Date.now() - 1200,
      subagentModel: 'sonnet',
      input: {
        description: 'analyze code structure and dependencies',
      },
    },
    {
      id: '4',
      name: 'Bash',
      status: 'running',
      startTime: Date.now() - 8000,
      input: {
        command: 'npm test',
      },
    },
  ];

  return (
    <Box flexDirection='column' padding={1}>
      <EnhancedToolActivity
        tools={exampleTools}
        maxVisible={5}
        showTimeline={true}
        showSubagents={true}
        showInputPreview={true}
        maxWidth={80}
      />
    </Box>
  );
}

export default ExampleToolActivity;

/**
 * Example output (cleaned up version):
 *
 *   ◦ Read  session.ts                         200ms ✓
 *   ~ Edit  session.ts                         500ms ✓
 *   ● Task  "analyze code structure..."        12.3s ✓
 *   $ Bash  npm test                              8s ●
 *
 *   4 operations · 21.0s · Read: 1, Edit: 1, Task: 1, Bash: 1
 */
