# Ralph CLI - Comprehensive Reactive UI Implementation Plan

## Executive Summary

This plan transforms Ralph CLI into a fully reactive, Ink-based terminal application with:
- **Unified reactive UI** across all commands (research, plan, spec, work)
- **Real-time stats display** (tokens, costs, operations, time)
- **Static console output** for completed operations (persists in scrollback)
- **End-of-command summaries** with comprehensive statistics
- **Consistent UX patterns** across the entire CLI

---

## Current State Analysis

### Commands & Their Current UI Approach

| Command | Current UI | Reactive? | Ink-based? | Stats Display |
|---------|------------|-----------|------------|---------------|
| `init` | Ink React | Yes | Yes | None (no API calls) |
| `start` | Ink + Interactive | Partial | Partial | Usage delta only |
| `spec` | Console boxes | No | No | Usage delta only |
| `research` | Custom renderer | Partial | No | Basic tokens |
| `plan` | Ink React | Yes | Yes | Tokens + tools |
| `work` | Ink React | Yes | Yes | Full stats |

### Key Findings

1. **Cost Calculator Exists But NOT Integrated**
   - Full pricing for Opus ($15/$75), Sonnet ($3/$15), Haiku ($0.80/$4)
   - Cache efficiency calculation ready
   - Cost breakdown functions ready
   - **Currently unused in any UI**

2. **Token Data Only Available After Iteration Completes**
   - Claude CLI streams events but tokens come in `result` event only
   - Can't show live token count during streaming
   - CAN show: operations, elapsed time, tool activity, status text

3. **Inconsistent Patterns Across Commands**
   - `work` has the best UI (15 state variables, comprehensive)
   - `spec` and `research` use old console.log approach
   - No shared state management pattern

4. **Existing Component Library is Rich**
   - 60+ React components available
   - TokenStats, UsageBars, ToolActivity, ProgressLine all exist
   - Just need to apply them consistently

---

## Target Architecture

### Rendering Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│  REACTIVE UI (Ink/React)                                        │
│  - Updates in real-time during operations                       │
│  - Shows live: operations, time, tools, status                  │
│  - Shows after iteration: tokens, cost, cache efficiency        │
│  - Erased when operation completes                              │
├─────────────────────────────────────────────────────────────────┤
│  STATIC OUTPUT (useFinalOutput + Static component)              │
│  - Persists in terminal scrollback                              │
│  - Command summaries with all stats                             │
│  - Error messages that need to be visible                       │
│  - Completed iteration logs                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Information Hierarchy (All Commands)

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Ralph [Command]          [model: opus]    [vibe mode: ───>] │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ STATS BAR (updates after each iteration)                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tokens: 45.2K (↑32.1K ↓13.1K)  Cost: $0.48  Cache: 83%     │ │
│ │ ███████████░░░░░░░░░ 5h: 45%   ████████░░░░░░░░░░ 7d: 32%  │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ COMPLETED ITEMS (Static - persist in scrollback)                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ✓ Task 1: Add login endpoint      opus  12 ops  2.3K  $0.12│ │
│ │ ✓ Task 2: Create middleware       sonnet 8 ops  1.8K  $0.05│ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ CURRENT ACTIVITY (Reactive - updates in real-time)              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⠋ Task 3: Implement session handling                        │ │
│ │   opus • 5 ops • 45s                                        │ │
│ │   ├─ Read src/auth/session.ts                    ✓ 0.2s    │ │
│ │   ├─ Edit src/auth/session.ts                    ✓ 0.5s    │ │
│ │   └─ Bash npm test                               ⠋ 12s...  │ │
│ │                                                              │ │
│ │   "Running authentication tests..."                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ KEYBOARD HINTS                                                  │
│   t: toggle tools  k: toggle tokens  u: refresh usage  q: quit │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Unified Stats System

### 1.1 Create Shared Stats Context

**File: `src/contexts/StatsContext.tsx`**

