# UI Redesign Plan - Comprehensive Overhaul

Based on extensive analysis of the codebase, this plan addresses critical gaps and standardizes the UI across all Ralph CLI commands.

## Executive Summary

**Critical Issues Identified:**
1. Token data not being collected from Claude API result events
2. `total_cost_usd` and `modelUsage` available from CLI but not extracted
3. SpecScreen has NO live metrics (no ops, no tokens, no tools)
4. ResearchScreen missing cost tracking
5. Inconsistent keyboard shortcuts across screens
6. Four different completion layouts
7. Context window usage never displayed

---

## Phase 1: Data Flow Fixes (Critical)

### 1.1 Extract Missing Data from Claude Result Events

**File:** `src/cli/work.ts`

Current problem: Token data not returned from iteration callbacks.

```typescript
// CURRENT (broken)
return {
  success: !hasError,
  task: status?.task,
  model,
  operations: totalOps,
  durationSec,
  // NO TOKEN DATA ❌
};

// FIX: Add token extraction from result event
return {
  success: !hasError,
  task: status?.task,
  model,
  operations: totalOps,
  durationSec,
  inputTokens,       // ✅ Add
  outputTokens,      // ✅ Add
  cacheReadTokens,   // ✅ Add
  cacheWriteTokens,  // ✅ Add
  totalCostUsd,      // ✅ Add (from CLI)
  modelUsage,        // ✅ Add (context window info)
};
```

**Changes Required:**
1. Parse `usage` object from result event
2. Parse `total_cost_usd` from result event (use this instead of calculating)
3. Parse `modelUsage` for context window tracking
4. Wire all data through to WorkScreen

### 1.2 Extract modelUsage for Context Window

**File:** `src/services/claude_service.ts`

Add extraction of modelUsage metadata:
```typescript
interface ModelUsageInfo {
  contextWindow: number;
  maxOutputTokens: number;
}

// Extract from result event:
const modelUsage = data.modelUsage as Record<string, ModelUsageInfo>;
```

---

## Phase 2: Screen Standardization

### 2.1 Unified Stats Interface

Create single stats type for all screens:

```typescript
// src/components/types.ts
export interface UnifiedStats {
  operations: number;
  durationSec: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cost: CostBreakdown;
  cacheSavings: number;
  usageDelta?: number;
  contextUsed?: number;
  contextMax?: number;
}
```

### 2.2 Screen Feature Matrix (Target State)

| Feature | PlanScreen | ResearchScreen | SpecScreen | WorkScreen |
|---------|-----------|----------------|------------|------------|
| Live tokens | ✅ | ✅ | ✅ (NEW) | ✅ |
| Live cost | ✅ | ✅ (NEW) | ✅ (NEW) | ✅ |
| Live ops | ✅ | ✅ | ✅ (NEW) | ✅ |
| Tool activity | ✅ | ✅ | ✅ (NEW) | ✅ |
| Context % | ✅ (NEW) | ✅ (NEW) | ✅ (NEW) | ✅ (NEW) |
| Cache stats | ✅ | ✅ | ✅ (NEW) | ✅ |
| t toggle | ✅ | ✅ | ✅ (NEW) | ✅ |
| k toggle | ✅ | ✅ | ✅ (NEW) | ✅ |
| c toggle | ✅ | ✅ (NEW) | ✅ (NEW) | ✅ |
| x toggle | ✅ (NEW) | ✅ (NEW) | ✅ (NEW) | ✅ (NEW) |

### 2.3 Standard Keyboard Shortcuts

All screens should support:
- `t` - Toggle tools display
- `k` - Toggle token stats
- `c` - Toggle cost display
- `x` - Toggle context window (NEW)
- `u` - Toggle usage bars
- `q` - Quit

---

## Phase 3: SpecScreen Overhaul

**Current State:** SpecScreen has NO live metrics at all.

**Changes:**
1. Add `onToolUse` callback to SpecScreen props
2. Add operation counting with ref-based pattern
3. Add live token tracking
4. Add cost calculation
5. Add ToolActivity display
6. Add all keyboard toggles

**New SpecScreen structure:**
```
┌─────────────────────────────────────┐
│ Header: "Ralph Spec"                │
│ Vibe steps (if vibe mode)           │
├─────────────────────────────────────┤
│ TokenStats | CostBadge | UsageBars  │  ← NEW: Add tokens/cost
│ Context: ████░░░░ 32%               │  ← NEW: Context window
├─────────────────────────────────────┤
│ Feature hint (if provided)          │
│ ProgressLine (status + spinner)     │
│ ToolActivity (operations)           │  ← NEW: Add tool display
│ Stats: 5 ops · 23s · 12K tokens     │  ← NEW: Live stats
├─────────────────────────────────────┤
│ KeyboardHints: t k c x u q          │  ← NEW: All toggles
└─────────────────────────────────────┘
```

---

## Phase 4: ResearchScreen Cost Addition

