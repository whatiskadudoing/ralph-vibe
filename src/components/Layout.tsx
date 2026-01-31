/**
 * @module components/Layout
 *
 * Layout components using deno-ink for composing complex terminal UIs.
 * All components support customizable colors, borders, and spacing.
 */

import React, { type ReactNode } from "react";
import { Box, Text } from "@ink/mod.ts";

// ============================================================================
// COLUMNS - Horizontal split with flexible widths
// ============================================================================

export interface ColumnsProps {
  /** Child columns */
  children: ReactNode;
  /** Gap between columns */
  gap?: number;
  /** Align columns vertically */
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
}

export function Columns({
  children,
  gap = 1,
  alignItems = "stretch",
}: ColumnsProps): React.ReactElement {
  return (
    <Box flexDirection="row" gap={gap} alignItems={alignItems}>
      {children}
    </Box>
  );
}

export interface ColumnProps {
  /** Column content */
  children: ReactNode;
  /** Width (number = chars, "auto" = fit content, percentage string e.g. "50%") */
  width?: number | "auto" | string;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Flex grow factor */
  grow?: number;
  /** Flex shrink factor */
  shrink?: number;
  /** Background color */
  backgroundColor?: string;
  /** Padding */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  /** Border */
  borderStyle?: "single" | "round" | "double" | "bold" | "singleDouble" | "doubleSingle" | "classic";
  borderColor?: string;
}

