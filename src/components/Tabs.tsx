/**
 * @module components/Tabs
 *
 * Tab navigation components for switching between views.
 * Inspired by Charm.sh patterns and modern terminal UIs.
 */

import React, { type ReactNode } from "react";
import { Box, Text } from "@ink/mod.ts";

// ============================================================================
// TABS - Tab container with navigation
// ============================================================================

export interface TabItem {
  /** Tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Tab icon */
  icon?: string;
  /** Tab content */
  content?: ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Badge/count */
  badge?: string | number;
}

export interface TabsProps {
  /** Tab items */
  tabs: TabItem[];
  /** Active tab id */
  activeTab: string;
  /** Tab style */
  variant?: "default" | "pills" | "underline" | "boxed";
  /** Active color */
  activeColor?: string;
  /** Show content area */
  showContent?: boolean;
  /** Content border */
  contentBorder?: boolean;
  /** Gap between tabs */
  gap?: number;
}

export function Tabs({
  tabs,
  activeTab,
  variant = "default",
  activeColor = "cyan",
  showContent = true,
  contentBorder = true,
  gap = 0,
}: TabsProps): React.ReactElement {
  const activeTabItem = tabs.find((t) => t.id === activeTab);

  return (
    <Box flexDirection="column">
      {/* Tab Headers */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        variant={variant}
        activeColor={activeColor}
        gap={gap}
      />

      {/* Tab Content */}
      {showContent && activeTabItem?.content && (
        <Box
          marginTop={0}
          borderStyle={contentBorder ? "single" : undefined}
          borderColor={contentBorder ? "gray" : undefined}
          borderTop={false}
          padding={contentBorder ? 1 : 0}
        >
          {activeTabItem.content}
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// TAB BAR - Just the tab headers
// ============================================================================

export interface TabBarProps {
  /** Tab items */
  tabs: TabItem[];
  /** Active tab id */
  activeTab: string;
  /** Tab style */
  variant?: "default" | "pills" | "underline" | "boxed";
  /** Active color */
  activeColor?: string;
  /** Gap between tabs */
  gap?: number;
}

export function TabBar({
  tabs,
  activeTab,
  variant = "default",
  activeColor = "cyan",
  gap = 0,
}: TabBarProps): React.ReactElement {
  return (
    <Box gap={gap}>
      {tabs.map((tab) => (
        <React.Fragment key={tab.id}>
          <Tab
            label={tab.label}
            icon={tab.icon}
            badge={tab.badge}
            isActive={tab.id === activeTab}
            disabled={tab.disabled}
            variant={variant}
            activeColor={activeColor}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}

// ============================================================================
// TAB - Individual tab header
// ============================================================================

export interface TabProps {
  /** Tab label */
  label: string;
  /** Tab icon */
  icon?: string;
  /** Active state */
  isActive?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Tab style */
  variant?: "default" | "pills" | "underline" | "boxed";
  /** Active color */
  activeColor?: string;
  /** Badge */
  badge?: string | number;
}

export function Tab({
  label,
  icon,
  isActive = false,
  disabled = false,
  variant = "default",
  activeColor = "cyan",
  badge,
}: TabProps): React.ReactElement {
  if (disabled) {
    return (
      <Box paddingX={2}>
        <Text dimColor strikethrough>
          {icon && `${icon} `}{label}
        </Text>
      </Box>
    );
  }

  switch (variant) {
    case "pills":
      return (
        <Box
          borderStyle={isActive ? "round" : undefined}
          borderColor={isActive ? activeColor : undefined}
          paddingX={isActive ? 1 : 2}
        >
          {icon && <Text color={isActive ? activeColor : undefined}>{icon} </Text>}
          <Text color={isActive ? activeColor : undefined} bold={isActive}>
            {label}
          </Text>
          {badge !== undefined && (
            <Text color={isActive ? activeColor : "gray"}> ({badge})</Text>
          )}
        </Box>
      );

    case "underline":
      return (
        <Box flexDirection="column" paddingX={1}>
          <Box>
            {icon && <Text color={isActive ? activeColor : undefined}>{icon} </Text>}
            <Text color={isActive ? activeColor : undefined} bold={isActive}>
              {label}
            </Text>
            {badge !== undefined && (
              <Text color={isActive ? activeColor : "gray"}> ({badge})</Text>
            )}
          </Box>
          {isActive && <Text color={activeColor}>{"─".repeat(label.length + (icon ? 2 : 0))}</Text>}
        </Box>
      );

    case "boxed":
      return (
        <Box
          borderStyle="single"
          borderColor={isActive ? activeColor : "gray"}
          borderBottom={!isActive}
          paddingX={2}
        >
          {icon && <Text color={isActive ? activeColor : undefined}>{icon} </Text>}
          <Text color={isActive ? activeColor : undefined} bold={isActive}>
            {label}
          </Text>
          {badge !== undefined && (
            <Text color={isActive ? activeColor : "gray"}> ({badge})</Text>
          )}
        </Box>
      );

    default:
      return (
        <Box paddingX={2}>
          <Text color={isActive ? activeColor : undefined}>
            {isActive ? "▶ " : "  "}
          </Text>
          {icon && <Text color={isActive ? activeColor : undefined}>{icon} </Text>}
          <Text color={isActive ? activeColor : undefined} bold={isActive}>
            {label}
          </Text>
          {badge !== undefined && (
            <Text color={isActive ? activeColor : "gray"}> ({badge})</Text>
          )}
        </Box>
      );
  }
}

// ============================================================================
// VERTICAL TABS - Tabs stacked vertically
// ============================================================================

export interface VerticalTabsProps {
  /** Tab items */
  tabs: TabItem[];
  /** Active tab id */
  activeTab: string;
  /** Active color */
  activeColor?: string;
  /** Show content */
  showContent?: boolean;
  /** Tab width */
  tabWidth?: number;
}

export function VerticalTabs({
  tabs,
  activeTab,
  activeColor = "cyan",
  showContent = true,
  tabWidth = 20,
}: VerticalTabsProps): React.ReactElement {
  const activeTabItem = tabs.find((t) => t.id === activeTab);

  return (
    <Box flexDirection="row">
      {/* Tab List */}
      <Box
        flexDirection="column"
        width={tabWidth}
        borderStyle="single"
        borderColor="gray"
        borderRight={false}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Box
              key={tab.id}
              paddingX={1}
              borderStyle={isActive ? "single" : undefined}
              borderColor={isActive ? activeColor : undefined}
              borderLeft={false}
              borderTop={false}
              borderBottom={false}
            >
              {tab.icon && <Text color={isActive ? activeColor : undefined}>{tab.icon} </Text>}
              <Text
                color={isActive ? activeColor : tab.disabled ? "gray" : undefined}
                bold={isActive}
                dimColor={tab.disabled}
              >
                {tab.label}
              </Text>
              {tab.badge !== undefined && (
                <Text color={isActive ? activeColor : "gray"}> ({tab.badge})</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Content */}
      {showContent && activeTabItem?.content && (
        <Box
          flexGrow={1}
          borderStyle="single"
          borderColor="gray"
          padding={1}
        >
          {activeTabItem.content}
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// SEGMENTED CONTROL - Compact tab-like toggle
// ============================================================================

export interface SegmentedControlProps {
  /** Options */
  options: Array<{ id: string; label: string; icon?: string }>;
  /** Selected option id */
  selected: string;
  /** Active color */
  activeColor?: string;
  /** Compact mode */
  compact?: boolean;
}

export function SegmentedControl({
  options,
  selected,
  activeColor = "cyan",
  compact = false,
}: SegmentedControlProps): React.ReactElement {
  return (
    <Box borderStyle="round" borderColor="gray">
      {options.map((option, index) => {
        const isSelected = option.id === selected;
        const isLast = index === options.length - 1;

        return (
          <Box key={option.id}>
            <Box
              paddingX={compact ? 1 : 2}
              borderStyle={isSelected ? undefined : undefined}
            >
              {option.icon && (
                <Text color={isSelected ? activeColor : undefined}>{option.icon} </Text>
              )}
              <Text
                color={isSelected ? activeColor : undefined}
                bold={isSelected}
                inverse={isSelected}
              >
                {compact ? "" : " "}{option.label}{compact ? "" : " "}
              </Text>
            </Box>
            {!isLast && <Text dimColor>│</Text>}
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================================================
// STEP TABS - Numbered/ordered tabs for wizards
// ============================================================================

export interface StepTabsProps {
  /** Steps */
  steps: Array<{ id: string; label: string }>;
  /** Current step id */
  currentStep: string;
  /** Completed steps */
  completedSteps?: string[];
  /** Active color */
  activeColor?: string;
  /** Completed color */
  completedColor?: string;
}

export function StepTabs({
  steps,
  currentStep,
  completedSteps = [],
  activeColor = "cyan",
  completedColor = "green",
}: StepTabsProps): React.ReactElement {
  return (
    <Box gap={1}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const stepNumber = index + 1;

        let color: string | undefined;
        let icon: string;

        if (isCompleted) {
          color = completedColor;
          icon = "✓";
        } else if (isActive) {
          color = activeColor;
          icon = String(stepNumber);
        } else {
          color = undefined;
          icon = String(stepNumber);
        }

        return (
          <Box key={step.id} alignItems="center">
            {index > 0 && <Text dimColor> ─── </Text>}
            <Box
              borderStyle="round"
              borderColor={color ?? "gray"}
              paddingX={1}
            >
              <Text color={color} bold={isActive}>
                {icon}
              </Text>
            </Box>
            <Text color={color} bold={isActive}>
              {" "}{step.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================================================
// BOTTOM TABS - Tab bar for bottom of screen
// ============================================================================

export interface BottomTabsProps {
  /** Tab items */
  tabs: Array<{ id: string; label: string; icon: string }>;
  /** Active tab id */
  activeTab: string;
  /** Active color */
  activeColor?: string;
}

export function BottomTabs({
  tabs,
  activeTab,
  activeColor = "cyan",
}: BottomTabsProps): React.ReactElement {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      borderLeft={false}
      borderRight={false}
      borderBottom={false}
      justifyContent="space-around"
      paddingY={0}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Box key={tab.id} flexDirection="column" alignItems="center" paddingX={2}>
            <Text color={isActive ? activeColor : "gray"}>
              {tab.icon}
            </Text>
            <Text
              color={isActive ? activeColor : "gray"}
              bold={isActive}
            >
              {tab.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
