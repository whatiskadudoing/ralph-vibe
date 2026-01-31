# Cline UI Research - Tool Activity Display Patterns

Research on Cline (formerly Claude Dev) VS Code extension's UI patterns for displaying tool/operation activity.

Repository: https://github.com/cline/cline

## Overview

Cline uses React with TypeScript, Tailwind CSS, and VS Code webview APIs to create a comprehensive chat-based interface for AI assistant interactions. The UI is built with a modular component architecture separating concerns into chat, history, settings, and common UI elements.

---

## 1. Tool Call Display Architecture

### Message Type System

Cline uses a hierarchical message routing system based on message types:

```typescript
message.type → "ask" or "say"
  ↓
message.ask/say property → specific message type
  ↓
Dedicated component renderer
```

### ChatRow Component Structure

**Location:** `webview-ui/src/components/chat/ChatRow.tsx`

The main message renderer uses:
- Memoized wrapper pattern with `ChatRow` for layout
- `ChatRowContent` for rendering logic with deep equality comparison
- Switch statement hierarchy to route to specific renderers
- Height tracking via `useSize` hook
- Invisible spacer for virtualization compatibility

### Tool Operation Components

Different components handle different tool types:

1. **DiffEditRow.tsx** - File editing operations
2. **CommandOutputRow.tsx** - Command execution
3. **BrowserSessionRow.tsx** - Browser automation
4. **ErrorRow.tsx** - Error handling
5. **ThinkingRow.tsx** - Agent reasoning display

---

## 2. File Diffs and Changes Display

### DiffEditRow Component

**Location:** `webview-ui/src/components/chat/DiffEditRow.tsx`

**Key Features:**
- Parses two patch formats (search/replace blocks and new format markers)
- Renders as expandable file blocks
- Uses Tailwind CSS color classes (no external syntax highlighting library)
- Supports streaming with auto-scroll

**Visual Structure:**
```
DiffEditRow
  └── FileBlock (expandable/collapsible)
      └── DiffLine (individual line with prefix, line numbers, content)
```

**Line Display:**
- 10px line number column (optional)
- 4px prefix indicator (+/-)
- Content span with context-aware coloring:
  - Additions: `text-green-400`, `bg-green-500/10`
  - Deletions: `text-red-400`, `bg-red-500/10`
  - Context lines: default foreground color

**Icons:** Lucide React icons (FilePlus, FileX, FileText)

**File Operations:** Opens files via `FileServiceClient.openFileRelativePath()`

---

## 3. Command Execution Display

### CommandOutputRow Component

**Location:** `webview-ui/src/components/chat/CommandOutputRow.tsx`

**Status Display:**
- `getCommandStatusText()` returns: "Running", "Pending", "Completed", or "Skipped"
- Pulsing green dot for executing states
- Warning colors for pending states

**Command Rendering:**
- Regular commands: code block with syntax highlighting
- Subagent commands: special header with extracted prompt

**Output Section:**
- Auto-scroll to bottom on updates
- Collapsible with 5-line threshold
- Detection of log file paths with clickable integration
- Pattern matching: `"📋 Output is being logged to:"`

**Controls:**
- Cancel button for background-executing commands
- Approval warnings for commands requiring permission
- Visual feedback through transitions and status colors

---

## 4. Token Counting and Cost Display

### API Metrics Tracking

**Location:** `src/shared/getApiMetrics.ts`

**Data Structure:**
```typescript
interface ApiMetrics {
  tokensIn: number
  tokensOut: number
  cacheWrites?: number  // Optional, starts undefined
  cacheReads?: number   // Optional, starts undefined
  cost: number
}
```

**Calculation Method:**
- Iterates through messages of type `"api_req_started"` and `"deleted_api_reqs"`
- Parses JSON-formatted data fields
- Accumulates values with defensive parsing (try-catch)
- Type checking before accumulation

**Display Location:**
- `ChatView.tsx` computes `apiMetrics` from messages
- Passes to `TaskSection` for display in UI
- Also tracks `lastApiReqTotalTokens`: tokensIn + tokensOut + cacheWrites + cacheReads

### Format Utilities

**Location:** `webview-ui/src/utils/format.ts`

