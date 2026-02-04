/**
 * @module components/Dashboard
 *
 * Dashboard layout components using deno-ink.
 */

import React, { type ReactNode } from 'react';
import { Box, Text } from '@ink/mod.ts';

// Grid layout
export interface GridProps {
  /** Number of columns */
  columns?: number;
  /** Gap between cells */
  gap?: number;
  /** Children (grid cells) */
  children: ReactNode;
}

export function Grid({ columns: _columns = 2, gap = 2, children }: GridProps): React.ReactElement {
  return (
    <Box flexDirection='row' flexWrap='wrap' gap={gap}>
      {children}
    </Box>
  );
}

// Dashboard panel
export interface PanelProps {
  /** Panel title */
  title?: string;
  /** Title icon */
  icon?: string;
  /** Title color */
  titleColor?: string;
  /** Border style */
  borderStyle?: 'single' | 'round' | 'double';
  /** Border color */
  borderColor?: string;
  /** Panel width */
  width?: number;
  /** Panel height */
  height?: number;
  /** Children content */
  children?: ReactNode;
}

export function Panel({
  title,
  icon,
  titleColor,
  borderStyle = 'round',
  borderColor,
  width,
  height,
  children,
}: PanelProps): React.ReactElement {
  return (
    <Box
      borderStyle={borderStyle}
      borderColor={borderColor}
      width={width}
      height={height}
      flexDirection='column'
      paddingX={1}
    >
      {title && (
        <Box marginBottom={1}>
          {icon && <Text color={titleColor}>{icon}</Text>}
          <Text bold color={titleColor}>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}

// Metric display (big number with label)
export interface MetricProps {
  /** Main value */
  value: string | number;
  /** Label below value */
  label: string;
  /** Unit suffix */
  unit?: string;
  /** Value color */
  color?: string;
  /** Icon */
  icon?: string;
  /** Trend indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend value */
  trendValue?: string;
}

export function Metric({
  value,
  label,
  unit,
  color,
  icon,
  trend,
  trendValue,
}: MetricProps): React.ReactElement {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendColor = trend === 'up' ? 'green' : trend === 'down' ? 'red' : undefined;

  return (
    <Box flexDirection='column' alignItems='center' paddingX={1}>
      {icon && <Text color={color}>{icon}</Text>}
      <Box>
        <Text bold color={color}>{String(value)}</Text>
        {unit && <Text dimColor>{unit}</Text>}
        {trendIcon && <Text color={trendColor}>{trendIcon}{trendValue}</Text>}
      </Box>
      <Text dimColor>{label}</Text>
    </Box>
  );
}

// Metrics row (horizontal metrics)
export function MetricsRow({
  metrics,
  separator = '│',
}: {
  metrics: MetricProps[];
  separator?: string;
}): React.ReactElement {
  return (
    <Box justifyContent='space-around'>
      {metrics.map((metric, index) => (
        <Box key={index}>
          {index > 0 && <Text dimColor>{separator}</Text>}
          <Metric {...metric} />
        </Box>
      ))}
    </Box>
  );
}

// Sparkline (simple mini chart)
export function Sparkline({
  data,
  width = 20,
  color = 'cyan',
}: {
  data: number[];
  width?: number;
  color?: string;
}): React.ReactElement {
  if (data.length === 0) return <Text dimColor>No data</Text>;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const normalizedData = data.slice(-width);

  const sparkline = normalizedData.map((value) => {
    const normalized = (value - min) / range;
    const charIndex = Math.floor(normalized * (chars.length - 1));
    return chars[charIndex];
  }).join('');

  return <Text color={color}>{sparkline}</Text>;
}

// Mini bar chart
export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

export function MiniBarChart({
  items,
  maxWidth = 30,
  showValues = true,
}: {
  items: BarChartItem[];
  maxWidth?: number;
  showValues?: boolean;
}): React.ReactElement {
  const maxValue = Math.max(...items.map((i) => i.value));
  const maxLabelWidth = Math.max(...items.map((i) => i.label.length));

  return (
    <Box flexDirection='column'>
      {items.map((item, index) => {
        const barWidth = Math.round((item.value / maxValue) * maxWidth);
        return (
          <Box key={index}>
            <Text dimColor>{item.label.padEnd(maxLabelWidth)}</Text>
            <Text></Text>
            <Text color={item.color ?? 'cyan'}>{'█'.repeat(barWidth)}</Text>
            {showValues && <Text dimColor>{item.value}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}

// Activity/heat map style display
export function ActivityMap({
  data,
  emptyChar = '░',
  filledChar: _filledChar = '█',
  levels = 4,
}: {
  data: number[][];
  emptyChar?: string;
  filledChar?: string;
  levels?: number;
}): React.ReactElement {
  const chars = ['░', '▒', '▓', '█'].slice(0, levels);
  const max = Math.max(...data.flat());

  return (
    <Box flexDirection='column'>
      {data.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {row.map((value, colIndex) => {
            if (value === 0) {
              return <Text key={colIndex} dimColor>{emptyChar}</Text>;
            }
            const level = Math.min(Math.floor((value / max) * levels), levels - 1);
            return <Text key={colIndex} color='green'>{chars[level]}</Text>;
          })}
        </Box>
      ))}
    </Box>
  );
}

// System resource display
export interface ResourceGaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  width?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export function ResourceGauge({
  label,
  value,
  max = 100,
  unit = '%',
  width = 20,
  warningThreshold = 70,
  criticalThreshold = 90,
}: ResourceGaugeProps): React.ReactElement {
  const percent = (value / max) * 100;
  const filledWidth = Math.round((percent / 100) * width);

  let color = 'green';
  if (percent >= criticalThreshold) {
    color = 'red';
  } else if (percent >= warningThreshold) {
    color = 'yellow';
  }

  return (
    <Box>
      <Text dimColor>{label.padEnd(8)}</Text>
      <Text color={color}>{'█'.repeat(filledWidth)}</Text>
      <Text dimColor>{'░'.repeat(width - filledWidth)}</Text>
      <Text></Text>
      <Text color={color}>{value}{unit}</Text>
    </Box>
  );
}

// Full dashboard layout
export interface DashboardProps {
  /** Dashboard title */
  title?: string;
  /** Header content */
  header?: ReactNode;
  /** Main content (panels) */
  children: ReactNode;
  /** Footer content */
  footer?: ReactNode;
}

export function Dashboard({
  title,
  header,
  children,
  footer,
}: DashboardProps): React.ReactElement {
  return (
    <Box flexDirection='column' padding={1}>
      {(title || header) && (
        <Box
          borderStyle='round'
          borderColor='#FF9500'
          paddingX={2}
          paddingY={1}
          marginBottom={1}
        >
          {title && <Text bold color='#FF9500'>{title}</Text>}
          {header}
        </Box>
      )}
      <Box flexDirection='column' gap={1}>
        {children}
      </Box>
      {footer && (
        <Box marginTop={1} borderTop>
          {footer}
        </Box>
      )}
    </Box>
  );
}
