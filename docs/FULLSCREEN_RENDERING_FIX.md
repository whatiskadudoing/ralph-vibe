# Fullscreen Rendering Fix

## Issue Summary

**Date**: January 2026
**Affected**: deno-ink fullscreen mode rendering
**Symptom**: Frames duplicating/stacking vertically instead of overwriting

## Problem Description

When running ralph-cli in fullscreen mode, the UI would show duplicate frames stacking down the screen instead of properly overwriting the previous frame.

### Symptoms Observed

1. **Initial bug**: Hundreds of duplicate box borders stacking
2. **After CLEAR_SCREEN fix**: Complete frames duplicating (made it worse)

```
╭──────────────────────────────────────────────────────────────────╮
│  Content of frame 1                                              │
╰──────────────────────────────────────────────────────────────────╯
╭──────────────────────────────────────────────────────────────────╮
│  Content of frame 2                                              │
╰──────────────────────────────────────────────────────────────────╯
... (repeating)
```

## Root Cause Analysis

The fullscreen rendering was not properly positioning the cursor at the start of each render. Several approaches were tried:

### Approach 1: CURSOR_HOME only (buggy)

```typescript
frameBuffer += CURSOR_HOME;  // \x1b[H - Move to home position
// ... write lines with newlines
```

**Problem**: Cursor position was not being reset properly, causing accumulation.

### Approach 2: CLEAR_SCREEN + CURSOR_HOME (worse)

```typescript
frameBuffer += CLEAR_SCREEN + CURSOR_HOME;  // \x1b[2J\x1b[H
// ... write lines
```

**Problem**: Made it worse - complete frames duplicated. The clear screen wasn't affecting the correct buffer area.

### Approach 3: Explicit absolute positioning with newlines (still buggy)

```typescript
frameBuffer += "\x1b[1;1H";  // Move to row 1, col 1
// ... write lines with newlines between them
```

**Problem**: The newlines between lines still caused cursor state issues.

## Solution: Explicit Per-Line Cursor Positioning

The fix uses **explicit absolute cursor positioning for every single line**:

```typescript
if (this.options.fullScreen) {
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // Position cursor at row (i+1), column 1 - ANSI uses 1-based indexing
    frameBuffer += `\x1b[${i + 1};1H`;
    // Write line content and clear to end of line
    frameBuffer += lines[i] + CLEAR_TO_EOL;
  }

  // Position cursor after last content line and clear everything below
  frameBuffer += `\x1b[${lines.length + 1};1H`;
  frameBuffer += "\x1b[J";  // Clear from cursor to end of screen

  this.writeSync(frameBuffer);
  // ...
}
```

### Why This Works

1. **No reliance on cursor state**: Each line gets absolute positioning `\x1b[row;1H`
2. **No newlines needed**: Cursor positioning moves to the next row explicitly
3. **Clear to EOL**: Each line clears any remaining old content on that row
4. **Clear below**: After all lines, clear from cursor to end of screen removes old content

### ANSI Escape Sequences Used

| Sequence | Description |
|----------|-------------|
| `\x1b[{row};{col}H` | Move cursor to absolute position (1-based) |
| `\x1b[K` | Clear from cursor to end of line |
| `\x1b[J` | Clear from cursor to end of screen |

## Files Modified

- `packages/deno-ink/src/ink.ts` - Fullscreen render logic in `render()` method

## How to Identify This Issue

If you see this issue again, look for:

1. **Visual symptom**: Content stacking/accumulating instead of replacing
2. **Pattern**: Multiple frames visible at once, stacked vertically
3. **Trigger**: Happens during any rerender in fullscreen mode
4. **Mode**: Only in fullscreen mode (`fullScreen: true` option)

## Debugging Tips

If investigating similar issues:

1. **Add debug logging to stderr** (not stdout, which would interfere):
   ```typescript
   Deno.stderr.writeSync(new TextEncoder().encode(`Render: height=${lines.length}\n`));
   ```

2. **Log the raw escape sequences**:
   ```typescript
   const debugBuffer = frameBuffer.replace(/\x1b/g, '\\x1b');
   Deno.stderr.writeSync(new TextEncoder().encode(`Buffer: ${debugBuffer.slice(0, 200)}\n`));
   ```

3. **Verify alternate screen buffer is working**:
   ```bash
   # Test if alternate screen works
   printf '\x1b[?1049h'  # Enter alt screen
   printf '\x1b[1;1H'    # Position at row 1, col 1
   echo "Test line 1"
   printf '\x1b[2;1H'    # Position at row 2, col 1
   echo "Test line 2"
   sleep 2
   printf '\x1b[?1049l'  # Exit alt screen
   ```

4. **Check if something else writes to stdout**:
   - Console.log calls during render
   - Other async operations writing output
   - Third-party libraries printing

## Related Links

- ANSI escape codes reference: https://en.wikipedia.org/wiki/ANSI_escape_code
- VT100 terminal control: https://vt100.net/docs/vt100-ug/chapter3.html