```typescript
interface SessionStats {
  // Cumulative across all iterations
  totalIterations: number;
  totalOperations: number;
  totalDurationSec: number;

  // Token tracking
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;

  // Cost tracking (NEW)
  totalCost: CostBreakdown;
  cacheEfficiency: number;  // percentage
  cacheSavings: number;     // dollars saved

  // Model breakdown
  modelUsage: {
    opus: { operations: number; tokens: number; cost: number };
    sonnet: { operations: number; tokens: number; cost: number };
    haiku: { operations: number; tokens: number; cost: number };
  };

  // Subscription usage
  usageBefore: SubscriptionUsage;
  usageAfter: SubscriptionUsage;
  usageDelta: { fiveHour: number; sevenDay: number };
}

interface CurrentIterationStats {
  iteration: number;
  task: string;
  model: 'opus' | 'sonnet' | 'haiku';
  startTime: number;
  operations: number;
  tools: EnhancedToolCall[];
  status: string;
  // Tokens only available after completion
  tokens?: TokenUsage;
  cost?: CostBreakdown;
}
```

### 1.2 Integrate Cost Calculator

**Update: `src/ui/claude_renderer.ts`**

```typescript
import { calculateCostBreakdown, calculateCacheSavings } from '../services/cost_calculator.ts';

function extractUsageWithCost(data: Record<string, unknown>, model: string): UsageStatsWithCost {
  const usage = extractUsage(data, stats);

  if (usage.inputTokens && usage.outputTokens) {
    const costBreakdown = calculateCostBreakdown({
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
    }, model);

    return {
      ...usage,
      cost: costBreakdown,
      cacheEfficiency: calculateCacheEfficiency(usage),
      cacheSavings: calculateCacheSavings(usage, model),
    };
  }

  return usage;
}
```

### 1.3 Create StatsBar Component

**File: `src/components/ui/StatsBar.tsx`**

```typescript
interface StatsBarProps {
  tokens: { input: number; output: number; cacheRead?: number };
  cost?: CostBreakdown;
  cacheEfficiency?: number;
  usage?: SubscriptionUsage;
  showCost?: boolean;  // default: true
  compact?: boolean;   // for smaller displays
}

export function StatsBar({ tokens, cost, cacheEfficiency, usage, showCost = true }: StatsBarProps) {
  return (
    <Box flexDirection="column" gap={0}>
      {/* Token + Cost line */}
      <Box gap={2}>
        <Text>
          <Text color={theme.tokens.total}>Tokens:</Text>{' '}
          <Text bold>{formatTokens(tokens.input + tokens.output)}</Text>
          <Text dimColor> (↑{formatTokens(tokens.input)} ↓{formatTokens(tokens.output)})</Text>
        </Text>

        {showCost && cost && (
          <Text>
            <Text color={theme.cost}>Cost:</Text>{' '}
            <Text bold color={getCostColor(cost.total)}>{formatCost(cost.total)}</Text>
          </Text>
        )}

        {cacheEfficiency !== undefined && (
          <Text>
            <Text color={theme.cache}>Cache:</Text>{' '}
            <Text bold color="green">{cacheEfficiency.toFixed(0)}%</Text>
          </Text>
        )}
      </Box>

      {/* Usage bars */}
      {usage && <UsageBars usage={usage} />}
    </Box>
  );
}
```

---

## Phase 2: Standardize All Commands to Ink

### 2.1 Convert `ralph spec` to Ink

**Current:** Console boxes + interactive Claude
**Target:** Full Ink screen like `plan`

```typescript
// src/components/SpecScreen.tsx
export function SpecScreen({
  featureHint,
  vibeMode,
  usage,
  onComplete
}: SpecScreenProps) {
  const [phase, setPhase] = useState<'interview' | 'done' | 'error'>('interview');
  const [stats, setStats] = useState<IterationStats | null>(null);

  return (
    <CommandBox name="Ralph Spec" description="Add new feature specifications">
      <Header vibeMode={vibeMode} vibeSteps={['spec', 'research', 'plan', 'work']} />

      <StatsBar
        tokens={stats?.tokens ?? { input: 0, output: 0 }}
        cost={stats?.cost}
        usage={usage}
      />

      {phase === 'interview' && (
        <Box flexDirection="column">
          <ProgressLine status="Interactive interview in progress..." />
          <Text dimColor>Claude is asking questions about your feature...</Text>
        </Box>
      )}

      {phase === 'done' && (
        <SessionSummary
          title="Spec Created!"
          stats={stats}
          outputs={['specs/new-feature.md']}
          nextSteps={vibeMode ? null : ['Review spec', 'ralph plan', 'ralph work']}
        />
      )}
    </CommandBox>
  );
}
```

