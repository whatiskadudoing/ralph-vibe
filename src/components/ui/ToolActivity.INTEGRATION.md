# EnhancedToolActivity Integration Guide

## Quick Start

### 1. Import the Component

```typescript
import {
  EnhancedToolActivity,
  type EnhancedToolCall,
} from "./ui/mod.ts";
```

### 2. Use in Your Screen Component

Replace the existing ToolActivity with EnhancedToolActivity:

```typescript
// Before
{showTools && tools.length > 0 && (
  <Box marginTop={1}>
    <ToolActivity tools={tools} visible={showTools} />
  </Box>
)}

// After
{showTools && tools.length > 0 && (
  <Box marginTop={1}>
    <EnhancedToolActivity
      tools={tools}
      maxVisible={5}
      showInputPreview={true}
      showSubagents={true}
    />
  </Box>
)}
```

## Integration Examples

### WorkScreen.tsx

```typescript
// In the running phase
{phase === "running" && (
  <Box flexDirection="column">
    {/* Task title */}
    <Box flexDirection="row" gap={1} marginBottom={1}>
      <Text color={colors.accent}>[#{currentIteration}]</Text>
      <Text bold>{currentTask}</Text>
    </Box>

    {/* Stats line */}
    <Box marginBottom={1}>
      <StatsLine
        model={currentModel}
        operations={operationCount}
        startTime={startTime}
        modelBreakdown={liveModelBreakdown}
      />
    </Box>

    <ProgressLine status={status} startTime={startTime} />

    {/* Enhanced tool activity */}
    {showTools && tools.length > 0 && (
      <Box marginTop={1}>
        <EnhancedToolActivity
          tools={tools}
          maxVisible={5}
          showInputPreview={true}
          showSubagents={true}
          maxWidth={columns - 6}
        />
      </Box>
    )}
  </Box>
)}
```

### PlanScreen.tsx

```typescript
{phase === "planning" && (
  <Box flexDirection="column">
    <ProgressLine status={status} startTime={startTime} />

    {/* Enhanced tool activity */}
    {showTools && tools.length > 0 && (
      <Box marginTop={1}>
        <EnhancedToolActivity
          tools={tools}
          maxVisible={5}
          showInputPreview={true}
          maxWidth={columns - 6}
        />
      </Box>
    )}

    {/* Stats line */}
    <Box marginTop={1} flexDirection="row" gap={1}>
      <Text color={colors.accent}>{operationCount}</Text>
      <Text color={colors.dim}>operations</Text>
    </Box>
  </Box>
)}
```

## Tool Tracking Best Practices

### 1. Create Tools with Proper Status

```typescript
// When tool starts
const tool: EnhancedToolCall = {
  id: crypto.randomUUID(),
  name: "Read",
  status: "running",
  startTime: Date.now(),
  input: {
    file_path: "/path/to/file.ts",
  },
};

handleToolUse(tool);
```

### 2. Update Tool on Completion

```typescript
// When tool completes
const updatedTool: EnhancedToolCall = {
  ...tool,
  status: "success", // or "error"
  endTime: Date.now(),
  result: {
    fileSize: 1024,
  },
};

handleToolUse(updatedTool);
```

### 3. Track Subagent Models

```typescript
// For Task tools with subagents
const taskTool: EnhancedToolCall = {
  id: crypto.randomUUID(),
  name: "Task",
  status: "running",
  startTime: Date.now(),
  subagentModel: "sonnet", // Shows [sonnet] badge
  input: {
    description: "analyze code structure and dependencies",
  },
};

handleToolUse(taskTool);
```

## Advanced Usage

### Custom Width Based on Terminal Size

```typescript
import { useTerminalSize } from "../../packages/deno-ink/src/mod.ts";

const { columns } = useTerminalSize();

<EnhancedToolActivity
  tools={tools}
  maxVisible={5}
  maxWidth={Math.min(columns - 10, 120)}
/>
```

### Toggle Between Original and Enhanced

```typescript
const [useEnhanced, setUseEnhanced] = useState(true);

// In keyboard handler
if (input === "e" || input === "E") {
  setUseEnhanced((v) => !v);
}

// In render
{useEnhanced ? (
  <EnhancedToolActivity tools={tools} />
) : (
  <ToolActivity tools={tools} />
)}
```

### Conditional Features

```typescript
// Hide input preview on narrow terminals
const showPreview = columns > 80;

<EnhancedToolActivity
  tools={tools}
  showInputPreview={showPreview}
  maxWidth={columns - 10}
/>
```

## Helper Functions Usage

### Custom Tool Display

```typescript
import {
  getToolIcon,
  getToolColor,
  getInputPreview,
} from "./ui/mod.ts";

// Custom tool row
function CustomToolRow({ tool }: { tool: EnhancedToolCall }) {
  const icon = getToolIcon(tool.name);
  const color = getToolColor(tool.name);
  const preview = getInputPreview(tool, 30);

  return (
    <Box flexDirection="row">
      <Text color={color}>{icon}</Text>
      <Text> {preview}</Text>
    </Box>
  );
}
```

### Model Badge Display

```typescript
import { getModelBadge, getModelBadgeColor } from "./ui/mod.ts";

// Show model badge separately
function ModelInfo({ model }: { model?: string }) {
  if (!model) return null;

  const badge = getModelBadge(model);
  const color = getModelBadgeColor(model);

  return (
    <Text color={color}>{badge}</Text>
  );
}
```

## Migration Checklist

- [ ] Import EnhancedToolActivity
- [ ] Replace ToolActivity with EnhancedToolActivity
- [ ] Add props (maxVisible, showInputPreview, etc.)
- [ ] Test with different terminal widths
- [ ] Verify tool tracking works correctly
- [ ] Check model badges appear for Task tools
- [ ] Confirm live duration updates work
- [ ] Test with many tools (hidden count indicator)

## Troubleshooting

### Icons Not Displaying

Ensure your terminal supports emoji/unicode:
```typescript
// Fallback for terminals without emoji support
const useEmoji = Deno.env.get("TERM_PROGRAM") !== "Apple_Terminal";
```

### Tools Not Updating

Make sure you're updating the same tool instance:
```typescript
// Use consistent IDs
const toolId = crypto.randomUUID();

// Initial state
handleToolUse({ id: toolId, name: "Read", status: "running", ... });

// Update with same ID
handleToolUse({ id: toolId, name: "Read", status: "success", ... });
```

### Live Duration Not Updating

Ensure startTime is set when tool starts:
```typescript
const tool = {
  id: "...",
  name: "Bash",
  status: "running",
  startTime: Date.now(), // Required for live duration
  input: { command: "npm test" },
};
```

## Performance Tips

1. **Limit maxVisible**: Keep it at 5-10 for best performance
2. **Update only changed tools**: Don't recreate entire array
3. **Use memoization**: For expensive computations
4. **Throttle updates**: Don't update more than once per second

## Customization

### Change Icons

Edit TOOL_ICONS in ToolActivity.tsx:
```typescript
const TOOL_ICONS = {
  Read: { icon: "👁️", color: colors.info },
  Write: { icon: "✍️", color: colors.success },
  // ... etc
};
```

### Change Colors

Edit TOOL_COLORS or model colors:
```typescript
const MODEL_COLORS = {
  opus: colors.purple,
  sonnet: colors.blue,
  haiku: colors.green,
};
```

### Add New Tool Types

```typescript
// Add to TOOL_ICONS
const TOOL_ICONS = {
  // ... existing tools
  MyCustomTool: { icon: "🔧", color: colors.accent },
};

// Add case to getInputPreview
case "MyCustomTool": {
  return String(input.customField ?? "");
}
```
