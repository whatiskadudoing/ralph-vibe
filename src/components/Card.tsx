/**
 * @module components/Card
 *
 * Card component for grouped content using deno-ink.
 */

import React, { type ReactNode } from 'react';
import { Box, Text } from '@ink/mod.ts';

export interface CardProps {
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Title color */
  titleColor?: string;
  /** Border style */
  borderStyle?: 'single' | 'round' | 'double' | 'bold';
  /** Border color */
  borderColor?: string;
  /** Card width */
  width?: number;
  /** Padding */
  padding?: number;
  /** Show shadow effect (extra dim border on right/bottom) */
  shadow?: boolean;
  /** Children content */
  children?: ReactNode;
}

export function Card({
  title,
  subtitle,
  titleColor,
  borderStyle = 'round',
  borderColor,
  width,
  padding = 1,
  children,
}: CardProps): React.ReactElement {
  return (
    <Box
      borderStyle={borderStyle}
      borderColor={borderColor}
      width={width}
      paddingX={padding}
      paddingY={padding > 0 ? 1 : 0}
      flexDirection='column'
    >
      {title && (
        <Box marginBottom={children ? 1 : 0}>
          <Text bold color={titleColor}>{title}</Text>
          {subtitle && (
            <>
              <Text></Text>
              <Text dimColor>{subtitle}</Text>
            </>
          )}
        </Box>
      )}
      {children}
    </Box>
  );
}

// Compact card (less padding)
export function CompactCard({
  title,
  children,
  borderColor,
}: {
  title?: string;
  children?: ReactNode;
  borderColor?: string;
}): React.ReactElement {
  return (
    <Card title={title} borderColor={borderColor} padding={1}>
      {children}
    </Card>
  );
}

// Feature card with icon
export interface FeatureCardProps {
  icon: string;
  title: string;
  description?: string;
  color?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  color,
}: FeatureCardProps): React.ReactElement {
  return (
    <Box flexDirection='column'>
      <Box>
        <Text color={color}>{icon}</Text>
        <Text></Text>
        <Text bold color={color}>{title}</Text>
      </Box>
      {description && (
        <Box marginLeft={2}>
          <Text dimColor>{description}</Text>
        </Box>
      )}
    </Box>
  );
}

// Stat card
export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({
  label,
  value,
  icon,
  color,
  trend,
}: StatCardProps): React.ReactElement {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendColor = trend === 'up' ? 'green' : trend === 'down' ? 'red' : undefined;

  return (
    <Box
      borderStyle='round'
      paddingX={2}
      paddingY={1}
      flexDirection='column'
      alignItems='center'
    >
      {icon && <Text color={color}>{icon}</Text>}
      <Box>
        <Text bold color={color}>{String(value)}</Text>
        {trendIcon && <Text color={trendColor}>{trendIcon}</Text>}
      </Box>
      <Text dimColor>{label}</Text>
    </Box>
  );
}

// Info card with key-value pairs
export interface InfoCardProps {
  title: string;
  data: Record<string, string | number>;
  titleColor?: string;
  borderColor?: string;
}

export function InfoCard({
  title,
  data,
  titleColor,
  borderColor,
}: InfoCardProps): React.ReactElement {
  const entries = Object.entries(data);
  const maxKeyWidth = Math.max(...entries.map(([key]) => key.length));

  return (
    <Card title={title} titleColor={titleColor} borderColor={borderColor}>
      <Box flexDirection='column'>
        {entries.map(([key, value], index) => (
          <Box key={index}>
            <Text dimColor>{key.padEnd(maxKeyWidth)}</Text>
            <Text></Text>
            <Text>{String(value)}</Text>
          </Box>
        ))}
      </Box>
    </Card>
  );
}