### 2.2 Convert `ralph research` to Ink

**Current:** Custom renderer with console.log
**Target:** Full Ink screen with tool activity

```typescript
// src/components/ResearchScreen.tsx
export function ResearchScreen({
  model,
  vibeMode,
  usage,
  onRun,
  onComplete
}: ResearchScreenProps) {
  const [phase, setPhase] = useState<'researching' | 'done' | 'error'>('researching');
  const [tools, setTools] = useState<EnhancedToolCall[]>([]);
  const [status, setStatus] = useState('Starting research...');
  const [stats, setStats] = useState<IterationStats | null>(null);

  return (
    <CommandBox
      name="Ralph Research"
      description="Discover APIs, find inspiration, validate approaches"
      animateBorder={phase === 'researching'}
    >
      <Header model={model} vibeMode={vibeMode} />

      <StatsBar
        tokens={stats?.tokens ?? { input: 0, output: 0 }}
        cost={stats?.cost}
        usage={usage}
      />

      {phase === 'researching' && (
        <>
          <ProgressLine status={status} />
          <ToolActivity tools={tools} maxVisible={6} showTimeline />
        </>
      )}

      {phase === 'done' && (
        <SessionSummary
          title="Research Complete!"
          stats={stats}
          outputs={['research/apis/', 'research/approaches/', 'research/readiness.md']}
          nextSteps={vibeMode ? null : ['Review research', 'ralph plan']}
        />
      )}
    </CommandBox>
  );
}
```

### 2.3 Enhance `ralph start` with Better Stats

**Current:** Partial Ink with usage delta
**Target:** Full stats display with interview phases

```typescript
// Enhanced StartScreen with interview tracking
export function StartScreen({
  hasAudienceAlready,
  vibeMode,
  usage,
  onConfirm,
  onCancel
}: StartScreenProps) {
  const [phase, setPhase] = useState<'options' | 'audience' | 'specs' | 'done'>('options');
  const [audienceStats, setAudienceStats] = useState<IterationStats | null>(null);
  const [specsStats, setSpecsStats] = useState<IterationStats | null>(null);

  // Show cumulative stats during multi-phase interview
  const cumulativeStats = combineStats([audienceStats, specsStats].filter(Boolean));

  return (
    <CommandBox name="Ralph Start" description="Create specifications from interview">
      {phase !== 'options' && (
        <StatsBar
          tokens={cumulativeStats.tokens}
          cost={cumulativeStats.cost}
          usage={usage}
        />
      )}

      {phase === 'audience' && (
        <Box flexDirection="column">
          <Text bold color="cyan">[1/2] Audience & JTBD Interview</Text>
          <ProgressLine status="Discussing your target audience..." />
        </Box>
      )}

      {phase === 'specs' && (
        <Box flexDirection="column">
          {audienceStats && (
            <Static items={[audienceStats]}>
              {(s) => <CompletedPhase title="Audience Interview" stats={s} />}
            </Static>
          )}
          <Text bold color="cyan">[2/2] Activity Spec Interview</Text>
          <ProgressLine status="Defining your feature specifications..." />
        </Box>
      )}

      {phase === 'done' && (
        <SessionSummary
          title="Specs Created!"
          stats={cumulativeStats}
          outputs={['AUDIENCE_JTBD.md', 'specs/*.md']}
          nextSteps={vibeMode ? null : ['Review specs', 'ralph plan', 'ralph work']}
        />
      )}
    </CommandBox>
  );
}
```

---

## Phase 3: End-of-Command Summaries

### 3.1 Create SessionSummary Component

**File: `src/components/ui/SessionSummary.tsx`**