Relevant formatters:
- `formatLargeNumber()` - Abbreviates to b/m/k format
- `formatDollars()` - Converts cents to dollar strings
- `formatCreditsBalance()` - Microcredits to credits

### History Item Display

**Location:** `webview-ui/src/components/history/HistoryViewItem.tsx`

Shows comprehensive metadata per task:
- **Cost**: Monetary value
- **Token Usage**:
  - Input tokens (↑ up arrow)
  - Output tokens (↓ down arrow)
  - Cache writes (→ right arrow)
  - Cache reads (← left arrow)
- **Timestamp**: Contextual formatting (time for today, full date for older)
- **Model ID**: When available
- **Size**: File size with export button

---

## 5. Progress Indicators and Status

### Progress Component

**Location:** `webview-ui/src/components/ui/progress.tsx`

Built on Radix UI primitives:
- Rounded background track: `bg-code-foreground/20`
- Animated fill via CSS transform: `translateX(-${100 - (value || 0)}%)`
- Smooth transitions with `transition-all`
- Height: h-3 (12px)

### Request Status Display

**Location:** `webview-ui/src/components/chat/RequestStartRow.tsx`

**Status Phases:**
1. "pre" - Initial state
2. "thinking" - Reasoning phase
3. "error" - Failed state
4. "final" - Completed

**Activity Display:**
- Shows current exploratory tool operations
- Collects tools in flight via `collectToolsInRange()`
- Only shows when no completed tools yet
- Animated "Thinking..." label with shimmer effect

### Thinking/Reasoning Display

**Location:** `webview-ui/src/components/chat/ThinkingRow.tsx`

**Features:**
- Expandable/collapsible interface
- "Thoughts" button with chevron icons
- Max height: 150px with vertical scrolling
- Left border accent in muted color
- `whitespace-pre-wrap` to preserve formatting
- Gradient fade at bottom when scrollable
- Auto-scroll during streaming
- Hidden scrollbars across browsers

### TypewriterText Effect

**Location:** `webview-ui/src/components/chat/TypewriterText.tsx`

**Implementation:**
- Character-by-character display via `useEffect` interval
- Default speed: 30ms per character
- State tracking: displayed length + completion status
- Shimmer effect on completion instead of cursor:
  ```css
  animate-shimmer bg-linear-90 from-foreground to-description bg-[length:200%_100%]
  ```
- Wrapped in `memo()` for performance
- Resets on text prop change

### Status Indicators

**Checkpoint Controls:**
- Disabled state management with visual cursor changes
- `"wait"` cursor during processing
- `"pointer"` when ready
- Tooltip overlays for confirmation UI
- Error handling with state reset

---

## 6. Code Display and Syntax Highlighting

### CodeBlock Component

**Location:** `webview-ui/src/components/common/CodeBlock.tsx`

**Features:**
- `rehype-highlight` for VSCode theme colors
- Remark plugin that defaults unmarked code to JavaScript
- Extracts language from file extensions
- Theme-aware background: `var(--vscode-editor-background, --vscode-sideBar-background, rgb(30 30 30))`

**Text Handling:**
- `forceWrap` option: `white-space: pre-wrap; word-break: break-all; overflow-wrap: anywhere`
- `min-width: max-content` for proper horizontal scrolling
- Styled-components for theming

### Copy Functionality

**Location:** `webview-ui/src/components/common/CopyButton.tsx`

**CopyButton Component:**
- `navigator.clipboard.writeText()` for copying
- "Copied" confirmation state for 1.5 seconds
- Accepts `textToCopy` prop or `onCopy` callback
- Error logging to console

**WithCopyButton Component:**
- Wrapper that overlays copy button on content
- Positions: "top-right" or "bottom-right"
- Shows on hover via CSS transitions
- Only renders if copy functionality provided

---

## 7. Markdown Rendering

### MarkdownBlock Component

**Location:** `webview-ui/src/components/common/MarkdownBlock.tsx`

**Libraries:**
- `react-remark` for markdown processing
- `rehype-highlight` for syntax highlighting

**Custom Remark Plugins:**

1. **URL Detection**: Converts plain URLs to clickable links
2. **Act Mode Highlighting**: Detects "to Act Mode" mentions, formats as bold with keyboard shortcut hint (⌘⇧A)
3. **Filename Protection**: Prevents filenames like `__init__.py` from being parsed as bold markdown
4. **File Path Detection**: Marks inline code as potential file paths for async validation