**Changes:**
1. Add cost calculation in handleTokenUpdate
2. Add `showCost` state
3. Add 'c' keyboard toggle
4. Add CostBadge display
5. Calculate and display cacheSavings

---

## Phase 5: Context Window Display

### 5.1 Add Context Tracking

Track cumulative context usage across iterations:

```typescript
interface ContextState {
  used: number;        // Cumulative tokens in context
  max: number;         // From modelUsage.contextWindow
  percentage: number;  // For quick display
}
```

### 5.2 Add Context Display to All Screens

Use existing `ContextIndicator` component:
```tsx
<ContextIndicator used={contextUsed} max={contextMax} isGrowing={true} />
```

Display format: `ctx: 32%↑` (percentage with growth indicator)

### 5.3 Add 'x' Toggle

Add keyboard shortcut to show/hide context details:
```typescript
if (input === "x" || input === "X") {
  setShowContext((v) => !v);
}
```

---

## Phase 6: Enhanced Metrics Display

### 6.1 Use CLI's total_cost_usd

Instead of calculating locally, use the authoritative cost from Claude CLI:

```typescript
// In result event handler:
const totalCostUsd = data.total_cost_usd as number | undefined;

// Pass to UI
setCost({
  total: totalCostUsd ?? calculateLocalCost(...),
  // Keep local breakdown for display
  input: localCost.input,
  output: localCost.output,
});
```

### 6.2 Add Cache Efficiency Display

Show cache efficiency percentage:
```typescript
const efficiency = calculateCacheEfficiency({
  inputTokens,
  cacheReadTokens,
});
// Display: "💾 68% cached"
```

### 6.3 Add Cost Trend Indicator

Use existing `getCostTrend` function:
```typescript
const trend = getCostTrend(costs);
// Display: "$0.05 ↑" or "$0.05 ↓"
```

---

## Phase 7: Unified Completion Screen

### 7.1 Use SessionSummary Everywhere

Replace ad-hoc completion layouts with SessionSummary component:

```tsx
<SessionSummary
  title={getCompletionTitle()}
  stats={unifiedStats}
  outputs={outputFiles}
  nextSteps={nextSteps}
  showCompletionMessage={true}
  modelBreakdown={modelBreakdown}
/>
```

### 7.2 Standardize Completion Messages

Move fun messages to shared constant:
```typescript
const COMPLETION_MESSAGES = [
  { icon: "☕", title: "Time for that coffee!", subtitle: "Your code is freshly brewed." },
  { icon: "🚀", title: "Ready for launch!", subtitle: "Your code is built and tested." },
  // ... more
];
```

---

## Phase 8: Utility Consolidation

### 8.1 Create Shared Formatting Module

**File:** `src/utils/formatting.ts`

```typescript
export function formatTokens(count: number): string;
export function formatDuration(seconds: number): string;
export function formatCost(amount: number): string;
export function truncateText(text: string, maxLen: number): string;
```

### 8.2 Deduplicate Across Components

Remove duplicate implementations from:
- TokenStats.tsx
- SessionSummary.tsx
- StatsDisplay.tsx
- ToolActivity.tsx
- WorkScreen.tsx
- PlanScreen.tsx
- ResearchScreen.tsx

---

## Implementation Order

### Batch 1: Data Flow (Critical)
1. Fix work.ts to extract token data from result events
2. Extract total_cost_usd from Claude CLI
3. Extract modelUsage for context window

### Batch 2: SpecScreen Overhaul
1. Add callback interfaces
2. Add operation tracking
3. Add tool activity display
4. Add live stats display
5. Add all keyboard toggles

### Batch 3: ResearchScreen Cost
1. Add cost calculation
2. Add 'c' toggle
3. Display cost badge

### Batch 4: Context Window
1. Add context tracking state to all screens
2. Add ContextIndicator display
3. Add 'x' toggle

### Batch 5: Standardization
1. Create shared formatting utilities
2. Migrate all screens to use them
3. Standardize keyboard shortcuts
4. Use SessionSummary for all completions

---

## Files to Modify

### Core Data Flow
- `src/cli/work.ts` - Extract tokens from result events
- `src/services/claude_service.ts` - Parse modelUsage

### Screens
- `src/components/SpecScreen.tsx` - Complete overhaul
- `src/components/ResearchScreen.tsx` - Add cost tracking
- `src/components/PlanScreen.tsx` - Add context display
- `src/components/WorkScreen.tsx` - Add context display

### Utilities
- `src/utils/formatting.ts` - NEW: Shared formatters

### Types
- `src/components/types.ts` - NEW: Unified stats interface

---

## Success Metrics

After implementation:
1. All screens show live token/cost/ops during execution
2. Context window percentage visible on all screens
3. Keyboard shortcuts consistent across all screens
4. Same completion layout on all screens
5. Zero duplicated formatting functions
6. Token displays show actual data (not 0)