```typescript
interface SessionSummaryProps {
  title: string;
  stats: SessionStats;
  outputs?: string[];
  nextSteps?: string[] | null;
  sessionFile?: string;
  showCost?: boolean;
}

export function SessionSummary({
  title,
  stats,
  outputs,
  nextSteps,
  sessionFile,
  showCost = true
}: SessionSummaryProps) {
  const completionMessages = [
    "Time for that coffee!",
    "Go touch some grass!",
    "Ship it!",
    "Another one bites the dust!",
    "That's a wrap!",
  ];
  const randomMessage = completionMessages[Math.floor(Math.random() * completionMessages.length)];

  return (
    <Box flexDirection="column" gap={1}>
      {/* Success header */}
      <Box gap={1}>
        <Text color="green">✓</Text>
        <Text bold color="green">{title}</Text>
        <Text dimColor>— {randomMessage}</Text>
      </Box>

      {/* Stats grid */}
      <Box flexDirection="column" paddingLeft={2}>
        <Text>
          <Text dimColor>Duration:</Text> {formatDuration(stats.totalDurationSec)}
          <Text dimColor>  Iterations:</Text> {stats.totalIterations}
          <Text dimColor>  Operations:</Text> {stats.totalOperations}
        </Text>

        <Text>
          <Text dimColor>Tokens:</Text> {formatTokens(stats.totalInputTokens + stats.totalOutputTokens)}
          <Text dimColor> (↑{formatTokens(stats.totalInputTokens)} ↓{formatTokens(stats.totalOutputTokens)})</Text>
        </Text>

        {stats.totalCacheReadTokens > 0 && (
          <Text>
            <Text dimColor>Cache:</Text> {formatTokens(stats.totalCacheReadTokens)} read
            <Text color="green"> ({stats.cacheEfficiency.toFixed(0)}% efficiency)</Text>
            <Text dimColor> saved</Text> <Text color="green">{formatCost(stats.cacheSavings)}</Text>
          </Text>
        )}

        {showCost && (
          <Text>
            <Text dimColor>Cost:</Text> <Text bold>{formatCost(stats.totalCost.total)}</Text>
            <Text dimColor> (input: {formatCost(stats.totalCost.input)}, output: {formatCost(stats.totalCost.output)})</Text>
          </Text>
        )}

        {/* Model breakdown */}
        {Object.entries(stats.modelUsage).filter(([_, v]) => v.operations > 0).length > 1 && (
          <Text>
            <Text dimColor>Models:</Text>{' '}
            {Object.entries(stats.modelUsage)
              .filter(([_, v]) => v.operations > 0)
              .map(([model, v]) => `${model}: ${v.operations} ops`)
              .join(', ')}
          </Text>
        )}

        {/* Usage delta */}
        {stats.usageDelta && (
          <Text>
            <Text dimColor>Usage:</Text> 5h +{stats.usageDelta.fiveHour.toFixed(1)}%
            <Text dimColor> · </Text>7d +{stats.usageDelta.sevenDay.toFixed(1)}%
          </Text>
        )}
      </Box>

      {/* Outputs */}
      {outputs && outputs.length > 0 && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text dimColor>Outputs:</Text>
          {outputs.map((output, i) => (
            <Text key={i}>  <Text color="cyan">{output}</Text></Text>
          ))}
        </Box>
      )}

      {/* Next steps */}
      {nextSteps && nextSteps.length > 0 && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text dimColor>Next steps:</Text>
          {nextSteps.map((step, i) => (
            <Text key={i}>  <Text color="amber">▸</Text> {step}</Text>
          ))}
        </Box>
      )}

      {/* Session file */}
      {sessionFile && (
        <Text paddingLeft={2} dimColor>
          Session: {sessionFile}
        </Text>
      )}
    </Box>
  );
}
```

### 3.2 Static Final Output Builder

**File: `src/utils/final-output.ts`**

```typescript
export function buildFinalOutput(stats: SessionStats, options: FinalOutputOptions): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(colors.green(`✓ ${options.title}`));
  lines.push('');

  // Stats section
  lines.push(colors.dim('─'.repeat(50)));
  lines.push(`  Duration: ${formatDuration(stats.totalDurationSec)}  |  Iterations: ${stats.totalIterations}  |  Operations: ${stats.totalOperations}`);
  lines.push(`  Tokens: ${formatTokens(stats.totalInputTokens + stats.totalOutputTokens)} (↑${formatTokens(stats.totalInputTokens)} ↓${formatTokens(stats.totalOutputTokens)})`);

  if (stats.cacheEfficiency > 0) {
    lines.push(`  Cache: ${stats.cacheEfficiency.toFixed(0)}% efficiency, saved ${formatCost(stats.cacheSavings)}`);
  }

  if (options.showCost) {
    lines.push(`  Cost: ${formatCost(stats.totalCost.total)}`);
  }

  lines.push(colors.dim('─'.repeat(50)));

  // Outputs
  if (options.outputs?.length) {
    lines.push('');
    lines.push(colors.dim('Outputs:'));
    options.outputs.forEach(output => {
      lines.push(`  ${colors.cyan(output)}`);
    });
  }

  // Next steps
  if (options.nextSteps?.length) {
    lines.push('');
    lines.push(colors.dim('Next:'));
    options.nextSteps.forEach(step => {
      lines.push(`  ${colors.amber('▸')} ${step}`);
    });
  }

  lines.push('');
  return lines.join('\n');
}
```