**Special Components:**
- `InlineCodeWithFileCheck`: Async file path verification, converts to clickable file openers
- `PreWithCopyButton`: Code blocks with copy functionality
- `ActModeHighlight`: Interactive span for mode toggling
- `MermaidBlock`: Diagram rendering

---

## 8. Browser Automation Display

### BrowserSessionRow Component

**Location:** `webview-ui/src/components/chat/BrowserSessionRow.tsx`

**Visual Display:**
- URL bar showing navigation state
- Screenshot area with responsive aspect ratio
- Browser cursor overlay showing click positions
- Console logs expandable section

**Session Navigation:**
- Pagination for multi-step browser actions
- Auto-advances to latest page as new actions occur
- Previous/Next buttons disabled during active browsing

**Action Types:**
- Launch browser at URL
- Click at coordinates
- Type text
- Scroll up/down
- Close browser

**State Management:**
- `useSize` hook for dimension tracking
- Memoized page organization logic
- Height change callbacks for virtualization

---

## 9. Error Handling

### ErrorRow Component

**Location:** `webview-ui/src/components/chat/ErrorRow.tsx`

**Error Categories:**

1. **API Errors**: Parses using `ClineError`, extracts provider ID, error codes, request IDs
2. **Diff Errors**: Inline message with retry indication
3. **Clineignore Errors**: Blocked file access notification
4. **Mistake Limit**: Reached limit notification

**Recovery Features:**
- Credit balance errors → dedicated `CreditLimitError` component with purchase options
- Rate limiting → error message with request ID
- PowerShell issues → link to troubleshooting docs
- Authentication → sign-in button for non-logged-in users
- Loading spinner during auth attempts

**Styling:**
- VSCode theme variables for consistency
- Text wrapping to prevent overflow
- Contextual action buttons

---

## 10. Keyboard Shortcuts

**Location:** `package.json` - `contributes.keybindings`

**Defined Shortcuts:**

1. **Submit Comment**: `Enter`
   - Context: Comment editor in Cline AI review controller
   - Condition: Comment not empty

2. **Add to Cline (with selection)**: `Cmd+'` / `Ctrl+'`
   - Context: Text selected in editor
   - Action: Send selected code to Cline

3. **Focus Chat Input**: `Cmd+'` / `Ctrl+'`
   - Context: No text selected
   - Action: Shift focus to chat input

4. **Generate Git Commit Message**: Command palette only
   - Context: Git enabled, SCM provider is Git

**Smart Design:** Same shortcut (`Cmd+'`) for different actions based on selection context

---

## 11. Navigation and Menu

### Navbar Component

**Location:** `webview-ui/src/components/menu/Navbar.tsx`

**Top Navigation Controls:**
1. **Chat** - New task (clears current via `TaskServiceClient.clearTask()`)
2. **MCP Servers** - Custom server management
3. **History** - Previous interactions
4. **Account** - User profile
5. **Settings** - App configuration

**Implementation:**
- `SETTINGS_TABS` array for maintainable navigation
- `useMemo` optimization to prevent re-renders
- Consistent icon sizing: 18px, 4px SVG dimensions, 1px stroke
- Button styling: `p-0 h-7` with icon-variant
- Tooltips on all controls

---

## Terminal UI Adaptation Patterns

### Key Patterns for Terminal Implementation

1. **Message Row Architecture**
   - Use switch/case routing for different message types
   - Memoize components to prevent re-renders
   - Track height changes for smooth scrolling
   - Use invisible spacers instead of conditional rendering

2. **Token/Cost Display**
   - Accumulate from API request messages
   - Format large numbers with abbreviations (k/m/b)
   - Show breakdown: in/out tokens, cache reads/writes
   - Display cost in currency format

3. **Progress Indicators**
   - Status phases: pre → thinking → final/error
   - Animated "thinking" state with visual indicator
   - Expandable sections for detailed output
   - Auto-scroll during streaming

4. **Diff Display**
   - Use color coding: green for additions, red for deletions
   - Line numbers optional but helpful
   - Prefix indicators: +/- for changes
   - Expandable file blocks

5. **Code Blocks**
   - Syntax highlighting with theme support
   - Copy-to-clipboard functionality
   - Word wrapping option
   - Horizontal scroll for long lines