export function Column({
  children,
  width,
  minWidth,
  maxWidth,
  grow = 1,
  shrink = 1,
  backgroundColor,
  padding,
  paddingX,
  paddingY,
  borderStyle,
  borderColor,
}: ColumnProps): React.ReactElement {
  // Parse percentage widths
  let widthValue: number | undefined;
  if (typeof width === "string" && width.endsWith("%")) {
    // Percentage widths need to be calculated differently in yoga
    // We'll use flexBasis with percentage
    widthValue = undefined;
  } else if (typeof width === "number") {
    widthValue = width;
  }

  return (
    <Box
      flexDirection="column"
      width={widthValue}
      minWidth={minWidth}
      maxWidth={maxWidth}
      flexGrow={grow}
      flexShrink={shrink}
      padding={padding}
      paddingX={paddingX}
      paddingY={paddingY}
      borderStyle={borderStyle}
      borderColor={borderColor}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// ROWS - Stack items vertically with gap
// ============================================================================

export interface RowsProps {
  /** Child rows */
  children: ReactNode;
  /** Gap between rows */
  gap?: number;
  /** Align rows horizontally */
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
}

export function Rows({
  children,
  gap = 0,
  alignItems = "stretch",
}: RowsProps): React.ReactElement {
  return (
    <Box flexDirection="column" gap={gap} alignItems={alignItems}>
      {children}
    </Box>
  );
}

export interface RowProps {
  /** Row content */
  children: ReactNode;
  /** Height (number = lines) */
  height?: number;
  /** Minimum height */
  minHeight?: number;
  /** Flex grow factor */
  grow?: number;
  /** Flex shrink factor */
  shrink?: number;
  /** Padding */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  /** Border */
  borderStyle?: "single" | "round" | "double" | "bold" | "singleDouble" | "doubleSingle" | "classic";
  borderColor?: string;
  /** Justify content horizontally */
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
}

export function Row({
  children,
  height,
  minHeight,
  grow = 0,
  shrink = 1,
  padding,
  paddingX,
  paddingY,
  borderStyle,
  borderColor,
  justifyContent,
}: RowProps): React.ReactElement {
  return (
    <Box
      flexDirection="row"
      height={height}
      minHeight={minHeight}
      flexGrow={grow}
      flexShrink={shrink}
      padding={padding}
      paddingX={paddingX}
      paddingY={paddingY}
      borderStyle={borderStyle}
      borderColor={borderColor}
      justifyContent={justifyContent}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// SPLIT - Two-panel layout with optional divider
// ============================================================================

export interface SplitProps {
  /** Left/top panel content */
  left: ReactNode;
  /** Right/bottom panel content */
  right: ReactNode;
  /** Direction of split */
  direction?: "horizontal" | "vertical";
  /** Split ratio (0-1, default 0.5 = equal) */
  ratio?: number;
  /** Show divider between panels */
  showDivider?: boolean;
  /** Divider character */
  dividerChar?: string;
  /** Divider color */
  dividerColor?: string;
  /** Gap (if no divider) */
  gap?: number;
  /** Panel border style */
  panelBorder?: "single" | "round" | "double" | "bold";
  /** Panel border color */
  panelBorderColor?: string;
  /** Left/top panel border color override */
  leftBorderColor?: string;
  /** Right/bottom panel border color override */
  rightBorderColor?: string;
  /** Total width (for horizontal split) */
  width?: number;
  /** Total height (for vertical split) */
  height?: number;
}

export function Split({
  left,
  right,
  direction = "horizontal",
  ratio = 0.5,
  showDivider = true,
  dividerChar,
  dividerColor = "gray",
  gap = 0,
  panelBorder,
  panelBorderColor,
  leftBorderColor,
  rightBorderColor,
  width,
  height,
}: SplitProps): React.ReactElement {
  const isHorizontal = direction === "horizontal";
  const defaultDividerChar = isHorizontal ? "│" : "─";
  const actualDividerChar = dividerChar ?? defaultDividerChar;

  // For horizontal: left gets ratio%, right gets (1-ratio)%
  // For vertical: top gets ratio, bottom gets (1-ratio)
  const leftGrow = ratio;
  const rightGrow = 1 - ratio;

  const dividerElement = showDivider ? (
    <Box
      flexDirection={isHorizontal ? "column" : "row"}
      alignItems="center"
      justifyContent="center"
    >
      <Text color={dividerColor}>
        {isHorizontal
          ? actualDividerChar.repeat(1)
          : actualDividerChar.repeat(20)}
      </Text>
    </Box>
  ) : null;

  return (
    <Box
      flexDirection={isHorizontal ? "row" : "column"}
      width={width}
      height={height}
      gap={showDivider ? 0 : gap}
    >
      <Box
        flexGrow={leftGrow}
        flexDirection="column"
        borderStyle={panelBorder}
        borderColor={leftBorderColor ?? panelBorderColor}
      >
        {left}
      </Box>
      {dividerElement}
      <Box
        flexGrow={rightGrow}
        flexDirection="column"
        borderStyle={panelBorder}
        borderColor={rightBorderColor ?? panelBorderColor}
      >
        {right}
      </Box>
    </Box>
  );
}

// ============================================================================
// GRID LAYOUT - CSS-grid-like layout for terminal
// ============================================================================

export interface GridLayoutProps {
  /** Grid items */
  children: ReactNode;
  /** Number of columns */
  columns?: number;
  /** Gap between cells */
  gap?: number;
  /** Row gap (overrides gap) */
  rowGap?: number;
  /** Column gap (overrides gap) */
  columnGap?: number;
  /** Minimum cell width */
  minCellWidth?: number;
}

export function GridLayout({
  children,
  columns = 2,
  gap = 1,
  rowGap,
  columnGap,
}: GridLayoutProps): React.ReactElement {
  return (
    <Box
      flexDirection="row"
      flexWrap="wrap"
      gap={columnGap ?? gap}
    >
      {children}
    </Box>
  );
}

export interface GridCellProps {
  /** Cell content */
  children: ReactNode;
  /** Column span */
  colSpan?: number;
  /** Row span */
  rowSpan?: number;
  /** Cell width */
  width?: number;
  /** Cell height */
  height?: number;
  /** Border */
  borderStyle?: "single" | "round" | "double" | "bold";
  borderColor?: string;
  /** Padding */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  /** Flex grow */
  grow?: number;
}

export function GridCell({
  children,
  width,
  height,
  borderStyle,
  borderColor,
  padding,
  paddingX,
  paddingY,
  grow = 1,
}: GridCellProps): React.ReactElement {
  return (
    <Box
      flexGrow={grow}
      width={width}
      height={height}
      borderStyle={borderStyle}
      borderColor={borderColor}
      padding={padding}
      paddingX={paddingX}
      paddingY={paddingY}
      flexDirection="column"
    >
      {children}
    </Box>
  );
}

// ============================================================================
// STACK - Vertical stack with consistent spacing
// ============================================================================

export interface StackProps {
  /** Stack items */
  children: ReactNode;
  /** Gap between items */
  gap?: number;
  /** Alignment */
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  /** Direction */
  direction?: "vertical" | "horizontal";
  /** Padding */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
}

export function Stack({
  children,
  gap = 1,
  align = "stretch",
  direction = "vertical",
  padding,
  paddingX,
  paddingY,
}: StackProps): React.ReactElement {
  return (
    <Box
      flexDirection={direction === "vertical" ? "column" : "row"}
      gap={gap}
      alignItems={align}
      padding={padding}
      paddingX={paddingX}
      paddingY={paddingY}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// CENTER - Center content both horizontally and vertically
// ============================================================================

export interface CenterProps {
  /** Content to center */
  children: ReactNode;
  /** Width of container */
  width?: number;
  /** Height of container */
  height?: number;
  /** Only center horizontally */
  horizontal?: boolean;
  /** Only center vertically */
  vertical?: boolean;
}

export function Center({
  children,
  width,
  height,
  horizontal = true,
  vertical = true,
}: CenterProps): React.ReactElement {
  return (
    <Box
      width={width}
      height={height}
      justifyContent={horizontal ? "center" : "flex-start"}
      alignItems={vertical ? "center" : "flex-start"}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// SPACER - Flexible space that pushes siblings apart
// ============================================================================

export interface SpacerProps {
  /** Size in characters/lines (auto-expands if not set) */
  size?: number;
}

export function Spacer({ size }: SpacerProps): React.ReactElement {
  if (size !== undefined) {
    return <Box width={size} height={size} />;
  }
  return <Box flexGrow={1} />;
}

// ============================================================================
// ABSOLUTE POSITION - Position relative to terminal
// ============================================================================

export interface AbsoluteProps {
  /** Content */
  children: ReactNode;
  /** X position from left */
  x?: number;
  /** Y position from top */
  y?: number;
}

export function Absolute({
  children,
  x = 0,
  y = 0,
}: AbsoluteProps): React.ReactElement {
  // Note: Terminal doesn't support true absolute positioning
  // This creates a workaround using margins
  return (
    <Box marginLeft={x} marginTop={y}>
      {children}
    </Box>
  );
}

// ============================================================================
// SIDEBAR LAYOUT - Common app pattern with sidebar
// ============================================================================

export interface SidebarLayoutProps {
  /** Sidebar content */
  sidebar: ReactNode;
  /** Main content */
  main: ReactNode;
  /** Sidebar width */
  sidebarWidth?: number;
  /** Sidebar position */
  sidebarPosition?: "left" | "right";
  /** Show divider */
  showDivider?: boolean;
  /** Divider color */
  dividerColor?: string;
  /** Sidebar border */
  sidebarBorder?: "single" | "round" | "double";
  /** Sidebar border color */
  sidebarBorderColor?: string;
  /** Main border */
  mainBorder?: "single" | "round" | "double";
  /** Main border color */
  mainBorderColor?: string;
}

export function SidebarLayout({
  sidebar,
  main,
  sidebarWidth = 25,
  sidebarPosition = "left",
  showDivider = true,
  dividerColor = "gray",
  sidebarBorder,
  sidebarBorderColor,
  mainBorder,
  mainBorderColor,
}: SidebarLayoutProps): React.ReactElement {
  const sidebarElement = (
    <Box
      width={sidebarWidth}
      flexShrink={0}
      flexDirection="column"
      borderStyle={sidebarBorder}
      borderColor={sidebarBorderColor}
    >
      {sidebar}
    </Box>
  );

  const dividerElement = showDivider ? (
    <Box>
      <Text color={dividerColor}>│</Text>
    </Box>
  ) : null;

  const mainElement = (
    <Box
      flexGrow={1}
      flexDirection="column"
      borderStyle={mainBorder}
      borderColor={mainBorderColor}
    >
      {main}
    </Box>
  );

  return (
    <Box flexDirection="row">
      {sidebarPosition === "left" ? (
        <>
          {sidebarElement}
          {dividerElement}
          {mainElement}
        </>
      ) : (
        <>
          {mainElement}
          {dividerElement}
          {sidebarElement}
        </>
      )}
    </Box>
  );
}

// ============================================================================
// FULL SCREEN - Fills available terminal space
// ============================================================================

export interface FullScreenProps {
  /** Content */
  children: ReactNode;
  /** Border */
  borderStyle?: "single" | "round" | "double" | "bold";
  /** Border color */
  borderColor?: string;
  /** Padding */
  padding?: number;
}

export function FullScreen({
  children,
  borderStyle,
  borderColor,
  padding = 1,
}: FullScreenProps): React.ReactElement {
  // Get terminal dimensions
  let width = 80;
  let height = 24;
  try {
    const size = Deno.consoleSize();
    width = size.columns;
    height = size.rows;
  } catch {
    // Use defaults
  }

  return (
    <Box
      width={width}
      height={height}
      borderStyle={borderStyle}
      borderColor={borderColor}
      padding={padding}
      flexDirection="column"
    >
      {children}
    </Box>
  );
}

// ============================================================================
// HOLY GRAIL LAYOUT - Header, Footer, Sidebar, Main
// ============================================================================

export interface HolyGrailLayoutProps {
  /** Header content */
  header?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Left sidebar content */
  leftSidebar?: ReactNode;
  /** Right sidebar content */
  rightSidebar?: ReactNode;
  /** Main content */
  main: ReactNode;
  /** Header height */
  headerHeight?: number;
  /** Footer height */
  footerHeight?: number;
  /** Left sidebar width */
  leftSidebarWidth?: number;
  /** Right sidebar width */
  rightSidebarWidth?: number;
  /** Show dividers */
  showDividers?: boolean;
  /** Divider color */
  dividerColor?: string;
  /** Border style for sections */
  borderStyle?: "single" | "round" | "double";
  /** Header border color */
  headerBorderColor?: string;
  /** Footer border color */
  footerBorderColor?: string;
  /** Sidebar border color */
  sidebarBorderColor?: string;
  /** Main border color */
  mainBorderColor?: string;
}

export function HolyGrailLayout({
  header,
  footer,
  leftSidebar,
  rightSidebar,
  main,
  headerHeight = 3,
  footerHeight = 3,
  leftSidebarWidth = 20,
  rightSidebarWidth = 20,
  showDividers = true,
  dividerColor = "gray",
  borderStyle,
  headerBorderColor,
  footerBorderColor,
  sidebarBorderColor,
  mainBorderColor,
}: HolyGrailLayoutProps): React.ReactElement {
  const horizontalDivider = showDividers ? (
    <Text dimColor color={dividerColor}>{"─".repeat(80)}</Text>
  ) : null;

  const verticalDivider = showDividers ? (
    <Box>
      <Text color={dividerColor}>│</Text>
    </Box>
  ) : null;

  return (
    <Box flexDirection="column">
      {/* Header */}
      {header && (
        <>
          <Box
            height={headerHeight}
            borderStyle={borderStyle}
            borderColor={headerBorderColor}
          >
            {header}
          </Box>
          {horizontalDivider}
        </>
      )}

      {/* Middle row: sidebars + main */}
      <Box flexDirection="row" flexGrow={1}>
        {leftSidebar && (
          <>
            <Box
              width={leftSidebarWidth}
              flexShrink={0}
              borderStyle={borderStyle}
              borderColor={sidebarBorderColor}
            >
              {leftSidebar}
            </Box>
            {verticalDivider}
          </>
        )}

        <Box
          flexGrow={1}
          borderStyle={borderStyle}
          borderColor={mainBorderColor}
        >
          {main}
        </Box>

        {rightSidebar && (
          <>
            {verticalDivider}
            <Box
              width={rightSidebarWidth}
              flexShrink={0}
              borderStyle={borderStyle}
              borderColor={sidebarBorderColor}
            >
              {rightSidebar}
            </Box>
          </>
        )}
      </Box>

      {/* Footer */}
      {footer && (
        <>
          {horizontalDivider}
          <Box
            height={footerHeight}
            borderStyle={borderStyle}
            borderColor={footerBorderColor}
          >
            {footer}
          </Box>
        </>
      )}
    </Box>
  );
}

// ============================================================================
// RESPONSIVE COLUMNS - Columns that stack on narrow terminals
// ============================================================================

export interface ResponsiveColumnsProps {
  /** Column content */
  children: ReactNode;
  /** Breakpoint width to switch to stacked layout */
  breakpoint?: number;
  /** Gap */
  gap?: number;
}

export function ResponsiveColumns({
  children,
  breakpoint = 60,
  gap = 1,
}: ResponsiveColumnsProps): React.ReactElement {
  let width = 80;
  try {
    const size = Deno.consoleSize();
    width = size.columns;
  } catch {
    // Use default
  }

  const isStacked = width < breakpoint;

  return (
    <Box
      flexDirection={isStacked ? "column" : "row"}
      gap={gap}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// ASPECT BOX - Maintain aspect ratio
// ============================================================================

export interface AspectBoxProps {
  /** Content */
  children: ReactNode;
  /** Aspect ratio (width/height, e.g. 16/9 = 1.77) */
  ratio?: number;
  /** Width (height calculated from ratio) */
  width?: number;
  /** Border */
  borderStyle?: "single" | "round" | "double";
  borderColor?: string;
}

export function AspectBox({
  children,
  ratio = 1,
  width = 20,
  borderStyle,
  borderColor,
}: AspectBoxProps): React.ReactElement {
  // In terminal, characters are roughly 2:1 (width:height)
  // So a 1:1 aspect ratio needs height = width / 2
  const terminalRatio = 2; // chars are ~2x taller than wide
  const height = Math.round(width / (ratio * terminalRatio));

  return (
    <Box
      width={width}
      height={height}
      borderStyle={borderStyle}
      borderColor={borderColor}
      flexDirection="column"
    >
      {children}
    </Box>
  );
}

// ============================================================================
// MASONRY LAYOUT - Columns with auto-height items
// ============================================================================

export interface MasonryProps {
  /** Items to layout */
  children: ReactNode;
  /** Number of columns */
  columns?: number;
  /** Gap between items */
  gap?: number;
}

export function Masonry({
  children,
  columns = 2,
  gap = 1,
}: MasonryProps): React.ReactElement {
  return (
    <Box flexDirection="row" gap={gap}>
      {Array.from({ length: columns }, (_, colIndex) => (
        <Box key={colIndex} flexDirection="column" flexGrow={1} gap={gap}>
          {/* Children would be distributed here - simplified for terminal */}
          {colIndex === 0 ? children : null}
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// OVERLAY - Layer content on top
// ============================================================================

export interface OverlayProps {
  /** Base content */
  children: ReactNode;
  /** Overlay content (rendered after base) */
  overlay: ReactNode;
  /** Visible */
  visible?: boolean;
}

export function Overlay({
  children,
  overlay,
  visible = true,
}: OverlayProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {children}
      {visible && overlay}
    </Box>
  );
}

// ============================================================================
// INLINE - Wrap content inline
// ============================================================================

export interface InlineProps {
  /** Inline items */
  children: ReactNode;
  /** Gap between items */
  gap?: number;
  /** Wrap to next line */
  wrap?: boolean;
}

export function Inline({
  children,
  gap = 1,
  wrap = true,
}: InlineProps): React.ReactElement {
  return (
    <Box
      flexDirection="row"
      gap={gap}
      flexWrap={wrap ? "wrap" : "nowrap"}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// TITLED SECTION - Section with title and border
// ============================================================================

export interface TitledSectionProps {
  /** Section title */
  title: string;
  /** Title icon */
  icon?: string;
  /** Title color */
  titleColor?: string;
  /** Content */
  children: ReactNode;
  /** Border style */
  borderStyle?: "single" | "round" | "double" | "bold";
  /** Border color */
  borderColor?: string;
  /** Padding */
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  /** Width */
  width?: number;
}

export function TitledSection({
  title,
  icon,
  titleColor,
  children,
  borderStyle = "round",
  borderColor,
  padding = 1,
  paddingX,
  paddingY,
  width,
}: TitledSectionProps): React.ReactElement {
  return (
    <Box flexDirection="column" width={width}>
      <Box
        borderStyle={borderStyle}
        borderColor={borderColor}
        flexDirection="column"
        padding={padding}
        paddingX={paddingX}
        paddingY={paddingY}
      >
        <Box marginBottom={1}>
          {icon && <Text color={titleColor}>{icon} </Text>}
          <Text bold color={titleColor}>{title}</Text>
        </Box>
        {children}
      </Box>
    </Box>
  );
}

// ============================================================================
// TWO COLUMN CARD - Common pattern with left/right content
// ============================================================================

export interface TwoColumnCardProps {
  /** Left content */
  left: ReactNode;
  /** Right content */
  right: ReactNode;
  /** Left column width */
  leftWidth?: number;
  /** Border style */
  borderStyle?: "single" | "round" | "double";
  /** Border color */
  borderColor?: string;
  /** Show middle divider */
  showDivider?: boolean;
  /** Divider color */
  dividerColor?: string;
  /** Title */
  title?: string;
  /** Title color */
  titleColor?: string;
  /** Padding */
  padding?: number;
}

export function TwoColumnCard({
  left,
  right,
  leftWidth = 30,
  borderStyle = "round",
  borderColor,
  showDivider = true,
  dividerColor = "gray",
  title,
  titleColor,
  padding = 1,
}: TwoColumnCardProps): React.ReactElement {
  return (
    <Box
      borderStyle={borderStyle}
      borderColor={borderColor}
      flexDirection="column"
      padding={padding}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color={titleColor}>{title}</Text>
        </Box>
      )}
      <Box flexDirection="row">
        <Box width={leftWidth} flexDirection="column">
          {left}
        </Box>
        {showDivider && (
          <Box paddingX={1}>
            <Text color={dividerColor}>│</Text>
          </Box>
        )}
        <Box flexGrow={1} flexDirection="column">
          {right}
        </Box>
      </Box>
    </Box>
  );
}