---

## Phase 4: Enhanced Tool Activity Display

### 4.1 Improved ToolActivity Component

**File: `src/components/ui/ToolActivity.tsx`**

```typescript
interface EnhancedToolCall {
  id: string;
  name: string;
  status: 'running' | 'success' | 'error';
  startTime: number;
  endTime?: number;
  input?: Record<string, unknown>;
  subagentModel?: 'opus' | 'sonnet' | 'haiku';
  error?: string;
}

interface ToolActivityProps {
  tools: EnhancedToolCall[];
  maxVisible?: number;        // default: 5
  showTimeline?: boolean;     // default: true
  showSubagents?: boolean;    // default: true
  showInputPreview?: boolean; // default: false
}

export function ToolActivity({
  tools,
  maxVisible = 5,
  showTimeline = true,
  showSubagents = true,
  showInputPreview = false
}: ToolActivityProps) {
  const visibleTools = tools.slice(-maxVisible);
  const hiddenCount = Math.max(0, tools.length - maxVisible);

  return (
    <Box flexDirection="column">
      {hiddenCount > 0 && (
        <Text dimColor>  ... {hiddenCount} more tools above</Text>
      )}

      {visibleTools.map((tool, i) => (
        <Box key={tool.id}>
          {/* Tree connector */}
          <Text dimColor>
            {i === visibleTools.length - 1 ? '  └─ ' : '  ├─ '}
          </Text>

          {/* Tool name with icon */}
          <Text color={getToolColor(tool.name)}>
            {getToolIcon(tool.name)} {tool.name}
          </Text>

          {/* Input preview (e.g., file path) */}
          {showInputPreview && tool.input && (
            <Text dimColor> {getInputPreview(tool)}</Text>
          )}

          {/* Subagent model badge */}
          {showSubagents && tool.subagentModel && (
            <Text color={getModelColor(tool.subagentModel)}>
              {' '}[{tool.subagentModel}]
            </Text>
          )}

          {/* Status and timing */}
          <Spacer />
          {tool.status === 'running' ? (
            <Text>
              <Spinner type="dots" />
              <Text dimColor> {formatElapsed(tool.startTime)}...</Text>
            </Text>
          ) : (
            <Text color={tool.status === 'success' ? 'green' : 'red'}>
              {tool.status === 'success' ? '✓' : '✗'}
              {showTimeline && <Text dimColor> {formatDuration((tool.endTime! - tool.startTime) / 1000)}</Text>}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

// Tool icons by category
function getToolIcon(name: string): string {
  const icons: Record<string, string> = {
    Read: '📖',
    Write: '✏️',
    Edit: '📝',
    Bash: '⚡',
    Glob: '🔍',
    Grep: '🔎',
    Task: '🤖',
    WebFetch: '🌐',
    WebSearch: '🔍',
  };
  return icons[name] ?? '▪';
}
```

---

## Phase 5: Context Window Indicator

### 5.1 ContextWindow Component

**File: `src/components/ui/ContextWindow.tsx`**

```typescript
interface ContextWindowProps {
  currentTokens: number;
  maxTokens?: number;  // default: 200000 (Claude's context)
  showWarning?: boolean;
}

export function ContextWindow({
  currentTokens,
  maxTokens = 200000,
  showWarning = true
}: ContextWindowProps) {
  const percentage = (currentTokens / maxTokens) * 100;
  const color = percentage > 85 ? 'red' : percentage > 60 ? 'yellow' : 'green';

  return (
    <Box gap={1}>
      <Text dimColor>Context:</Text>
      <ProgressBar
        value={percentage}
        width={20}
        color={color}
      />
      <Text color={color}>{percentage.toFixed(0)}%</Text>
      <Text dimColor>({formatTokens(currentTokens)}/{formatTokens(maxTokens)})</Text>

      {showWarning && percentage > 85 && (
        <Text color="red" bold> ⚠ Near limit!</Text>
      )}
    </Box>
  );
}
```

