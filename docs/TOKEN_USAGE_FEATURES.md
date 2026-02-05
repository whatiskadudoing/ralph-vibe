# Token Usage & Enhanced Tool Activity Display

Complete guide to the enhanced tool activity display with token usage, cache efficiency, and model tracking.

## Overview

The tool activity display now shows rich information about each Claude API operation, including:

- **Token usage** - Input/output tokens with cache efficiency
- **Cache visualization** - Percentage or dots showing cache hit rate
- **Cost tracking** - Per-operation and aggregate costs
- **Model badges** - Which Claude model was used
- **Context warnings** - Alerts when context was truncated/summarized
- **Expandable details** - Full token breakdown on demand

## Quick Start

### Basic Token Display (Default)

```typescript
<ToolActivity
  tools={tools}
  showTokens={true}  // Default: shows token badges
/>
```

**Output:**
```
~Edit src/extension.ts  18.8s  [23.4k▼ 78%]  ✓
$Bash npm run typecheck  677ms  [127▼ 0%]   ✓
```

Format: `[totalTokens▼ cacheEfficiency%]`

### Cache Efficiency Dots

```typescript
<ToolActivity
  tools={tools}
  showCacheDots={true}  // Show dots instead of percentage
/>
```

**Output:**
```
~Edit src/extension.ts  18.8s  [23.4k▼ ●●●●○]  ✓
```

- Each dot represents 20% cache efficiency
- Color-coded: green (>70%), orange (40-70%), dim (<40%)

### Expandable Token Details

```typescript
<ToolActivity
  tools={tools}
  showTokenDetails={true}  // Show detailed breakdown
/>
```

**Output:**
```
~Edit src/extension.ts  18.8s  [23.4k▼ 78%]  ✓
  ├─ Input: 23,430 tokens (18,289 cached)
  ├─ Output: 3 tokens
  ├─ Cache write: 5,138 tokens
  └─ Cost: $0.0234 · claude-sonnet-4-5-20250929
```

### Model Badges

```typescript
<ToolActivity
  tools={tools}
  showModels={true}  // Show which model was used
/>
```

**Output:**
```
~Edit src/extension.ts  18.8s  [23.4k▼ 78%]  [sonnet]  ✓
○Read AGENTS.md         1.2s   [1.2k▼ 92%]  [opus]    ✓
```

Color-coded badges:
- `[opus]` - Orange (accent)
- `[sonnet]` - Blue (info)
- `[haiku]` - Green (success)

### Context Management Warnings

When context is truncated or summarized, a warning appears:

```
~Edit src/extension.ts  ⚠  18.8s  [23.4k▼ 78%]  ✓
  ├─ Input: 23,430 tokens
  ├─ Output: 3 tokens
  ├─ ⚠ Context truncated: Input exceeded limit
  └─ Cost: $0.0234
```

## Configuration Options

### All Available Props

```typescript
interface ToolActivityProps {
  tools: EnhancedToolCall[];

  // Display options
  maxVisible?: number;           // Max tools to show (default: 8)
  compact?: boolean;             // Single-line summary mode
  visible?: boolean;             // Toggle visibility

  // Column toggles
  showTiming?: boolean;          // Show duration column (default: true)
  showResult?: boolean;          // Show result metadata (default: true)
  showStats?: boolean;           // Show summary stats (default: true)

  // Token features (NEW)
  showTokens?: boolean;          // Show token badges (default: true)
  showTokenDetails?: boolean;    // Expandable detail rows (default: false)
  showCacheDots?: boolean;       // Dots instead of % (default: false)
  showModels?: boolean;          // Model badges (default: false)

  // Organization
  grouped?: boolean;             // Group by tool type
  showNested?: boolean;          // Show nested Task operations
  useNaturalLanguage?: boolean;  // Natural descriptions
}
```

## Display Modes

### 1. Compact Mode
Minimal single-line summary with icon counts:

```typescript
<ToolActivity tools={tools} compact={true} />
```

Output: `○ 8  ~ 4  $ 2  ☑ 1`

### 2. Standard Mode (Default)
Full detail with timing and status:

```
~Edit src/extension.ts  18.8s  ✓
$Bash npm run typecheck  677ms  ✓
```

### 3. Enhanced Mode (All Features)
Token usage, cache, cost, model, and details:

```typescript
<ToolActivity
  tools={tools}
  showTokens={true}
  showTokenDetails={true}
  showModels={true}
  showCacheDots={false}
/>
```

Output:
```
~Edit src/extension.ts  18.8s  [23.4k▼ 78%]  [sonnet]  ✓
  ├─ Input: 23,430 tokens (18,289 cached)
  ├─ Output: 3 tokens
  └─ Cost: $0.0234 · claude-sonnet-4-5-20250929

42 operations · 3m 28s · 1.2M tokens (87% cached) · $2.34
```