6. **Error Handling**
   - Categorize error types
   - Provide contextual recovery actions
   - Show request IDs for tracking
   - Visual distinction from normal messages

7. **Streaming Text**
   - Character-by-character animation (~30ms/char)
   - Shimmer effect on completion
   - Auto-scroll to follow output
   - Reset on new content

### Terminal-Specific Adaptations

For terminal UI (vs VS Code webview):

1. **Layout Constraints**
   - Fixed width terminal → more aggressive text wrapping
   - No mouse hover → show controls inline or use keyboard shortcuts
   - Limited colors → use ANSI color codes strategically
   - No images → use ASCII art or text indicators

2. **Interaction Model**
   - Keyboard-first navigation
   - Single-key shortcuts for common actions
   - Tab/arrow key navigation between elements
   - Clear focus indicators

3. **Component Libraries**
   - Use Ink (React for terminal) or similar
   - Box model with flex layout
   - Text wrapping utilities
   - ANSI color support

4. **Performance**
   - Virtualize long message lists
   - Debounce rapid updates
   - Limit concurrent animations
   - Lazy load history

5. **Status Display**
   - Use spinners for loading states
   - Progress bars for percentage completion
   - Color-coded status: green (success), yellow (warning), red (error)
   - Compact token display in header/footer

---

## Specific Code Examples

### Token Display Format

```typescript
// From getApiMetrics.ts
interface ApiMetrics {
  tokensIn: number
  tokensOut: number
  cacheWrites?: number
  cacheReads?: number
  cost: number
}

// Display in history item
// ↑ 1.2k (input) ↓ 850 (output) → 500 (cache writes) ← 200 (cache reads)
// Cost: $0.05
```

### Diff Line Structure

```typescript
// Simplified DiffEditRow pattern
<div className="flex">
  <span className="w-[10px]">{lineNumber}</span>
  <span className="w-[4px]">{prefix}</span> {/* +/- */}
  <span className={`${isAddition ? 'text-green-400 bg-green-500/10' :
                      isRemoval ? 'text-red-400 bg-red-500/10' : ''}`}>
    {content}
  </span>
</div>
```

### Command Status States

```typescript
// From CommandOutputRow
type CommandStatus = "Running" | "Pending" | "Completed" | "Skipped"

// Visual indicators:
// Running: • pulsing green dot
// Pending: ⚠ warning color
// Completed: ✓ success color
// Skipped: - muted color
```

### Message Grouping

```typescript
// From ChatView
// 1. Combine hook sequences
// 2. Filter visible messages
// 3. Group low-stakes tools
// 4. Organize by API request boundaries
// 5. Render via ChatRow components
```

---

## Libraries and Tools Used

**UI Framework:**
- React with TypeScript
- Tailwind CSS for styling
- Radix UI primitives (progress, dialogs, etc.)
- Lucide React for icons

**Markdown/Code:**
- react-remark
- rehype-highlight
- pretty-bytes (file size formatting)
- styled-components (some components)

**VS Code Integration:**
- @vscode/webview-ui-toolkit
- VSCode theme variables
- FileServiceClient for file operations
- TaskServiceClient for task management

**Testing/Dev:**
- Storybook for component documentation
- Vite for bundling
- Biome for linting

---

## References

- Main Repository: https://github.com/cline/cline
- Webview UI: https://github.com/cline/cline/tree/main/webview-ui
- Chat Components: https://github.com/cline/cline/tree/main/webview-ui/src/components/chat
- Core Logic: https://github.com/cline/cline/tree/main/src/core

---

## Summary

Cline's UI excels at:
1. **Structured message routing** with type-based component rendering
2. **Comprehensive token/cost tracking** with clear breakdown display
3. **Streaming-aware components** with auto-scroll and typewriter effects
4. **File diff visualization** without heavy syntax highlighting libraries
5. **Contextual error handling** with recovery actions
6. **Keyboard-first interactions** with smart shortcut reuse
7. **Modular component architecture** for maintainability

The patterns are well-suited for adaptation to terminal UI, particularly the message routing, status display, and streaming text handling. The main adaptations needed are replacing visual hover states with keyboard navigation and using ANSI colors instead of CSS for styling.
