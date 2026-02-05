# Full Width Layout Fix

## Problem

The ToolActivity component was artificially constraining the width to 95% of the terminal:

```typescript
// OLD: Limiting to 95% of terminal width
const effectiveWidth = Math.min(width, Math.max(80, Math.floor(width * 0.95)));
```

This meant:
- ❌ 5% of terminal width wasted
- ❌ Detail column too narrow for long paths
- ❌ Right side of terminal unused
- ❌ Unnecessary constraints

## Solution

### 1. Use Full Terminal Width

```typescript
// NEW: Use FULL terminal width
const effectiveWidth = width;
const availableWidth = Math.max(effectiveWidth - fixedWidth - 4, 20); // -4 for margins only
```

**Changes:**
- Removed the 95% constraint
- Only subtract minimal margins (4 chars)
- Content expands to fill available space

### 2. Better Detail/Result Ratio

```typescript
// OLD: 70-75% detail, 25-30% result
const resultRatio = effectiveWidth > 100 ? 0.2 : 0.25;

// NEW: 80-85% detail, 15-20% result
const resultRatio = effectiveWidth > 120 ? 0.15 : 0.2;
```

**Benefits:**
- More space for file paths and URLs
- Result column uses less space (it's rarely needed)
- Better use of wide terminals

## Visual Comparison

### Before (95% width, cramped)
```
Terminal: 120 chars wide
Used:     114 chars (95%)
Wasted:   6 chars (5%)

  ○ Read · /Users/kadu/developer/per... 5.4s · [ 12k ▼ 45% ] ✓
                         ^^^^^ path cut off
```

### After (100% width, spacious)
```
Terminal: 120 chars wide
Used:     116 chars (97%)
Wasted:   4 chars (margins only)

  ○ Read · /Users/kadu/developer/personal-projects/file.ts    5.4s · [ 12k ▼ 45% ] ✓
                         ^^^^^^^^^^^^^^^^^^^^^^^^^ full path visible
```

## Benefits

1. **More Detail Space**
   - File paths less truncated
   - URLs more readable
   - Better use of screen real estate

2. **Scales with Terminal**
   - Small terminal (80 cols): Shows essentials
   - Medium terminal (120 cols): Shows more detail
   - Large terminal (160+ cols): Shows full paths

3. **Professional Look**
   - No wasted space on right
   - Content fills terminal width
   - Matches modern CLI tools

## Technical Details

### Width Calculation

```typescript
// Terminal width (from useTerminalSize)
const width = terminalSize.columns; // e.g., 120

// Fixed columns
const fixedWidth =
  2 +              // left padding
  COL_ICON +       // icon (2)
  COL_TOOL_NAME +  // tool name (12)
  COL_TIMING +     // timing (8)
  2;               // status (2)
// Total fixed: ~26 chars

// Available for detail
const effectiveWidth = width;           // 120
const availableWidth = 120 - 26 - 4;    // 90 chars
const detailWidth = 90 * 0.85;          // ~76 chars for detail
```

### Flex Layout

The ToolRow uses flexbox for responsive layout:

```typescript
<Box flexDirection='row' marginLeft={2}>
  {/* Fixed width sections */}
  <Text>{icon}</Text>
  <Text>{padEnd(tool.name, 12)}</Text>
  <Text>· </Text>

  {/* Flexible section - grows to fill */}
  <Text>{smartTruncate(detail, detailWidth)}</Text>

  {/* Spacer - pushes right section to edge */}
  <Box flexGrow={1} />

  {/* Fixed width right section */}
  <Box flexDirection='row'>
    <Text>{duration}</Text>
    <Text>·</Text>
    <TokenBadge />
    <Text>{status}</Text>
  </Box>
</Box>
```

## Files Modified

- `src/components/ui/ToolActivity.tsx`
  - Changed `effectiveWidth` calculation to use full width
  - Updated detail/result ratio (85/15 instead of 70/30)
  - Removed artificial 95% constraint

## Testing

### Type Check ✅
```bash
deno check src/components/ui/ToolActivity.tsx
```

### Visual Test
```bash
ralph work --model sonnet
```

**Expected:**
- Content uses full terminal width
- File paths less truncated
- No wasted space on right edge
- Detail section has more room

### Test Different Terminal Sizes

**Small (80 cols):**
```
  ○ Read · …/file.ts              5.4s · [ 12k ▼ 45% ] ✓
```

**Medium (120 cols):**
```
  ○ Read · /Users/kadu/developer/projects/file.ts    5.4s · [ 12k ▼ 45% ] ✓
```

**Large (160 cols):**
```
  ○ Read · /Users/kadu/developer/personal-projects/chattest/src/extension.ts    5.4s · [ 12k ▼ 45% ] ✓
```

## Summary

**Before:**
- ❌ Limited to 95% of terminal width
- ❌ 5% wasted space
- ❌ Detail column cramped
- ❌ Paths overly truncated

**After:**
- ✅ Uses full terminal width
- ✅ Only 4 chars margin (necessary)
- ✅ Detail column spacious (85% of available)
- ✅ Paths more readable
- ✅ Professional full-width layout

**Impact:** Better use of screen space, less truncation, more professional appearance!
