/**
 * @module components/Header
 *
 * Header and Footer components for app layout using deno-ink.
 */

import { Box, Text } from "@ink/mod.ts";
import type { ReactNode } from "react";

export interface HeaderProps {
  /** Main title */
  title: string;
  /** Subtitle or version */
  subtitle?: string;
  /** Title color */
  color?: string;
  /** Show border */
  bordered?: boolean;
  /** Icon before title */
  icon?: string;
  /** Right-aligned content */
  right?: ReactNode;
}

export function Header({
  title,
  subtitle,
  color = "#FF9500",
  bordered = true,
  icon,
  right,
}: HeaderProps): React.ReactElement {
  const content = (
    <Box justifyContent="space-between" width="100%">
      <Box>
        {icon && <Text color={color}>{icon} </Text>}
        <Text bold color={color}>{title}</Text>
        {subtitle && (
          <>
            <Text> </Text>
            <Text dimColor>{subtitle}</Text>
          </>
        )}
      </Box>
      {right && <Box>{right}</Box>}
    </Box>
  );

  if (bordered) {
    return (
      <Box
        borderStyle="round"
        borderColor={color}
        paddingX={2}
        paddingY={1}
      >
        {content}
      </Box>
    );
  }

  return <Box paddingX={1}>{content}</Box>;
}

// App header with logo
export interface AppHeaderProps {
  name: string;
  version?: string;
  tagline?: string;
  color?: string;
}

export function AppHeader({
  name,
  version,
  tagline,
  color = "#FF9500",
}: AppHeaderProps): React.ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={4}
      paddingY={1}
      flexDirection="column"
      alignItems="center"
    >
      <Box>
        <Text bold color={color}>{name}</Text>
        {version && <Text dimColor> v{version}</Text>}
      </Box>
      {tagline && <Text dimColor>{tagline}</Text>}
    </Box>
  );
}

// Section header (divider with title)
export interface SectionProps {
  title: string;
  icon?: string;
  color?: string;
}

export function Section({ title, icon, color }: SectionProps): React.ReactElement {
  return (
    <Box marginY={1}>
      <Text color={color} dimColor={!color}>──</Text>
      <Text> </Text>
      {icon && <Text color={color}>{icon} </Text>}
      <Text bold color={color}>{title}</Text>
      <Text> </Text>
      <Text color={color} dimColor={!color}>────────────────────────────────</Text>
    </Box>
  );
}

// Footer component
export interface FooterProps {
  /** Left content */
  left?: ReactNode;
  /** Center content */
  center?: ReactNode;
  /** Right content */
  right?: ReactNode;
  /** Border color */
  borderColor?: string;
  /** Show border */
  bordered?: boolean;
}

export function Footer({
  left,
  center,
  right,
  borderColor,
  bordered = true,
}: FooterProps): React.ReactElement {
  const content = (
    <Box justifyContent="space-between" width="100%">
      <Box>{left}</Box>
      <Box>{center}</Box>
      <Box>{right}</Box>
    </Box>
  );

  if (bordered) {
    return (
      <Box
        borderStyle="single"
        borderColor={borderColor}
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingX={1}
      >
        {content}
      </Box>
    );
  }

  return <Box paddingX={1}>{content}</Box>;
}

// Status bar (like IDE status bars)
export interface StatusBarProps {
  items: Array<{
    label?: string;
    value: string;
    icon?: string;
    color?: string;
  }>;
  separator?: string;
}

export function StatusBar({ items, separator = "  │  " }: StatusBarProps): React.ReactElement {
  return (
    <Box paddingX={1}>
      {items.map((item, index) => (
        <Box key={index}>
          {index > 0 && <Text dimColor>{separator}</Text>}
          {item.icon && <Text color={item.color}>{item.icon} </Text>}
          {item.label && <Text dimColor>{item.label}: </Text>}
          <Text color={item.color}>{item.value}</Text>
        </Box>
      ))}
    </Box>
  );
}

// Breadcrumb navigation
export interface BreadcrumbProps {
  items: string[];
  separator?: string;
  activeColor?: string;
}

export function Breadcrumb({
  items,
  separator = " › ",
  activeColor = "cyan",
}: BreadcrumbProps): React.ReactElement {
  return (
    <Box>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Box key={index}>
            {index > 0 && <Text dimColor>{separator}</Text>}
            <Text color={isLast ? activeColor : undefined} dimColor={!isLast}>
              {item}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
