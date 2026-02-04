/**
 * @module components/ui/UsageBars
 *
 * Subscription usage progress bars.
 * Matches the original Ralph CLI design with full-width colored bars.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from '../../../packages/deno-ink/src/mod.ts';
import { useTerminalSize } from '../../../packages/deno-ink/src/mod.ts';
import type { SubscriptionUsage } from '@/services/usage_service.ts';

// Colors matching original design
const AMBER = '#FFD700'; // 5h bar
const DIM = '#666666'; // 7d bar
const CYAN = '#00FFFF'; // sonnet bar

export interface UsageBarsProps {
  usage: SubscriptionUsage;
  defaultVisible?: boolean;
  toggleKey?: string;
}

function ProgressBar({
  label,
  percent,
  color,
  width,
}: {
  label: string;
  percent: number;
  color: string;
  width: number;
}): React.ReactElement {
  const pct = Math.round(Math.max(0, Math.min(100, percent)));
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;

  // Entire bar is same color (original design)
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <Box flexDirection='row'>
      <Text color='#666'>{label.padEnd(9)}</Text>
      <Text color={color}>{bar}</Text>
      <Text color='#666'>{pct}%</Text>
    </Box>
  );
}

export function UsageBars({
  usage,
  defaultVisible = false,
  toggleKey = 'u',
}: UsageBarsProps): React.ReactElement | null {
  const [visible, setVisible] = useState(defaultVisible);
  const { columns } = useTerminalSize();

  useInput((input) => {
    if (input.toLowerCase() === toggleKey) {
      setVisible((v: boolean) => !v);
    }
  });

  if (!visible) {
    return null;
  }

  // Wide bars like original design
  const barWidth = Math.max(20, columns - 25);

  return (
    <Box flexDirection='column' marginBottom={1}>
      <ProgressBar
        label='5h:'
        percent={usage.fiveHour.utilization}
        color={AMBER}
        width={barWidth}
      />
      <Text></Text>
      <ProgressBar
        label='7d:'
        percent={usage.sevenDay.utilization}
        color={DIM}
        width={barWidth}
      />
      {usage.sevenDaySonnet && (
        <>
          <Text></Text>
          <ProgressBar
            label='sonnet:'
            percent={usage.sevenDaySonnet.utilization}
            color={CYAN}
            width={barWidth}
          />
        </>
      )}
    </Box>
  );
}