### 4. Visual Cache Mode
Show cache efficiency as colored dots:

```typescript
<ToolActivity
  tools={tools}
  showCacheDots={true}
/>
```

Output:
```
~Edit src/extension.ts  18.8s  [23.4k▼ ●●●●○]  ✓
○Read AGENTS.md         1.2s   [1.2k▼ ●●●●●] ✓
```

## Summary Statistics

The bottom summary line shows aggregate stats:

```
42 operations · 3m 28s · 1.2M tokens (87% cached) · $2.34
```

Components:
- **Operations count** - Total tool calls
- **Total duration** - Cumulative time
- **Token totals** - Sum of all tokens with avg cache %
- **Total cost** - Sum of all operation costs

## Token Badge Format

### Standard Badge
`[23.4k▼ 78%]`

- `23.4k` - Total tokens (input + output)
  - `k` = thousands (1,000 - 999,999)
  - `M` = millions (1,000,000+)
- `▼` - Separator
- `78%` - Cache efficiency (colored)

### Dots Badge
`[23.4k▼ ●●●●○]`

- 5 dots total, filled based on cache %
- Each dot = 20% efficiency
- Color shows overall efficiency:
  - Green (●) = >70% efficient
  - Orange (●) = 40-70% efficient
  - Dim (○) = <40% efficient

## Color Coding

### Cache Efficiency
- **Green** (>70%) - Excellent cache hit rate
- **Orange** (40-70%) - Moderate cache usage
- **Dim** (<40%) - Poor cache performance

### Model Badges
- **Orange** `[opus]` - Most capable model
- **Blue** `[sonnet]` - Balanced model
- **Green** `[haiku]` - Fastest model

### Status Indicators
- **Green ✓** - Success
- **Red ✗** - Error
- **Orange ●** - Running (spinner)
- **Dim ○** - Pending

## Integration with Work Command

Token data is automatically captured from Claude API responses:

```typescript
// work.ts automatically extracts and passes token data
const tokenUsage = {
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
  cacheReadTokens: usage.cache_read_input_tokens,
  cacheWriteTokens: usage.cache_creation_input_tokens,
  cacheEfficiency: calculateCacheEfficiencyPercent(...)
};

onToolUse({
  id: toolId,
  name: toolName,
  status: 'success',
  tokenUsage,
  costUsd: totalCostUsd,
  model: extractedModel,
  // ...
});
```

## Advanced Examples

### Development Mode
Show everything for debugging:

```typescript
<ToolActivity
  tools={tools}
  showTokens={true}
  showTokenDetails={true}
  showModels={true}
  showCacheDots={false}
  showStats={true}
/>
```

### Production Mode
Minimal, clean display:

```typescript
<ToolActivity
  tools={tools}
  showTokens={false}
  showModels={false}
  compact={false}
/>
```

### Cost Monitoring
Focus on token efficiency:

```typescript
<ToolActivity
  tools={tools}
  showTokens={true}
  showTokenDetails={true}
  showCacheDots={true}
/>
```

## Performance Considerations

- Token badges add ~15 characters per row
- Detail rows add 3-4 lines per tool when expanded
- Use `maxVisible` to limit displayed tools
- Summary stats calculate once per render (memoized)

## Browser Support

All features use standard terminal characters:
- `●` - U+25CF Black Circle
- `○` - U+25CB White Circle
- `▼` - U+25BC Black Down-Pointing Triangle
- `⚠` - U+26A0 Warning Sign

Compatible with all modern terminals.

## Troubleshooting

### Token badges not showing
- Ensure `showTokens={true}` (default)
- Verify tools have `tokenUsage` data
- Check that token extraction is working in work.ts

### Cache efficiency shows 0%
- First operation in session (no cache yet)
- New session without prompt caching
- Different base context than cached

### Model badges missing
- Set `showModels={true}` (off by default)
- Verify `model` field is populated in tool data
- Check model extraction in work.ts

### Context warnings not appearing
- Requires `showTokenDetails={true}` for full details
- Inline warning (⚠) shows without details
- Only appears if context was actually managed

## Best Practices

1. **Default setup** - Use token badges in standard mode
2. **Development** - Enable all features for debugging
3. **Production** - Minimize or hide token info for users
4. **Cost tracking** - Enable details to monitor spending
5. **Cache optimization** - Use dots to quickly spot inefficiencies

## API Reference

See `src/components/ui/ToolActivity/types.ts` for complete TypeScript definitions.

Key interfaces:
- `ToolActivityProps` - Component props
- `EnhancedToolCall` - Tool call with metadata
- `TokenUsage` - Token usage details
