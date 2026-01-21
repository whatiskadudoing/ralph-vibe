#!/usr/bin/env -S deno run --allow-env --allow-read
/**
 * UI Component Showcase
 *
 * Visual verification of all UI components.
 * Run with: deno run --allow-env --allow-read scripts/ui_showcase.ts
 */

import {
  // Theme
  theme,
  // Format
  formatDuration,
  formatTokens,
  formatBytes,
  // Colors
  amber,
  cyan,
  dim,
  bold,
  success,
  error,
  warning,
  orange,
  green,
  red,
  yellow,
  blue,
  // Box
  createBox,
  // Progress
  progressBar,
  // Status
  status,
  statusSuccess,
  statusError,
  statusWarning,
  statusPending,
  statusRunning,
  // List
  list,
  bulletList,
  numberedList,
  // Stats
  statsLine,
  stat,
  iconStat,
  // Badge
  badge,
  modelBadge,
  labelBadge,
  // Divider
  divider,
  line,
  sectionHeader,
  // Table
  table,
  keyValueTable,
  // Gradient
  gradient,
  gradientPreset,
  gradientPresets,
  brandGradient,
  // Capabilities
  getTerminalDimensions,
} from '../src/ui/mod.ts';

const termWidth = getTerminalDimensions().width;

// Helper to create a section title box
function sectionTitle(title: string): string {
  return createBox({
    content: bold(title),
    border: 'rounded',
    borderColor: amber,
    padding: { x: 2, y: 0 },
    width: 'full',
  });
}

