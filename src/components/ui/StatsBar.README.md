# StatsBar Component

A unified token/cost/usage display component for all Ralph CLI commands.

## Features

- Token display with input/output breakdown
- Cost calculation and display with color-coded amounts
- Cache efficiency metrics
- Subscription usage bars integration
- Delta tracking for iterations
- Compact and full display modes

## Usage

### Basic Usage

```tsx
import { StatsBar } from '@/components/ui/StatsBar.tsx';

<StatsBar
  tokens={{
    input: 45200,
    output: 13100,
    cacheRead: 12000,
  }}
  cacheEfficiency={83}
/>;
```

### With Cost (API Users)

```tsx
import { StatsBar } from '@/components/ui/StatsBar.tsx';
import type { CostBreakdown } from '@/services/cost_calculator.ts';

const cost: CostBreakdown = {
  input: 0.1356,
  output: 0.1965,
  cacheWrite: 0.0225,
  cacheRead: 0.018,
  total: 0.3726,
};

<StatsBar
  tokens={{
    input: 45200,
    output: 13100,
  }}
  cost={cost}
  showCost={true}
/>;
```

### Compact Mode

```tsx
<StatsBar
  tokens={{ input: 45200, output: 13100 }}
  compact={true}
/>;
```

### With Delta Tracking

```tsx
<StatsBar
  tokens={{ input: 45200, output: 13100 }}
  cost={cost}
  delta={{
    tokens: 1200,
    cost: 0.05,
  }}
/>;
```

### With Usage Bars (Subscription Users)

```tsx
import type { SubscriptionUsage } from '@/services/usage_service.ts';

<StatsBar
  tokens={{ input: 45200, output: 13100 }}
  cacheEfficiency={83}
  usage={subscriptionUsage}
/>;
```

## Convenience Components

### TokenStatsBar

For subscription users who don't need cost display:

```tsx
import { TokenStatsBar } from '@/components/ui/StatsBar.tsx';

<TokenStatsBar
  tokens={{ input: 45200, output: 13100, cacheRead: 12000 }}
  cacheEfficiency={83}
  usage={subscriptionUsage}
/>;
```

### CostStatsBar

For API users with cost tracking:

```tsx
import { CostStatsBar } from '@/components/ui/StatsBar.tsx';

<CostStatsBar
  tokens={{ input: 45200, output: 13100 }}
  cost={costBreakdown}
  cacheEfficiency={20}
/>;
```

## Display Format

### Full Mode

```
Tokens: 45.2K (↑32.1K ↓13.1K)  Cost: $0.48  Cache: 83%
```

### Compact Mode

```
Tokens: 45.2K  Cost: $0.48  Cache: 83%
```

## Cost Color Coding

- Green: < $1.00
- Yellow: $1.00 - $4.99
- Red: >= $5.00

## Props

### StatsBarProps

| Prop              | Type                | Required | Default | Description                         |
| ----------------- | ------------------- | -------- | ------- | ----------------------------------- |
| `tokens`          | `TokenBreakdown`    | Yes      | -       | Token usage breakdown               |
| `cost`            | `CostBreakdown`     | No       | -       | Cost breakdown for API users        |
| `cacheEfficiency` | `number`            | No       | -       | Cache efficiency percentage (0-100) |
| `usage`           | `SubscriptionUsage` | No       | -       | Subscription usage data             |
| `showCost`        | `boolean`           | No       | `true`  | Whether to display cost             |
| `compact`         | `boolean`           | No       | `false` | Use compact single-line display     |
| `delta`           | `StatsDelta`        | No       | -       | Delta from previous iteration       |

### TokenBreakdown

```tsx
interface TokenBreakdown {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}
```

### StatsDelta

```tsx
interface StatsDelta {
  tokens?: number;
  cost?: number;
}
```

## Integration

The StatsBar component is exported from the main UI components module:

```tsx
import { CostStatsBar, StatsBar, TokenStatsBar } from '@/components/ui/mod.ts';
```