---

## Phase 6: Refactor State Management

### 6.1 Use Reducer for Complex Screens

**File: `src/hooks/useWorkSession.ts`**

```typescript
type WorkAction =
  | { type: 'START_ITERATION'; task: string; model: string }
  | { type: 'TOOL_UPDATE'; tool: EnhancedToolCall }
  | { type: 'STATUS_UPDATE'; status: string }
  | { type: 'ITERATION_COMPLETE'; stats: IterationStats }
  | { type: 'SESSION_COMPLETE'; allComplete: boolean }
  | { type: 'ERROR'; message: string }
  | { type: 'TOGGLE_TOOLS' }
  | { type: 'TOGGLE_TOKENS' }
  | { type: 'UPDATE_USAGE'; usage: SubscriptionUsage };

interface WorkState {
  phase: 'running' | 'pause' | 'done' | 'error';
  currentIteration: number;
  currentTask: string;
  currentModel: string;
  status: string;
  tools: EnhancedToolCall[];
  iterations: IterationResult[];
  sessionStats: SessionStats;
  showTools: boolean;
  showTokens: boolean;
  errorMsg?: string;
}

function workReducer(state: WorkState, action: WorkAction): WorkState {
  switch (action.type) {
    case 'START_ITERATION':
      return {
        ...state,
        phase: 'running',
        currentIteration: state.currentIteration + 1,
        currentTask: action.task,
        currentModel: action.model,
        tools: [],
        status: 'Starting...',
      };

    case 'TOOL_UPDATE':
      return {
        ...state,
        tools: updateToolList(state.tools, action.tool),
      };

    case 'ITERATION_COMPLETE':
      return {
        ...state,
        phase: 'pause',
        iterations: [...state.iterations, action.stats],
        sessionStats: updateSessionStats(state.sessionStats, action.stats),
      };

    // ... other cases
  }
}

export function useWorkSession(initialState: Partial<WorkState>) {
  return useReducer(workReducer, { ...defaultState, ...initialState });
}
```

---

## Phase 7: Implementation Roadmap

### Week 1: Foundation
- [ ] Create `StatsContext` with full stats tracking
- [ ] Integrate cost calculator into claude_renderer
- [ ] Create `StatsBar` component
- [ ] Create `SessionSummary` component
- [ ] Create `buildFinalOutput` utility

### Week 2: Command Conversions
- [ ] Convert `ralph spec` to full Ink screen
- [ ] Convert `ralph research` to full Ink screen
- [ ] Enhance `ralph start` with better stats
- [ ] Update `ralph plan` with cost display
- [ ] Update `ralph work` with cost display

### Week 3: Polish
- [ ] Implement `useWorkSession` reducer
- [ ] Add `ContextWindow` component
- [ ] Improve `ToolActivity` with icons and previews
- [ ] Add keyboard shortcuts for cost toggle
- [ ] Add usage warnings when approaching limits

### Week 4: Testing & Refinement
- [ ] Test all commands end-to-end
- [ ] Verify final output persists correctly
- [ ] Test vibe mode transitions
- [ ] Performance optimization
- [ ] Documentation update

---

## Summary of Changes

### New Components
1. `StatsBar` - Unified token/cost/usage display
2. `SessionSummary` - End-of-command summary
3. `ContextWindow` - Context usage indicator
4. `SpecScreen` - Full Ink screen for spec command
5. `ResearchScreen` - Full Ink screen for research command

### Enhanced Components
1. `ToolActivity` - Icons, previews, subagent badges
2. `UsageBars` - Warning indicators
3. `TokenStats` - Cost integration

### New Hooks
1. `useWorkSession` - Reducer-based state for work command
2. `useSessionStats` - Shared stats tracking

### Service Integration
1. Cost calculator integrated into all commands
2. Session tracker enhanced with cost data
3. Usage service provides delta calculations

### UI Patterns
1. Reactive UI during operations (Ink/React)
2. Static output for completed items (persists in scrollback)
3. Final summary with all stats (using useFinalOutput)
4. Consistent keyboard shortcuts across commands
5. Model-aware cost calculations