console.log('');
console.log(createBox({
  content: [
    '',
    `     ${brandGradient('RALPH CLI')}`,
    `     ${dim('Reusable UI Component Library')}`,
    '',
  ],
  border: 'rounded',
  borderColor: orange,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Theme
// ============================================================================
console.log('');
console.log(sectionTitle('THEME - Semantic Colors'));
console.log('');
console.log(createBox({
  content: [
    `${bold('Text Colors:')}`,
    `  ${theme.text.primary('primary')}  ${theme.text.secondary('secondary')}  ${theme.text.accent('accent')}  ${theme.text.muted('muted')}`,
    '',
    `${bold('Status Colors:')}`,
    `  ${theme.status.success('success')}  ${theme.status.error('error')}  ${theme.status.warning('warning')}  ${theme.status.info('info')}  ${theme.status.pending('pending')}  ${theme.status.running('running')}`,
    '',
    `${bold('Model Colors:')}`,
    `  ${theme.models.opus('opus')}  ${theme.models.sonnet('sonnet')}  ${theme.models.haiku('haiku')}`,
    '',
    `${bold('Border Colors:')}`,
    `  ${theme.border.default('default')}  ${theme.border.active('active')}  ${theme.border.success('success')}  ${theme.border.error('error')}  ${theme.border.info('info')}`,
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Format
// ============================================================================
console.log('');
console.log(sectionTitle('FORMAT - Utility Functions'));
console.log('');
console.log(createBox({
  content: [
    `${bold('formatDuration(ms):')}`,
    `  ${formatDuration(45000)} · ${formatDuration(154000)} · ${formatDuration(3723000)}`,
    '',
    `${bold('formatTokens(count):')}`,
    `  ${formatTokens(500)} · ${formatTokens(12400)} · ${formatTokens(1234567)}`,
    '',
    `${bold('formatBytes(bytes):')}`,
    `  ${formatBytes(1024)} · ${formatBytes(1048576)} · ${formatBytes(1073741824)}`,
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Box Component
// ============================================================================
console.log('');
console.log(sectionTitle('BOX - The Fundamental Component'));
console.log('');

// Simple box
console.log(dim('  Simple box with content:'));
console.log('');
console.log(createBox({
  content: 'Hello World - This is a simple box with rounded borders.',
  border: 'rounded',
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// Box with title and icon
console.log('');
console.log(dim('  Box with title, icon, and colored border:'));
console.log('');
console.log(createBox({
  title: 'Iteration 1',
  titleIcon: '▶',
  titleColor: amber,
  content: [
    'Working on implementing the login feature...',
    '',
    `${dim('Status:')} In progress`,
    `${dim('Model:')} ${amber('opus')}`,
  ],
  border: 'rounded',
  borderColor: amber,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// Box with title and footer
console.log('');
console.log(dim('  Box with title and footer:'));
console.log('');
console.log(createBox({
  title: 'Session Complete',
  titleIcon: '✓',
  titleColor: green,
  footer: 'Press Enter to continue',
  footerColor: dim,
  content: [
    'All tasks have been completed successfully!',
    '',
    `${dim('Duration:')} 2m 34s`,
    `${dim('Operations:')} 47`,
  ],
  border: 'rounded',
  borderColor: green,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// Nested boxes
console.log('');
console.log(dim('  Nested boxes (inner box uses lighter border):'));
console.log('');

const innerToolsBox = createBox({
  title: 'Tools',
  content: [
    `${success('✓')} Read src/auth.ts`,
    `${success('✓')} Write src/login.ts`,
    `${cyan('⠋')} Run tests`,
  ],
  border: 'single',
  nested: true,
  padding: { x: 1, y: 0 },
});

console.log(createBox({
  title: 'Iteration 2',
  titleIcon: '▶',
  titleColor: amber,
  content: [
    'Implementing authentication flow...',
    '',
    innerToolsBox,
    '',
    statsLine({
      items: [
        { label: 'model', value: 'opus', color: amber },
        { label: 'ops', value: 12 },
        { label: 'time', value: '45s' },
      ],
    }),
  ],
  border: 'rounded',
  borderColor: amber,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Progress Bar
// ============================================================================
console.log('');
console.log(sectionTitle('PROGRESS BAR - Visual Progress'));
console.log('');

const barWidth = termWidth - 30;
console.log(createBox({
  content: [
    `${bold('Basic progress bars:')}`,
    '',
    `  ${progressBar({ percent: 25, width: barWidth, color: cyan })}`,
    `  ${progressBar({ percent: 50, width: barWidth, color: amber })}`,
    `  ${progressBar({ percent: 75, width: barWidth, color: green })}`,
    `  ${progressBar({ percent: 100, width: barWidth, color: success })}`,
    '',
    `${bold('With thresholds (auto-color):')}`,
    '',
    `  ${progressBar({ percent: 40, width: barWidth, thresholds: { warning: 70, danger: 90 } })}  ${dim('Normal')}`,
    `  ${progressBar({ percent: 75, width: barWidth, thresholds: { warning: 70, danger: 90 } })}  ${yellow('Warning (>70%)')}`,
    `  ${progressBar({ percent: 95, width: barWidth, thresholds: { warning: 70, danger: 90 } })}  ${red('Danger (>90%)')}`,
    '',
    `${bold('With labels:')}`,
    '',
    `  5h window   ${progressBar({ percent: 42, width: barWidth - 12, color: amber })}`,
    `  7d window   ${progressBar({ percent: 15, width: barWidth - 12, color: dim })}`,
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Status Indicators
// ============================================================================
console.log('');
console.log(sectionTitle('STATUS - Consistent Status Indicators'));
console.log('');
console.log(createBox({
  content: [
    `${bold('Status types with icons:')}`,
    '',
    `  ${statusSuccess('Build completed successfully')}`,
    `  ${statusError('Build failed with errors')}`,
    `  ${statusWarning('Low disk space warning')}`,
    `  ${status({ type: 'info', text: 'Information message' })}`,
    `  ${statusPending('Waiting to run tests')}`,
    `  ${statusRunning('Installing dependencies')}`,
    `  ${status({ type: 'skipped', text: 'Skipped optional step' })}`,
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// List Component
// ============================================================================
console.log('');
console.log(sectionTitle('LIST - Formatted Lists'));
console.log('');
console.log(createBox({
  content: [
    `${bold('Bullet list:')}`,
    bulletList(['First item', 'Second item', 'Third item'], 2),
    '',
    `${bold('Numbered list:')}`,
    numberedList(['Step one', 'Step two', 'Step three'], 2),
    '',
    `${bold('Status list (task tracker):')}`,
    list({
      items: [
        { text: 'Build project', status: 'completed' },
        { text: 'Run tests', status: 'running' },
        { text: 'Deploy to staging', status: 'pending' },
        { text: 'Optional cleanup', status: 'skipped' },
      ],
      indent: 2,
    }),
    '',
    `${bold('Nested list with status:')}`,
    list({
      items: [
        {
          text: 'Authentication',
          status: 'completed',
          subItems: [
            { text: 'Login endpoint', status: 'completed' },
            { text: 'Logout endpoint', status: 'completed' },
            { text: 'Token refresh', status: 'completed' },
          ],
        },
        {
          text: 'User Management',
          status: 'running',
          subItems: [
            { text: 'Create user', status: 'completed' },
            { text: 'Update user', status: 'running' },
            { text: 'Delete user', status: 'pending' },
          ],
        },
      ],
      style: 'arrow',
      indent: 2,
    }),
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Stats Line
// ============================================================================
console.log('');
console.log(sectionTitle('STATS LINE - Horizontal Stats Display'));
console.log('');
console.log(createBox({
  content: [
    `${bold('With labels:')}`,
    '',
    `  ${statsLine({
      items: [
        { label: 'model', value: 'opus', color: amber },
        { label: 'ops', value: 12 },
        { label: 'time', value: '45s' },
        { label: 'tokens', value: '12.4K' },
      ],
    })}`,
    '',
    `${bold('With icons (compact mode):')}`,
    '',
    `  ${statsLine({
      items: [
        { icon: '⏱', value: '2m 34s' },
        { icon: '🔄', value: '3 iterations' },
        { icon: '⚡', value: '47 ops' },
        { icon: '📊', value: '12.4K tokens' },
      ],
      compact: true,
    })}`,
    '',
    `${bold('Individual stats:')}`,
    '',
    `  ${stat('duration', '2m 34s', cyan)}  ·  ${iconStat('🔄', 3, amber)}  ·  ${stat('tokens', '12.4K')}`,
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Badges
// ============================================================================
console.log('');
console.log(sectionTitle('BADGES - Inline Indicators'));
console.log('');
console.log(createBox({
  content: [
    `${bold('Basic badges:')}`,
    '',
    `  ${badge({ text: 'opus', color: amber, icon: '●' })}   ${badge({ text: 'NEW', color: green })}   ${badge({ text: 'BETA', color: cyan })}   ${badge({ text: 'DEPRECATED', color: red })}`,
    '',
    `${bold('Model badges (predefined colors):')}`,
    '',
    `  ${modelBadge('opus')}   ${modelBadge('sonnet')}   ${modelBadge('haiku')}`,
    '',
    `${bold('Label badges:')}`,
    '',
    `  ${labelBadge('1/5', amber)}  ${labelBadge('Planning')}  ${labelBadge('v2.0.0', cyan)}`,
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Dividers
// ============================================================================
console.log('');
console.log(sectionTitle('DIVIDERS - Section Separators'));
console.log('');
console.log(createBox({
  content: [
    `${bold('Line divider:')}`,
    '',
    divider({ width: termWidth - 12, style: 'line' }),
    '',
    `${bold('Double line divider:')}`,
    '',
    divider({ width: termWidth - 12, style: 'double' }),
    '',
    `${bold('Dashed divider:')}`,
    '',
    divider({ width: termWidth - 12, style: 'dashed' }),
    '',
    `${bold('Divider with label (centered):')}`,
    '',
    divider({ width: termWidth - 12, style: 'line', label: 'Section Title', labelAlign: 'center' }),
    '',
    `${bold('Divider with label (left):')}`,
    '',
    divider({ width: termWidth - 12, style: 'line', label: 'Configuration', labelAlign: 'left' }),
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Table
// ============================================================================
console.log('');
console.log(sectionTitle('TABLE - Aligned Column Display'));
console.log('');
console.log(createBox({
  content: [
    `${bold('Basic table:')}`,
    '',
    table({
      columns: [
        { header: 'Model', width: 12 },
        { header: 'Operations', width: 12, align: 'right' },
        { header: 'Duration', width: 12, align: 'right' },
        { header: 'Tokens', width: 12, align: 'right' },
      ],
      rows: [
        ['opus', 24, '1m 23s', '45.2K'],
        ['sonnet', 12, '45s', '12.1K'],
        ['haiku', 8, '12s', '3.4K'],
      ],
      headerStyle: 'bold',
      indent: 2,
    }),
    '',
    `${bold('Key-value table:')}`,
    '',
    keyValueTable({
      'Model': 'claude-3-opus',
      'Session ID': 'abc-123-def',
      'Duration': '2m 34s',
      'Total Tokens': '57,234',
      'Cache Hits': '12,450',
    }, { indent: 2 }),
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Gradient Text
// ============================================================================
console.log('');
console.log(sectionTitle('GRADIENT - Multi-Color Text'));
console.log('');
console.log(createBox({
  content: [
    `${bold('Preset gradients:')}`,
    '',
    `  Brand:   ${gradientPreset('brand', 'RALPH CLI - Build Automation')}`,
    `  Sunset:  ${gradientPreset('sunset', 'SUNSET GRADIENT TEXT')}`,
    `  Ocean:   ${gradientPreset('ocean', 'OCEAN GRADIENT TEXT')}`,
    `  Purple:  ${gradientPreset('purple', 'PURPLE GRADIENT TEXT')}`,
    `  Rainbow: ${gradientPreset('rainbow', 'RAINBOW GRADIENT TEXT')}`,
    `  Fire:    ${gradientPreset('fire', 'FIRE GRADIENT TEXT')}`,
    `  Gold:    ${gradientPreset('gold', 'GOLD GRADIENT TEXT')}`,
    '',
    `${bold('Custom gradient:')}`,
    '',
    `  ${gradient({ text: 'Custom colors: #FF0000 to #00FF00', colors: ['#FF0000', '#FFFF00', '#00FF00'] })}`,
  ],
  border: 'rounded',
  borderColor: dim,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Composed Example: Iteration Box
// ============================================================================
console.log('');
console.log(sectionTitle('COMPOSED EXAMPLE - Iteration Box'));
console.log('');

const toolsList = list({
  items: [
    { text: 'Read src/components/auth.tsx', status: 'completed' },
    { text: 'Write src/components/login.tsx', status: 'completed' },
    { text: 'Run npm test', status: 'running' },
    { text: 'Update documentation', status: 'pending' },
  ],
});

const toolsNestedBox = createBox({
  title: 'Tools',
  content: toolsList,
  border: 'single',
  nested: true,
  padding: { x: 1, y: 0 },
});

const iterationStats = statsLine({
  items: [
    { label: 'model', value: 'opus', color: theme.models.opus },
    { label: 'ops', value: 23 },
    { label: 'time', value: formatDuration(67000) },
    { label: 'tokens', value: formatTokens(15400) },
  ],
});

console.log(createBox({
  title: 'Iteration 3',
  titleIcon: '▶',
  titleColor: amber,
  content: [
    'Implementing user authentication with OAuth2 integration...',
    '',
    toolsNestedBox,
    '',
    iterationStats,
  ],
  border: 'rounded',
  borderColor: amber,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Composed Example: Session Summary
// ============================================================================
console.log('');
console.log(sectionTitle('COMPOSED EXAMPLE - Session Summary'));
console.log('');

const summaryStats = statsLine({
  items: [
    { icon: '⏱', value: formatDuration(274000) },
    { icon: '🔄', value: '5 iterations' },
    { icon: '⚡', value: '127 ops' },
    { icon: '📊', value: formatTokens(89400) },
  ],
});

const modelsBox = createBox({
  title: 'Models Used',
  content: [
    '',
    list({
      items: [
        { text: `Opus × 3 iterations`, color: theme.models.opus },
        { text: `Sonnet × 2 iterations`, color: theme.models.sonnet },
      ],
      style: 'custom',
      bullet: '●',
    }),
    '',
  ],
  border: 'single',
  nested: true,
  padding: { x: 1, y: 0 },
});

const usageBarWidth = termWidth - 24;
const usageBox = createBox({
  title: 'Subscription Usage',
  content: [
    '',
    `${dim('5h:'.padEnd(8))}${progressBar({ percent: 67, width: usageBarWidth, color: amber })}`,
    `${dim('7d:'.padEnd(8))}${progressBar({ percent: 23, width: usageBarWidth, color: dim })}`,
    `${dim('sonnet:'.padEnd(8))}${progressBar({ percent: 12, width: usageBarWidth, color: cyan })}`,
    '',
  ],
  border: 'single',
  nested: true,
  padding: { x: 1, y: 0 },
});

const completedTasks = list({
  items: [
    { text: 'Set up project structure', status: 'completed' },
    { text: 'Implement authentication flow', status: 'completed' },
    { text: 'Add input validation', status: 'completed' },
    { text: 'Write unit tests', status: 'completed' },
    { text: 'Update API documentation', status: 'completed' },
  ],
});

console.log(createBox({
  title: 'Session Complete',
  titleIcon: '✓',
  titleColor: green,
  footer: 'Session saved: ~/.ralph/sessions/2024-01-15-abc123.json',
  footerColor: dim,
  content: [
    summaryStats,
    '',
    modelsBox,
    '',
    usageBox,
    '',
    `${bold('Completed Tasks')} ${dim('(5 tasks)')}`,
    '',
    completedTasks,
  ],
  border: 'rounded',
  borderColor: green,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Composed Example: Error State
// ============================================================================
console.log('');
console.log(sectionTitle('COMPOSED EXAMPLE - Error State'));
console.log('');

console.log(createBox({
  title: 'Build Failed',
  titleIcon: '✗',
  titleColor: red,
  content: [
    `${error('Error:')} TypeScript compilation failed`,
    '',
    `${dim('File:')} src/components/login.tsx:45:12`,
    `${dim('Error:')} Property 'onSubmit' is missing in type '{}' but required in type 'LoginFormProps'.`,
    '',
    divider({ width: termWidth - 16, style: 'line', color: dim }),
    '',
    `${bold('Suggested fixes:')}`,
    list({
      items: [
        'Add the missing onSubmit prop to the LoginForm component',
        'Check if the interface definition is correct',
        'Run `npm run typecheck` for full error list',
      ],
      style: 'arrow',
      bulletColor: orange,
      indent: 2,
    }),
  ],
  border: 'rounded',
  borderColor: red,
  padding: { x: 2, y: 1 },
  width: 'full',
}));

// ============================================================================
// Footer
// ============================================================================
console.log('');
console.log(createBox({
  content: [
    '',
    `     ${brandGradient('END OF SHOWCASE')}`,
    '',
    `     ${dim('All components are pure functions that return strings.')}`,
    `     ${dim('Import from @/ui/mod.ts to use in your application.')}`,
    '',
  ],
  border: 'rounded',
  borderColor: orange,
  padding: { x: 2, y: 1 },
  width: 'full',
}));
console.log('');
