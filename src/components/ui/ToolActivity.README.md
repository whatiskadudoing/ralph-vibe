# ToolActivity Component

Enhanced live tool activity feed showing recent operations with beautiful formatting and detailed insights.

## Features

### Original ToolActivity Component

The standard `ToolActivity` component provides:

- Multi-column layout with status indicators
- Timing information and result metadata
- Grouped operations
- Nested task views with tree structure
- Timeline visualization
- Stats summary
- Natural language descriptions (Cursor-inspired)

### New: EnhancedToolActivity Component

The new `EnhancedToolActivity` component provides a simpler, more focused display with:

- **Tree-style connectors** (├─ and └─ for last item)
- **Tool-specific icons** with emoji/unicode symbols
- **Input previews** (file paths, commands, queries)
- **Subagent model badges** for Task tools ([opus], [sonnet], [haiku])
- **Live duration updates** for running tools
- **Clean, minimal formatting**

## Usage

### Basic Example

```tsx
import { EnhancedToolActivity, type EnhancedToolCall } from './ui/mod.ts';

const tools: EnhancedToolCall[] = [
  {
    id: '1',
    name: 'Read',
    status: 'success',
    startTime: Date.now() - 5000,
    endTime: Date.now() - 4800,
    input: { file_path: '/path/to/file.ts' },
  },
  {
    id: '2',
    name: 'Bash',
    status: 'running',
    startTime: Date.now() - 3000,
    input: { command: 'npm test' },
  },
];

<EnhancedToolActivity tools={tools} />;
```

### Output Example

```
├─ 📖 Read src/auth/session.ts                    ✓ 0.2s
├─ 📝 Edit src/auth/session.ts                    ✓ 0.5s
├─ 🤖 Task "analyze code structure..." [sonnet]   ✓ 12.3s
└─ ⚡ Bash npm test                               ⠋ 8s...
```

## Props

### EnhancedToolActivity Props

```typescript
interface EnhancedToolActivityProps {
  /** Array of tool calls to display */
  tools: EnhancedToolCall[];

  /** Maximum number of visible tools (default: 5) */
  maxVisible?: number;

  /** Show timeline visualization (default: true) */
  showTimeline?: boolean;

  /** Show subagent model badges for Task tools (default: true) */
  showSubagents?: boolean;

  /** Show input preview (file path, command, etc.) (default: true) */
  showInputPreview?: boolean;

  /** Maximum width for display (default: 80) */
  maxWidth?: number;
}
```

### EnhancedToolCall Interface

```typescript
interface EnhancedToolCall {
  /** Unique ID for React keys */
  id: string;

  /** Tool name (Read, Edit, Bash, etc.) */
  name: string;

  /** Current execution status */
  status: 'pending' | 'running' | 'success' | 'error';

  /** When the tool started (timestamp) */
  startTime?: number;

  /** When the tool completed (timestamp) */
  endTime?: number;

  /** Full input parameters */
  input: Record<string, unknown>;

  /** Model used for Task/subagent tools */
  subagentModel?: 'opus' | 'sonnet' | 'haiku' | string;

  /** Result metadata */
  result?: {
    matchCount?: number;
    linesChanged?: number;
    exitCode?: number;
    // ... etc
  };

  /** Nested tool calls (for Task tools with subagent operations) */
  nested?: EnhancedToolCall[];
}
```

## Helper Functions

### getToolIcon(name: string): string

Returns the icon for a tool name.

```typescript
getToolIcon('Read'); // "📖"
getToolIcon('Bash'); // "⚡"
getToolIcon('Task'); // "🤖"
```

### getToolColor(name: string): string

Returns the color for a tool name.

```typescript
getToolColor('Read'); // colors.info
getToolColor('Edit'); // colors.accent
```

### getInputPreview(tool: EnhancedToolCall, maxLength?: number): string

Extracts and truncates input preview from a tool.

```typescript
// For Read/Write/Edit: shows filename or last 2 path segments
getInputPreview(readTool); // "src/auth/session.ts"

// For Bash: shows command
getInputPreview(bashTool); // "npm test"

// For Task: shows description in quotes
getInputPreview(taskTool); // "analyze code structure..."
```

### getModelBadge(model?: string): string

Returns formatted model badge.

```typescript
getModelBadge('claude-sonnet-4'); // "[sonnet]"
getModelBadge('claude-opus-4'); // "[opus]"
```

### getModelBadgeColor(model?: string): string

Returns color for model badge.

```typescript
getModelBadgeColor('sonnet'); // colors.info
getModelBadgeColor('opus'); // colors.accent
```

## Tool Icons

| Tool      | Icon | Color   |
| --------- | ---- | ------- |
| Read      | 📖   | info    |
| Write     | ✏️   | success |
| Edit      | 📝   | accent  |
| Bash      | ⚡   | accent  |
| Glob      | 🔍   | info    |
| Grep      | 🔎   | info    |
| Task      | 🤖   | accent  |
| WebFetch  | 🌐   | info    |
| WebSearch | 🔍   | info    |

## Status Indicators

| Status  | Icon        | Color   |
| ------- | ----------- | ------- |
| pending | ○           | dim     |
| running | ⠋ (spinner) | accent  |
| success | ✓           | success |
| error   | ✗           | error   |

## Model Badge Colors

| Model  | Badge    | Color                |
| ------ | -------- | -------------------- |
| opus   | [opus]   | accent (purple/pink) |
| sonnet | [sonnet] | info (blue)          |
| haiku  | [haiku]  | success (green)      |

## Advanced Usage

### With Hidden Tools Indicator

When there are more tools than `maxVisible`, the component shows:

```
... 12 more tools above
├─ 📖 Read file1.ts                              ✓ 0.2s
├─ 📝 Edit file1.ts                              ✓ 0.5s
└─ ⚡ Bash npm test                              ⠋ 3s...
```

### With Subagent Badges

Task tools automatically show their model:

```
├─ 🤖 Task "analyze dependencies" [opus]         ✓ 15.2s
└─ 🤖 Task "refactor code" [sonnet]              ⠋ 5s...
```

### Without Input Preview

Set `showInputPreview={false}` for minimal display:

```
├─ 📖 Read                                       ✓ 0.2s
├─ 📝 Edit                                       ✓ 0.5s
└─ ⚡ Bash                                       ⠋ 3s...
```

## Migration from Original ToolActivity

The original `ToolActivity` component is still available and fully functional. Use `EnhancedToolActivity` when you want:

- Simpler, cleaner tree-style display
- Input previews instead of generic details
- Model badges for subagents
- Less visual complexity

Both components accept the same `EnhancedToolCall` interface, so switching is easy:

```tsx
// Before
<ToolActivity tools={tools} />

// After
<EnhancedToolActivity tools={tools} />
```

## Performance

- Live duration updates run at 1 second intervals
- Spinner animation runs at 80ms intervals
- Component only re-renders when tool data changes
- Hidden tools are not rendered (only last N tools)
