# deno-ink Implementation Plan

This document outlines the missing features from the original Ink library and the implementation plan for each.

## Table of Contents

1. [High Priority Features](#high-priority-features)
   - [1.1 Console Patching](#11-console-patching)
   - [1.2 CI Detection](#12-ci-detection)
   - [1.3 measureElement Utility](#13-measureelement-utility)
2. [Medium Priority Features](#medium-priority-features)
   - [2.1 Overflow Support](#21-overflow-support)
   - [2.2 Configurable stderr Option](#22-configurable-stderr-option)
   - [2.3 Per-Side Border Dim Colors](#23-per-side-border-dim-colors)
   - [2.4 Screen Reader Support](#24-screen-reader-support)
3. [Low Priority Features](#low-priority-features)
   - [3.1 onRender Callback](#31-onrender-callback)
   - [3.2 Alternate Screen Buffer](#32-alternate-screen-buffer)
   - [3.3 truncate-end Wrap Option](#33-truncate-end-wrap-option)
4. [Style Properties to Implement](#style-properties-to-implement)
5. [Test Plan](#test-plan)

---

## High Priority Features

### 1.1 Console Patching

**What it does:** Intercepts `console.log`, `console.warn`, `console.error` during render cycles to prevent output from mixing with Ink's rendering.

**Why it's needed:** Without this, any `console.log` in components will corrupt the terminal output.

**Files to modify:**
- `src/ink.ts` - Add patch/restore logic
- `src/mod.ts` - Export option type

**Implementation:**

```typescript
// src/console-patch.ts (new file)
interface PatchedConsole {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
  restore: () => void;
}

export function patchConsole(
  write: (data: string) => void,
  writeErr: (data: string) => void
): PatchedConsole {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Buffer for intercepted output
  let buffer: Array<{ type: 'log' | 'warn' | 'error'; args: unknown[] }> = [];

  console.log = (...args: unknown[]) => {
    buffer.push({ type: 'log', args });
  };

  console.warn = (...args: unknown[]) => {
    buffer.push({ type: 'warn', args });
  };

  console.error = (...args: unknown[]) => {
    buffer.push({ type: 'error', args });
  };

  return {
    log: originalLog,
    warn: originalWarn,
    error: originalError,
    restore: () => {
      // Flush buffer to appropriate streams
      for (const { type, args } of buffer) {
        const message = args.map(a =>
          typeof a === 'string' ? a : JSON.stringify(a)
        ).join(' ') + '\n';

        if (type === 'error') {
          writeErr(message);
        } else {
          write(message);
        }
      }
      buffer = [];

      // Restore original functions
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}
```

**Changes to `src/ink.ts`:**

```typescript
// In InkOptions interface
export interface InkOptions {
  // ... existing options
  patchConsole?: boolean;  // default: true
}

// In Ink class constructor
if (options.patchConsole !== false) {
  this.patchedConsole = patchConsole(
    (data) => this.options.stdout.writeSync(encoder.encode(data)),
    (data) => Deno.stderr.writeSync(encoder.encode(data))
  );
}

// In unmount()
if (this.patchedConsole) {
  this.patchedConsole.restore();
}
```

**Tests:**

```typescript
// test/console-patch_test.tsx
Deno.test("console-patch: intercepts console.log", async () => {
  let output = "";
  const { unmount } = await render(<Text>Test</Text>, {
    patchConsole: true,
    stdout: createMockStdout((data) => { output += data; }),
  });

  console.log("intercepted message");
  unmount();

  // After unmount, the message should be flushed
  assertStringIncludes(output, "intercepted message");
});

Deno.test("console-patch: can be disabled", () => {
  // patchConsole: false should not intercept
});

Deno.test("console-patch: restores on unmount", () => {
  // Verify console functions are restored
});
```

---

### 1.2 CI Detection

**What it does:** Detects CI environments and adjusts rendering behavior:
- Disables ANSI escape codes in CI
- Writes final output only (no redraws)
- Skips terminal resize listeners

**Why it's needed:** CI logs look corrupted with ANSI codes and cursor movements.

**Files to modify:**
- `src/ci.ts` (new file)
- `src/ink.ts` - Use CI detection
- `src/log-update.ts` - Adjust behavior in CI

**Implementation:**

```typescript
// src/ci.ts (new file)
export function isCI(): boolean {
  // Check common CI environment variables
  const env = Deno.env.toObject();

  return !!(
    env.CI ||
    env.CONTINUOUS_INTEGRATION ||
    env.BUILD_NUMBER ||
    env.GITHUB_ACTIONS ||
    env.GITLAB_CI ||
    env.CIRCLECI ||
    env.TRAVIS ||
    env.JENKINS_URL ||
    env.BUILDKITE ||
    env.DRONE ||
    env.TEAMCITY_VERSION
  );
}

export function shouldUseColors(): boolean {
  const env = Deno.env.toObject();

  // Force colors if explicitly set
  if (env.FORCE_COLOR) return true;
  if (env.NO_COLOR) return false;

  // In CI without explicit setting, disable colors
  if (isCI()) return false;

  // Check if stdout is a TTY
  return Deno.stdout.isTerminal();
}
```

**Changes to rendering:**

```typescript
// In log-update.ts
import { isCI, shouldUseColors } from "./ci.ts";

export function createLogUpdate(stdout: typeof Deno.stdout) {
  const inCI = isCI();
  const useColors = shouldUseColors();

  return {
    update(content: string) {
      if (inCI) {
        // In CI: just write content without cursor manipulation
        const cleaned = useColors ? content : stripAnsi(content);
        writeSync(stdout, cleaned + "\n");
      } else {
        // Normal terminal behavior
        // ... existing implementation
      }
    },
    done() {
      // ...
    }
  };
}
```

**Tests:**

```typescript
// test/ci_test.ts
Deno.test("ci: detects GitHub Actions", () => {
  Deno.env.set("GITHUB_ACTIONS", "true");
  assertEquals(isCI(), true);
  Deno.env.delete("GITHUB_ACTIONS");
});

Deno.test("ci: detects generic CI variable", () => {
  Deno.env.set("CI", "true");
  assertEquals(isCI(), true);
  Deno.env.delete("CI");
});

Deno.test("ci: returns false when not in CI", () => {
  assertEquals(isCI(), false);
});

Deno.test("ci: respects FORCE_COLOR", () => {
  Deno.env.set("CI", "true");
  Deno.env.set("FORCE_COLOR", "1");
  assertEquals(shouldUseColors(), true);
  Deno.env.delete("CI");
  Deno.env.delete("FORCE_COLOR");
});

Deno.test("ci: respects NO_COLOR", () => {
  Deno.env.set("NO_COLOR", "1");
  assertEquals(shouldUseColors(), false);
  Deno.env.delete("NO_COLOR");
});
```

---

### 1.3 measureElement Utility

**What it does:** Measures the dimensions of a rendered Box element.

**Why it's needed:** Useful for advanced layouts that need to know element sizes after layout calculation.

**Files to modify:**
- `src/measure-element.ts` (new file)
- `src/mod.ts` - Export utility

**Implementation:**

```typescript
// src/measure-element.ts
import type { DOMElement } from "./dom.ts";

export interface ElementDimensions {
  width: number;
  height: number;
}

export function measureElement(
  element: { current: DOMElement | null }
): ElementDimensions {
  if (!element.current) {
    return { width: 0, height: 0 };
  }

  const node = element.current;
  const yogaNode = node.yogaNode;

  if (!yogaNode) {
    return { width: 0, height: 0 };
  }

  return {
    width: yogaNode.getComputedWidth(),
    height: yogaNode.getComputedHeight(),
  };
}
```

**Usage example:**

```tsx
import { useRef, useEffect, useState } from "react";
import { Box, Text, measureElement } from "deno-ink";

function MyComponent() {
  const ref = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setDimensions(measureElement(ref));
  }, []);

  return (
    <Box ref={ref} padding={2}>
      <Text>Width: {dimensions.width}, Height: {dimensions.height}</Text>
    </Box>
  );
}
```

**Tests:**

```typescript
// test/measure-element_test.tsx
Deno.test("measureElement: returns dimensions of Box", async () => {
  let measured = { width: 0, height: 0 };

  function TestComponent() {
    const ref = useRef(null);
    useEffect(() => {
      measured = measureElement(ref);
    }, []);
    return <Box ref={ref} width={20} height={5}><Text>Test</Text></Box>;
  }

  const { unmount } = await render(<TestComponent />);
  await delay(10); // Wait for effect

  assertEquals(measured.width, 20);
  assertEquals(measured.height, 5);
  unmount();
});

Deno.test("measureElement: returns 0 for null ref", () => {
  const ref = { current: null };
  const dims = measureElement(ref);
  assertEquals(dims, { width: 0, height: 0 });
});

Deno.test("measureElement: measures padding correctly", async () => {
  // Box with padding should include padding in dimensions
});
```

---

## Medium Priority Features

### 2.1 Overflow Support

**What it does:** Clips content that exceeds the Box dimensions when `overflow: "hidden"` is set.

**Why it's needed:** Essential for scrollable containers, fixed-size panels, etc.

**Files to modify:**
- `src/styles.ts` - Add overflow properties
- `src/output.ts` - Add clipping support
- `src/render-node.ts` - Apply clipping during render

**Implementation:**

```typescript
// In src/styles.ts - Add to Styles interface
export interface Styles {
  // ... existing properties
  overflow?: "visible" | "hidden";
  overflowX?: "visible" | "hidden";
  overflowY?: "visible" | "hidden";
}

// In src/output.ts - Add clipping
export class Output {
  private clipRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  pushClip(x: number, y: number, width: number, height: number): void {
    this.clipRegions.push({ x, y, width, height });
  }

  popClip(): void {
    this.clipRegions.pop();
  }

  write(x: number, y: number, text: string): void {
    // Check if position is within clip region
    const clip = this.clipRegions[this.clipRegions.length - 1];
    if (clip) {
      // Clip text to region bounds
      if (y < clip.y || y >= clip.y + clip.height) return;
      if (x >= clip.x + clip.width) return;

      // Truncate text that extends beyond clip
      const maxChars = clip.x + clip.width - x;
      if (maxChars <= 0) return;
      text = sliceAnsi(text, 0, maxChars);
    }

    // ... existing write logic
  }
}

// In src/render-node.ts - Apply overflow
function renderNode(node: DOMNode, context: RenderContext): void {
  // ... existing code

  const overflow = style.overflow || "visible";
  const overflowX = style.overflowX || overflow;
  const overflowY = style.overflowY || overflow;

  if (overflowX === "hidden" || overflowY === "hidden") {
    context.output.pushClip(x, y, width, height);
  }

  // Render children...
  for (const child of node.childNodes) {
    renderNode(child, childContext);
  }

  if (overflowX === "hidden" || overflowY === "hidden") {
    context.output.popClip();
  }
}
```

**Tests:**

```typescript
// test/overflow_test.tsx
Deno.test("overflow: hidden clips content horizontally", () => {
  const output = renderToString(
    <Box width={5} overflow="hidden">
      <Text>Hello World</Text>
    </Box>
  );
  assertEquals(output, "Hello"); // Clipped to 5 chars
});

Deno.test("overflow: hidden clips content vertically", () => {
  const output = renderToString(
    <Box height={1} overflow="hidden" flexDirection="column">
      <Text>Line 1</Text>
      <Text>Line 2</Text>
    </Box>
  );
  assertEquals(output, "Line 1"); // Only first line
});

Deno.test("overflow: visible shows all content (default)", () => {
  const output = renderToString(
    <Box width={5}>
      <Text>Hello World</Text>
    </Box>
  );
  assertStringIncludes(output, "Hello World");
});

Deno.test("overflow: nested clips work correctly", () => {
  // Test nested overflow: hidden boxes
});
```

---

### 2.2 Configurable stderr Option

**What it does:** Allows passing a custom stderr stream to render().

**Files to modify:**
- `src/ink.ts` - Add stderr to options

**Implementation:**

```typescript
// In src/ink.ts
export interface InkOptions {
  stdout?: typeof Deno.stdout;
  stdin?: typeof Deno.stdin;
  stderr?: typeof Deno.stderr;  // NEW
  // ... other options
}

// In constructor
this.stderr = options.stderr ?? Deno.stderr;

// Use this.stderr instead of Deno.stderr throughout
```

**Tests:**

```typescript
// test/stderr-option_test.tsx
Deno.test("stderr: uses custom stderr stream", async () => {
  let stderrOutput = "";
  const mockStderr = createMockStream((data) => { stderrOutput += data; });

  const { unmount } = await render(<App />, { stderr: mockStderr });
  // Trigger something that writes to stderr
  unmount();

  // Verify output went to mock stderr
});
```

---

### 2.3 Per-Side Border Dim Colors

**What it does:** Allows dimming individual border sides.

**Files to modify:**
- `src/styles.ts` - Add properties
- `src/render-node.ts` - Apply per-side dim

**Implementation:**

```typescript
// In src/styles.ts
export interface Styles {
  // ... existing
  borderDimColor?: boolean;
  borderTopDimColor?: boolean;
  borderBottomDimColor?: boolean;
  borderLeftDimColor?: boolean;
  borderRightDimColor?: boolean;
}

// In src/render-node.ts - renderBorder function
const topDim = style.borderTopDimColor ?? style.borderDimColor ?? false;
const bottomDim = style.borderBottomDimColor ?? style.borderDimColor ?? false;
const leftDim = style.borderLeftDimColor ?? style.borderDimColor ?? false;
const rightDim = style.borderRightDimColor ?? style.borderDimColor ?? false;

// Apply dim per-side when rendering borders
```

**Tests:**

```typescript
// test/border-dim_test.tsx
Deno.test("border: per-side dim colors", () => {
  const output = renderToString(
    <Box
      borderStyle="single"
      borderTopDimColor
      borderBottomDimColor={false}
    >
      <Text>Test</Text>
    </Box>
  );
  // Verify top border is dimmed, bottom is not
});
```

---

### 2.4 Screen Reader Support

**What it does:**
- Adds `useIsScreenReaderEnabled` hook
- Supports ARIA attributes on components
- Disables throttling when screen reader is active

**Files to modify:**
- `src/hooks/use-screen-reader.ts` (new file)
- `src/contexts/accessibility-context.ts` (new file)
- `src/components/Box.tsx` - Add ARIA props
- `src/components/Text.tsx` - Add ARIA props
- `src/ink.ts` - Add isScreenReaderEnabled option

**Implementation:**

```typescript
// src/contexts/accessibility-context.ts
import { createContext } from "react";

export interface AccessibilityContextValue {
  isScreenReaderEnabled: boolean;
}

export const AccessibilityContext = createContext<AccessibilityContextValue>({
  isScreenReaderEnabled: false,
});

// src/hooks/use-screen-reader.ts
import { useContext } from "react";
import { AccessibilityContext } from "../contexts/accessibility-context.ts";

export function useIsScreenReaderEnabled(): boolean {
  const { isScreenReaderEnabled } = useContext(AccessibilityContext);
  return isScreenReaderEnabled;
}

// Add to render options
export interface InkOptions {
  // ...
  isScreenReaderEnabled?: boolean;
}

// Check environment variable
const isScreenReaderEnabled = options.isScreenReaderEnabled ??
  Deno.env.get("INK_SCREEN_READER") === "1";
```

**ARIA attributes for components:**

```typescript
// In BoxProps
interface BoxProps extends Styles {
  children?: ReactNode;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
  "aria-role"?: string;
}
```

**Tests:**

```typescript
// test/screen-reader_test.tsx
Deno.test("useIsScreenReaderEnabled: returns false by default", async () => {
  let result = false;
  function TestComponent() {
    result = useIsScreenReaderEnabled();
    return <Text>Test</Text>;
  }

  const { unmount } = await render(<TestComponent />);
  assertEquals(result, false);
  unmount();
});

Deno.test("useIsScreenReaderEnabled: respects render option", async () => {
  let result = false;
  function TestComponent() {
    result = useIsScreenReaderEnabled();
    return <Text>Test</Text>;
  }

  const { unmount } = await render(<TestComponent />, {
    isScreenReaderEnabled: true,
  });
  assertEquals(result, true);
  unmount();
});

Deno.test("useIsScreenReaderEnabled: respects INK_SCREEN_READER env", async () => {
  Deno.env.set("INK_SCREEN_READER", "1");
  // Test...
  Deno.env.delete("INK_SCREEN_READER");
});
```

---

## Low Priority Features

### 3.1 onRender Callback

**What it does:** Calls a callback after each render with timing information.

**Implementation:**

```typescript
// In InkOptions
export interface InkOptions {
  onRender?: (info: { renderTime: number }) => void;
}

// In Ink class render method
const startTime = performance.now();
// ... render logic
const renderTime = performance.now() - startTime;
this.options.onRender?.({ renderTime });
```

**Tests:**

```typescript
Deno.test("onRender: called after each render", async () => {
  const renders: number[] = [];

  const { rerender, unmount } = await render(<Text>A</Text>, {
    onRender: ({ renderTime }) => renders.push(renderTime),
  });

  rerender(<Text>B</Text>);

  assertEquals(renders.length, 2);
  assert(renders[0] > 0);
  unmount();
});
```

---

### 3.2 Alternate Screen Buffer

**What it does:** Switches to alternate screen buffer on start, restores on exit (like vim/less).

**Implementation:**

```typescript
// In InkOptions
export interface InkOptions {
  useAlternateBuffer?: boolean;
}

// ANSI escape codes
const ENTER_ALT_BUFFER = "\x1b[?1049h";
const EXIT_ALT_BUFFER = "\x1b[?1049l";

// In Ink constructor
if (options.useAlternateBuffer) {
  this.writeSync(ENTER_ALT_BUFFER);
}

// In unmount
if (this.options.useAlternateBuffer) {
  this.writeSync(EXIT_ALT_BUFFER);
}
```

**Tests:**

```typescript
Deno.test("alternateBuffer: enters on render", async () => {
  let output = "";
  const mockStdout = createMockStdout((data) => { output += data; });

  const { unmount } = await render(<Text>Test</Text>, {
    stdout: mockStdout,
    useAlternateBuffer: true,
  });

  assertStringIncludes(output, "\x1b[?1049h");
  unmount();
});

Deno.test("alternateBuffer: exits on unmount", async () => {
  // Verify EXIT_ALT_BUFFER is written on unmount
});
```

---

### 3.3 truncate-end Wrap Option

**What it does:** Adds `truncate-end` as an alias for `truncate` in Text wrap options.

**Implementation:**

```typescript
// In src/components/Text.tsx - TextProps
wrap?: "wrap" | "truncate" | "truncate-end" | "truncate-middle" | "truncate-start";

// In render logic, treat "truncate-end" same as "truncate"
const effectiveWrap = wrap === "truncate-end" ? "truncate" : wrap;
```

**Tests:**

```typescript
Deno.test("text: truncate-end works same as truncate", () => {
  const output1 = renderToString(
    <Box width={7}><Text wrap="truncate">Hello World</Text></Box>
  );
  const output2 = renderToString(
    <Box width={7}><Text wrap="truncate-end">Hello World</Text></Box>
  );
  assertEquals(output1, output2);
});
```

---

## Style Properties to Implement

### maxWidth / maxHeight (Already in types, need implementation)

```typescript
// In src/styles.ts - applyStyles function
if (style.maxWidth !== undefined) {
  if (typeof style.maxWidth === "string" && style.maxWidth.endsWith("%")) {
    yogaNode.setMaxWidthPercent(parseFloat(style.maxWidth));
  } else {
    yogaNode.setMaxWidth(style.maxWidth as number);
  }
}

if (style.maxHeight !== undefined) {
  if (typeof style.maxHeight === "string" && style.maxHeight.endsWith("%")) {
    yogaNode.setMaxHeightPercent(parseFloat(style.maxHeight));
  } else {
    yogaNode.setMaxHeight(style.maxHeight as number);
  }
}
```

**Tests:**

```typescript
Deno.test("styles: maxWidth limits box width", () => {
  const output = renderToString(
    <Box maxWidth={10} width={20}>
      <Text>Test</Text>
    </Box>
  );
  // Box should be 10 wide, not 20
});

Deno.test("styles: maxWidth percentage", () => {
  const output = renderToString(
    <Box width={100}>
      <Box maxWidth="50%">
        <Text>Test</Text>
      </Box>
    </Box>
  );
  // Inner box should be 50 wide
});
```

---

## Test Plan

### New Test Files to Create

| File | Tests |
|------|-------|
| `test/console-patch_test.tsx` | Console interception, restoration |
| `test/ci_test.ts` | CI detection, color support |
| `test/measure-element_test.tsx` | Element measurement |
| `test/overflow_test.tsx` | Content clipping |
| `test/screen-reader_test.tsx` | Accessibility hook and options |
| `test/alternate-buffer_test.tsx` | Screen buffer switching |
| `test/max-dimensions_test.tsx` | maxWidth/maxHeight styles |

### Test Coverage Goals

- All new features should have >90% test coverage
- Each public API function should have at least 3 tests:
  1. Happy path
  2. Edge cases
  3. Error handling

### Integration Tests

```typescript
// test/integration_test.tsx
Deno.test("integration: full app with all features", async () => {
  // Test a complex app using multiple features together
});

Deno.test("integration: CI mode rendering", async () => {
  Deno.env.set("CI", "true");
  // Test that rendering works correctly in CI
  Deno.env.delete("CI");
});
```

---

## Implementation Order

### Phase 1: High Priority (Week 1)
1. CI Detection - Low effort, high impact
2. Console Patching - Medium effort, essential for real apps
3. measureElement - Medium effort, commonly needed

### Phase 2: Medium Priority (Week 2)
4. Configurable stderr - Low effort
5. Per-side border dim - Low effort
6. maxWidth/maxHeight implementation - Low effort
7. Overflow support - High effort, but important

### Phase 3: Low Priority & Polish (Week 3)
8. Screen reader support - Medium effort
9. onRender callback - Low effort
10. Alternate screen buffer - Low effort
11. truncate-end alias - Very low effort

---

## Success Criteria

- [ ] All 242 existing tests still pass
- [ ] New features have comprehensive tests
- [ ] Documentation updated for each feature
- [ ] No performance regression (measure with onRender)
- [ ] Works correctly in CI environments

---

## Phase 4: Ink UI Library Components

The following components are from the [ink-ui](https://github.com/vadimdemedes/ink-ui) library, which provides additional UI primitives beyond core Ink. These are nice-to-have additions that would make deno-ink more feature-complete.

### 4.1 ProgressBar Component

**What it does:** Displays a progress bar with customizable appearance.

**Props:**
```typescript
interface ProgressBarProps {
  value: number;           // 0-100 or 0-1 depending on implementation
  maxValue?: number;       // Maximum value (default: 100)
  width?: number;          // Width of the progress bar
  color?: string;          // Color of the filled portion
  backgroundColor?: string; // Color of the unfilled portion
  character?: string;      // Character for filled portion (default: "█")
  backgroundCharacter?: string; // Character for unfilled (default: "░")
}
```

**Implementation:**
```tsx
// src/components/ProgressBar.tsx
import React from "react";
import { Box, Text } from "./mod.ts";

export interface ProgressBarProps {
  value: number;
  maxValue?: number;
  width?: number;
  color?: string;
  backgroundColor?: string;
  character?: string;
  backgroundCharacter?: string;
}

export function ProgressBar({
  value,
  maxValue = 100,
  width = 20,
  color = "green",
  backgroundColor,
  character = "█",
  backgroundCharacter = "░",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const filledWidth = Math.round((percentage / 100) * width);
  const emptyWidth = width - filledWidth;

  return (
    <Box>
      <Text color={color}>{character.repeat(filledWidth)}</Text>
      <Text color={backgroundColor}>{backgroundCharacter.repeat(emptyWidth)}</Text>
    </Box>
  );
}
```

---

### 4.2 ConfirmInput Component

**What it does:** A Y/n confirmation prompt.

**Props:**
```typescript
interface ConfirmInputProps {
  onConfirm: () => void;
  onCancel: () => void;
  defaultValue?: boolean;    // Default to Yes or No
  isDisabled?: boolean;
}
```

**Implementation:**
```tsx
// src/components/ConfirmInput.tsx
import React from "react";
import { Text } from "./Text.tsx";
import { useInput } from "../hooks/use-input.ts";

export interface ConfirmInputProps {
  onConfirm: () => void;
  onCancel: () => void;
  defaultValue?: boolean;
  isDisabled?: boolean;
}

export function ConfirmInput({
  onConfirm,
  onCancel,
  defaultValue = true,
  isDisabled = false,
}: ConfirmInputProps) {
  useInput((input, key) => {
    if (isDisabled) return;

    const lowerInput = input.toLowerCase();
    if (lowerInput === "y") {
      onConfirm();
    } else if (lowerInput === "n") {
      onCancel();
    } else if (key.return) {
      if (defaultValue) {
        onConfirm();
      } else {
        onCancel();
      }
    }
  }, { isActive: !isDisabled });

  return (
    <Text>
      {defaultValue ? "(Y/n)" : "(y/N)"}
    </Text>
  );
}
```

---

### 4.3 MultiSelect Component

**What it does:** Allows selecting multiple options from a list.

**Props:**
```typescript
interface MultiSelectProps<V> {
  items: Array<{ label: string; value: V; key?: string }>;
  onSelect: (items: Array<{ label: string; value: V }>) => void;
  defaultSelected?: V[];
  limit?: number;           // Max visible items
  isFocused?: boolean;
  highlightColor?: string;
  checkCharacter?: string;  // Character for selected items
}
```

---

### 4.4 Badge Component

**What it does:** Status indicator with color variants.

**Props:**
```typescript
interface BadgeProps {
  children: React.ReactNode;
  color?: "green" | "yellow" | "red" | "blue" | "cyan" | "magenta" | string;
}
```

**Implementation:**
```tsx
// src/components/Badge.tsx
import React from "react";
import { Text } from "./Text.tsx";

export interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}

export function Badge({ children, color = "blue" }: BadgeProps) {
  return (
    <Text backgroundColor={color} color="white" bold>
      {" "}{children}{" "}
    </Text>
  );
}
```

---

### 4.5 StatusMessage Component

**What it does:** Displays a status message with variant styling.

**Props:**
```typescript
interface StatusMessageProps {
  children: React.ReactNode;
  variant: "success" | "error" | "warning" | "info";
}
```

**Implementation:**
```tsx
// src/components/StatusMessage.tsx
import React from "react";
import { Box, Text } from "./mod.ts";

const VARIANTS = {
  success: { symbol: "✔", color: "green" },
  error: { symbol: "✖", color: "red" },
  warning: { symbol: "⚠", color: "yellow" },
  info: { symbol: "ℹ", color: "blue" },
};

export interface StatusMessageProps {
  children: React.ReactNode;
  variant: keyof typeof VARIANTS;
}

export function StatusMessage({ children, variant }: StatusMessageProps) {
  const { symbol, color } = VARIANTS[variant];
  return (
    <Box>
      <Text color={color}>{symbol} </Text>
      <Text>{children}</Text>
    </Box>
  );
}
```

---

### 4.6 UnorderedList & OrderedList Components

**What they do:** Render bullet-point or numbered lists with optional nesting.

**Props:**
```typescript
interface ListProps {
  children: React.ReactNode;
  marker?: string;  // For UnorderedList: custom bullet character
}

interface ListItemProps {
  children: React.ReactNode;
}
```

---

## Phase 5: Advanced Features

### 5.1 Incremental Rendering

**What it does:** Only updates changed lines instead of redrawing the entire output.

**Why it's needed:** Performance optimization for large outputs.

**Implementation approach:**
- Track previous output lines
- Compare with new output lines
- Only rewrite lines that changed
- Use cursor positioning to update specific lines

**Files to modify:**
- `src/log-update.ts` - Add diff-based rendering

---

### 5.2 forceExit Option Rename

**Current:** `exitOnCtrlC`
**Original Ink:** Uses both names interchangeably

This is a minor naming convention difference and can remain as-is for backwards compatibility.

---

## Updated Implementation Order

### Phase 1: Core Features (Highest Priority)
1. ✅ CI Detection - Low effort, high impact
2. ✅ Console Patching - Medium effort, essential for real apps
3. ✅ measureElement - Medium effort, commonly needed
4. **useIsScreenReaderEnabled hook** - The only missing core Ink hook

### Phase 2: Render Options (High Priority)
5. Configurable stderr option - Low effort
6. onRender callback - Low effort
7. maxWidth/maxHeight implementation - Low effort

### Phase 3: Style Features (Medium Priority)
8. Per-side border dim colors - Low effort
9. Overflow support - High effort
10. Alternate screen buffer - Low effort
11. truncate-end alias - Very low effort

### Phase 4: Ink UI Components (Nice to Have)
12. ProgressBar - Low effort
13. ConfirmInput - Low effort
14. Badge - Very low effort
15. StatusMessage - Low effort
16. MultiSelect - Medium effort
17. UnorderedList/OrderedList - Low effort

### Phase 5: Performance (Future)
18. Incremental rendering - High effort

---

## Test Files Summary

| File | Status | Tests |
|------|--------|-------|
| `test/console-patch_test.tsx` | Created | Console interception, restoration |
| `test/ci_test.ts` | Created | CI detection, color support |
| `test/measure-element_test.tsx` | Created | Element measurement |
| `test/overflow_test.tsx` | Created | Content clipping |
| `test/screen-reader_test.tsx` | Created | Accessibility hook and options |
| `test/alternate-buffer_test.tsx` | Created | Screen buffer switching |
| `test/max-dimensions_test.tsx` | Created | maxWidth/maxHeight styles |
| `test/stderr_test.tsx` | Created | stderr option |
| `test/on-render_test.tsx` | Created | onRender callback |
| `test/border-dim-sides_test.tsx` | Created | Per-side border dim |
| `test/truncate_test.tsx` | Created | Truncation modes |
| `test/progress-bar_test.tsx` | TODO | ProgressBar component |
| `test/confirm-input_test.tsx` | TODO | ConfirmInput component |
| `test/multi-select_test.tsx` | TODO | MultiSelect component |
| `test/badge_test.tsx` | TODO | Badge component |
| `test/status-message_test.tsx` | TODO | StatusMessage component |
| `test/list_test.tsx` | TODO | List components |
